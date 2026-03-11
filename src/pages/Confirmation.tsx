import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, MessageSquare, ArrowRight, Calendar, MapPin, Car, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { supabase } from '../lib/supabase';

export default function Confirmation() {
  const [booking, setBooking] = useState<any>(null);
  const [waUrl, setWaUrl] = useState('');
  const [servicesWithPrices, setServicesWithPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadBooking = async () => {
      try {
        const lastBooking = localStorage.getItem('csg_last_booking');
        const url = localStorage.getItem('csg_wa_url');
        if (lastBooking) {
          const parsed = JSON.parse(lastBooking);
          const normalized = {
            ...parsed,
            booking_time: parsed.booking_time || parsed.booking_date || parsed.scheduled_at || parsed.date || parsed.created_at,
            total_price: parsed.total_price || parsed.price || parsed.amount || parsed.total_cost,
            car_brand: parsed.brand || parsed.car_brand || parsed.carBrand || parsed.vehicle_brand || "Unknown",
            car_model: parsed.model || parsed.car_model || parsed.carModel || parsed.vehicle_model || "Vehicle",
            location: parsed.address || parsed.location || parsed.service_location || "Not specified",
            services: Array.isArray(parsed.services) ? parsed.services : (typeof parsed.services === 'string' ? parsed.services.split(',') : []),
            display_status: parsed.service_status || parsed.status || 'pending'
          };
          setBooking(normalized);
          setWaUrl(url || '');
          
          // Fetch services from database to ensure we have correct pricing
          if (normalized.id) {
            try {
              const response = await fetch(`/api/bookings/${normalized.id}/with-services`);
              if (response.ok) {
                const data = await response.json();
                if (data.success && data.booking.services) {
                  setServicesWithPrices(data.booking.services);
                }
              }
            } catch (e) {
              console.warn('Failed to fetch services from database:', e);
              // Fallback to localStorage services if available
              if (Array.isArray(normalized.services)) {
                setServicesWithPrices(normalized.services);
              }
            }
          } else if (Array.isArray(normalized.services)) {
            // Use localStorage services if no booking ID
            setServicesWithPrices(normalized.services);
          }
        } else {
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    };

    loadBooking();
  }, [navigate]);

  const downloadPDF = () => {
    const doc = new jsPDF();
    const primaryColor = [37, 99, 235]; // blue-600
    const secondaryColor = [100, 100, 100];
    const bgColor = [249, 250, 251]; // gray-50
    
    // Background
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.rect(0, 0, 210, 297, 'F');
    
    // Card
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, 15, 180, 267, 5, 5, 'F');
    
    // Header
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Car Service Guru', 25, 35);
    
    // Status Badge
    const status = (booking.display_status || booking.status || 'PENDING').toUpperCase();
    doc.setFillColor(245, 245, 220); // light amber
    doc.roundedRect(150, 25, 35, 10, 2, 2, 'F');
    doc.setTextColor(180, 130, 0);
    doc.setFontSize(10);
    doc.text(status, 167.5, 31.5, { align: 'center' });
    
    doc.setDrawColor(230, 230, 230);
    doc.line(25, 45, 185, 45);
    
    // Title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('Service Invoice / Confirmation', 25, 58);
    
    // Booking Details Box
    doc.setFillColor(252, 252, 255);
    doc.roundedRect(25, 68, 160, 65, 3, 3, 'F');
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Booking Details', 35, 78);
    
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('Booking ID:', 35, 90);
    doc.text('Date & Time:', 35, 100);
    doc.text('Vehicle:', 35, 110);
    doc.text('Location:', 35, 120);
    
    doc.setTextColor(0, 0, 0);
    doc.text(`#${(booking.id || 'N/A').toString().slice(0, 8).toUpperCase()}`, 75, 90);
    doc.text(new Date(booking.booking_time).toLocaleString(), 75, 100);
    doc.text(`${booking.car_brand} ${booking.car_model}`, 75, 110);
    
    const splitLocation = doc.splitTextToSize(booking.location || 'Not specified', 100);
    doc.text(splitLocation, 75, 120);
    
    // Selected Services Box
    doc.setFillColor(252, 252, 255);
    doc.roundedRect(25, 140, 160, 60, 3, 3, 'F');
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Selected Services', 35, 150);
    
    let yPos = 162;
    doc.setFontSize(10);
    const servicesList = Array.isArray(servicesWithPrices) && servicesWithPrices.length > 0 ? servicesWithPrices : (Array.isArray(booking.services) ? booking.services : []);
    if (servicesList.length === 0) {
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'italic');
      doc.text('No services specified', 35, yPos);
    } else {
      servicesList.forEach((service: any) => {
        const serviceName = typeof service === 'string' ? service : (service.name || 'Service');
        const servicePrice = typeof service === 'object' ? (service.price || 0) : 0;
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(`• ${serviceName.replace('-', ' ')}`, 35, yPos);
        if (servicePrice > 0) {
          doc.text(`INR ${servicePrice}`, 150, yPos);
        }
        yPos += 8;
      });
    }
    
    // Total Amount Box
    doc.setFillColor(240, 246, 255);
    doc.roundedRect(25, 210, 160, 20, 3, 3, 'F');
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount', 35, 222.5);
    
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(14);
    doc.text(`INR ${booking.total_price || 0}`, 150, 222.5);
    
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.text('Need help? Call +91 9751969009 | Email: carserviceguru@gmail.com', 105, 265, { align: 'center' });
    
    doc.save(`CSG-Invoice-${booking.id.toString().slice(0, 8)}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <CheckCircle2 className="w-12 h-12 text-blue-600" />
        </motion.div>
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div className="max-w-2xl mx-auto py-12 text-center">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-10 inline-flex items-center justify-center w-24 h-24 bg-blue-600 text-white rounded-full shadow-xl shadow-blue-600/20"
      >
        <CheckCircle2 className="w-12 h-12" />
      </motion.div>

      <h1 className="text-4xl md:text-5xl font-black mb-6 text-blue-900">Booking Confirmed!</h1>
      <p className="text-blue-600/60 text-lg font-medium mb-12 max-w-md mx-auto">
        Your car service has been scheduled. We've sent a notification to our team.
      </p>

      <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-2xl shadow-blue-600/5 mb-12 text-left space-y-6">
        <div className="flex items-start gap-4">
          <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1">Vehicle</p>
            <p className="text-lg font-bold text-blue-900">{booking.car_brand} {booking.car_model}</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1">Date & Time</p>
            <p className="text-lg font-bold text-blue-900">{new Date(booking.booking_time).toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1">Location</p>
            <p className="text-lg font-bold text-blue-900 leading-tight">{booking.location}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button 
          onClick={downloadPDF}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
        >
          <Download className="w-6 h-6" />
          Download PDF
        </button>
        <a 
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#25D366] hover:bg-[#128C7E] text-white px-8 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95"
        >
          <MessageSquare className="w-6 h-6" />
          WhatsApp
        </a>
        <button 
          onClick={() => navigate('/dashboard')}
          className="bg-stone-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95"
        >
          Dashboard
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

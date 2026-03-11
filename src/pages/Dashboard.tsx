import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Car, 
  Calendar, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  History,
  TrendingUp,
  Download,
  XCircle,
  MessageSquare,
  Mail,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  User,
  Activity
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';

interface DashboardProps {
  user: any;
}

export default function Dashboard({ user }: DashboardProps) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [userVehicles, setUserVehicles] = useState<any[]>([]);
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCancelPopup, setShowCancelPopup] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);

  const fetchBookings = async (sData: any[] = servicesList) => {
    try {
      // Fetch vehicles first for fallback
      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id);
      
      if (vehiclesData) {
        setUserVehicles(vehiclesData);
      }

      const userCols = ["user_id", "userId", "customer_id", "profile_id"];
      let data: any[] = [];
      let error: any = null;
      let success = false;

      // 1. Try join query with different column names
      for (const col of userCols) {
        try {
          const result = await supabase
            .from('bookings')
            .select('*, profiles:user_id(address, name, phone), vehicles:vehicle_id(brand, model)')
            .eq(col, user.id)
            .order('created_at', { ascending: false });
          
          if (!result.error) {
            data = result.data || [];
            success = true;
            break;
          } else if (result.error.code !== '42703' && !result.error.message.includes("column")) {
            error = result.error;
            break;
          }
        } catch (e) {
          console.warn(`Join query failed for column ${col}:`, e);
        }
      }

      // 2. Fallback to simple query if join failed
      if (!success) {
        for (const col of userCols) {
          try {
            const result = await supabase
              .from('bookings')
              .select('*')
              .eq(col, user.id)
              .order('created_at', { ascending: false });
            
            if (!result.error) {
              data = result.data || [];
              success = true;
              break;
            }
          } catch (e) {
            console.warn(`Simple query failed for column ${col}:`, e);
          }
        }
      }

      // 3. Last resort: try by phone number if we have it
      if ((!data || data.length === 0) && user.phone) {
        const phoneCols = ["phone", "customer_phone", "user_phone"];
        for (const col of phoneCols) {
          try {
            const result = await supabase
              .from('bookings')
              .select('*')
              .eq(col, user.phone)
              .order('created_at', { ascending: false });
            
            if (!result.error && result.data && result.data.length > 0) {
              data = result.data;
              success = true;
              break;
            }
          } catch (e) {}
        }
      }

      if (!success && error) throw error;

      // Fetch services for each booking using the new API endpoint
      const normalizedData = await Promise.all((data || []).map(async (b: any) => {
        // Prioritize joined data, then direct columns
        let brand = b.vehicles?.brand || b.brand || b.car_brand || b.carBrand || b.vehicle_brand;
        let model = b.vehicles?.model || b.model || b.car_model || b.carModel || b.vehicle_model;
        const address = b.profiles?.address || b.address || b.location || b.service_location || "Not specified";
        
        // Fallback to vehiclesData if still unknown
        if (!brand || brand === "Unknown") {
          const vId = b.vehicle_id || b.vehicleId || b.car_id;
          const foundVehicle = (vehiclesData || []).find((v: any) => v.id === vId) || (vehiclesData || [])[0];
          if (foundVehicle) {
            brand = foundVehicle.brand;
            model = foundVehicle.model;
          }
        }

        brand = brand || "Unknown";
        model = model || "Vehicle";
        
        // Fetch services from the dedicated API endpoint
        let finalServices = [];
        try {
          const servicesResponse = await fetch(`/api/bookings/${b.id}/with-services`);
          if (servicesResponse.ok) {
            const servicesData = await servicesResponse.json();
            if (servicesData.success && servicesData.booking.services) {
              finalServices = servicesData.booking.services;
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch services for booking ${b.id}:`, e);
        }
        
        // Fallback to direct services columns if API call fails
        if (finalServices.length === 0) {
          const rawServices = b.services || b.selected_services || b.service_list || b.items || [];
          const servicesArray = Array.isArray(rawServices) ? rawServices : (typeof rawServices === 'string' ? rawServices.split(',') : []);
          
          // Resolve IDs to names if they look like UUIDs
          finalServices = servicesArray.map((s: any) => {
            if (typeof s === 'object' && s.name) return s;
            const sId = typeof s === 'string' ? s : '';
            if (sId && sId.length > 30) { // Likely a UUID
              const found = (servicesList || []).find((item: any) => item.id === sId);
              return found ? { name: found.name, price: found.price } : { name: sId, price: 0 };
            }
            return { name: sId, price: 0 };
          }).filter(s => s.name);
        }

        const bTime = b.scheduled_date && b.scheduled_time 
          ? `${b.scheduled_date}T${b.scheduled_time}` 
          : (b.booking_time || b.booking_date || b.scheduled_at || b.date || b.created_at);

        // Normalize status spelling in case the database uses alternate casing/variants
        let normalizedStatus = b.status || 'pending';
        if (normalizedStatus === 'canceled') {
          normalizedStatus = 'cancelled';
        }
        return {
          ...b,
          booking_time: bTime,
          total_price: b.total_cost || b.total_price || b.price || b.amount || 0,
          car_brand: brand,
          car_model: model,
          location: address,
          services: finalServices,
          display_status: normalizedStatus
        };
      }));
      setBookings(normalizedData);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        // Fetch services list for ID resolution
        const { data: sData } = await supabase.from('services').select('*');
        setServicesList(sData || []);
        
        await fetchBookings(sData || []);
      } catch (e) {
        console.error("Init error:", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user.id]);

  const handleCancelClick = (bookingId: string) => {
    setBookingToCancel(bookingId);
    setShowCancelPopup(true);
  };

  const confirmCancel = async () => {
    if (!bookingToCancel) return;
    
    setCancellingId(bookingToCancel);
    try {
      const response = await fetch(`/api/bookings/${bookingToCancel}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      
      const result = await response.json();
      if (result.success) {
        // Just let them know or maybe show a toast
        fetchBookings();
      } else {
        alert(result.error || 'Failed to cancel booking');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      alert('Failed to cancel booking. Please try again.');
    } finally {
      setCancellingId(null);
      setShowCancelPopup(false);
      setBookingToCancel(null);
    }
  };

  const downloadPDF = (booking: any) => {
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
    const status = (booking.display_status || booking.status || 'pending').toUpperCase();
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
    const services = Array.isArray(booking.services) ? booking.services : [];
    if (services.length === 0) {
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'italic');
      doc.text('No services specified', 35, yPos);
    } else {
      services.forEach((service: any) => {
        const sName = typeof service === 'object' ? service.name : service;
        const sPrice = typeof service === 'object' ? service.price : 0;
        
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(`• ${(sName || '').toString().replace('-', ' ')}`, 35, yPos);
        
        if (sPrice > 0) {
          doc.text(`INR ${sPrice}`, 150, yPos);
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

  const getStatusStep = (status: string) => {
    const s = (status || '').toLowerCase().replace(/_/g, ' ');
    switch (s) {
      case 'pending': return 0;
      case 'assigned': return 1;
      case 'in-progress': return 2;
      case 'completed': return 5;
      case 'cancelled': return -1;
      default: return 0;
    }
  };

  const getStatusColor = (bookingStatus: string) => {
    const status = (bookingStatus || 'pending').toLowerCase().replace(/_/g, '-');
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-600 border-amber-200';
      case 'assigned': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'in-progress': return 'bg-purple-100 text-purple-600 border-purple-200';
      case 'completed': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
      case 'cancelled': return 'bg-red-100 text-red-600 border-red-200';
      default: return 'bg-stone-100 text-stone-600 border-stone-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black mb-2 text-blue-900">My Dashboard</h1>
          <p className="text-blue-600/60 font-medium">Manage your car services and view history.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white px-6 py-3 rounded-2xl border border-blue-100 shadow-2xl shadow-blue-600/5 flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-600/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Total Bookings</p>
              <p className="text-xl font-black text-blue-900 leading-none">{bookings.length}</p>
            </div>
          </div>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-blue-100 shadow-2xl shadow-blue-600/5 text-center">
          <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
            <Car className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-blue-900 mb-4">No bookings found</h2>
          <p className="text-blue-600/60 font-medium mb-8 max-w-sm mx-auto">
            You haven't booked any services yet. Give your car the care it deserves!
          </p>
          <button 
            onClick={() => window.location.href = '/services'}
            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
          >
            Book Your First Service
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Latest Booking */}
          <div className="lg:col-span-2 space-y-8">
            <h2 className="text-2xl font-black flex items-center gap-3 text-blue-900">
              <History className="w-6 h-6 text-blue-600" />
              Recent Activity
            </h2>
            <div className="space-y-6">
              {bookings.map((booking, idx) => {
                const currentStep = getStatusStep(booking.display_status || booking.status);
                const isExpanded = expandedId === booking.id;
                const canCancel = !booking.garage_id && booking.status !== 'completed' && !booking.status.includes('cancelled');

                return (
                  <motion.div 
                    key={booking.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white rounded-3xl border border-blue-100 shadow-2xl shadow-blue-600/5 hover:border-blue-500/30 transition-all overflow-hidden"
                  >
                    <div className="p-8">
                      <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div className="flex items-start gap-6">
                          <div className="bg-blue-600 p-4 rounded-2xl text-white shadow-lg shadow-blue-600/20">
                            <Car className="w-8 h-8" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-2xl font-black text-blue-900">{booking.car_brand} {booking.car_model}</h3>
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(booking.display_status || booking.status)}`}>
                                {(booking.display_status || booking.status || 'pending').replace('_', ' ')}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-6 text-blue-600/60 font-medium text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {new Date(booking.booking_time).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                {new Date(booking.booking_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                {(booking.location || "").split(',')[0] || "Not specified"}
                              </div>
                              <div className="flex items-center gap-2 text-blue-600 font-black">
                                ₹{booking.total_price || 0}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-between gap-4">
                          <div className="flex flex-wrap gap-2 justify-end">
                            {(booking.services || []).map((s: any, i: number) => {
                              const sName = typeof s === 'object' ? s.name : s;
                              return (
                                <span key={i} className="bg-blue-50 px-3 py-1 rounded-lg text-[10px] font-black text-blue-600 uppercase tracking-widest border border-blue-100">
                                  {(sName || "").replace('-', ' ')}
                                </span>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => downloadPDF(booking)}
                              className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl transition-colors border border-blue-100"
                              title="Download PDF"
                            >
                              <Download className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                              className="text-blue-600 font-black text-sm flex items-center gap-2 hover:translate-x-1 transition-transform"
                            >
                              {isExpanded ? 'Hide Status' : 'View Status'}
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-8 pt-8 border-t border-blue-50"
                          >
                            {/* Status Stepper */}
                            <div className="relative mb-12">
                              <div className="absolute top-5 left-0 w-full h-1 bg-stone-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-600 transition-all duration-500" 
                                  style={{ width: currentStep === -1 ? '0%' : `${(currentStep - 1) * 25}%` }}
                                ></div>
                              </div>
                              <div className="relative flex justify-between">
                                {[
                                  { label: 'Assigned', icon: User },
                                  { label: 'In Progress', icon: Activity },
                                  { label: 'Completed', icon: CheckCircle2 }
                                ].map((step, i) => {
                                  const stepNum = i + 1;
                                  const isCompleted = currentStep >= stepNum;
                                  const isCurrent = currentStep === stepNum;
                                  const Icon = step.icon;

                                  return (
                                    <div key={i} className="flex flex-col items-center gap-2 flex-1">
                                      <div className={`
                                        w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center z-10 transition-all duration-300
                                        ${isCompleted ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white border-2 border-stone-200 text-stone-300'}
                                        ${isCurrent ? 'ring-4 ring-blue-100 scale-110' : ''}
                                      `}>
                                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                                      </div>
                                      <span className={`text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-center px-1 ${isCompleted ? 'text-blue-600' : 'text-stone-400'}`}>
                                        {step.label}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                              <div className="flex items-center gap-4">
                                <a 
                                  href={`https://wa.me/919751969009?text=Hi, I have a question about my booking #${booking.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/10 hover:scale-105 transition-transform"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                  WhatsApp Support
                                </a>
                                <a 
                                  href={`mailto:support@carserviceguru.com?subject=Booking #${booking.id} Inquiry`}
                                  className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl font-bold text-xs shadow-lg hover:scale-105 transition-transform"
                                >
                                  <Mail className="w-4 h-4" />
                                  Email Support
                                </a>
                              </div>

                              {canCancel && (
                                <button 
                                  onClick={() => handleCancelClick(booking.id)}
                                  disabled={cancellingId === booking.id}
                                  className="flex items-center gap-2 px-6 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl font-black text-xs hover:bg-red-100 transition-colors disabled:opacity-50"
                                >
                                  {cancellingId === booking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                  Cancel Booking
                                </button>
                              )}
                              
                              {!canCancel && booking.status !== 'completed' && !booking.status.includes('cancelled') && (
                                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest italic">
                                  Garage assigned - Cancellation locked
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-8">
            <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100">
              <h3 className="text-lg font-black text-blue-900 mb-4">Need Help?</h3>
              <p className="text-blue-700 text-sm font-medium mb-6 leading-relaxed">
                If you have any questions about your booking or need to make changes, our support team is available 24/7.
              </p>
              <a 
                href="https://wa.me/919751969009" 
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg active:scale-95"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Popup */}
      <AnimatePresence>
        {showCancelPopup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl shadow-blue-900/10 border border-blue-50 text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
              
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-100">
                <AlertCircle className="w-8 h-8" />
              </div>
              
              <h3 className="text-2xl font-black text-blue-900 mb-2">Cancel Booking?</h3>
              <p className="text-blue-600/70 mb-8 font-medium">
                Are you sure you want to cancel this booking? This action cannot be undone.
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    setShowCancelPopup(false);
                    setBookingToCancel(null);
                  }}
                  disabled={!!cancellingId}
                  className="flex-1 px-4 py-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50"
                >
                  No, Keep it
                </button>
                <button 
                  onClick={confirmCancel}
                  disabled={!!cancellingId}
                  className="flex-1 flex justify-center items-center gap-2 px-4 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-500/20 active:scale-95 disabled:opacity-70"
                >
                  {cancellingId ? <Loader2 className="w-5 h-5 animate-spin" /> : "Yes, Cancel"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

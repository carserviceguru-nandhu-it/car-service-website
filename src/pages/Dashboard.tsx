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
  Activity,
  Truck,
  Package,
  Settings
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

        // Normalize customer details
        const cName = b.profiles?.name || b.customer_name || b.name || user.user_metadata?.full_name || user.name || "Customer";
        const cPhone = b.profiles?.phone || b.customer_phone || b.phone || user.phone || "";

        return {
          ...b,
          booking_time: bTime,
          total_price: b.total_cost || b.total_price || b.price || b.amount || 0,
          car_brand: brand,
          car_model: model,
          customer_name: cName,
          customer_phone: cPhone,
          location: address,
          services: finalServices,
          display_status: normalizedStatus,
          service_status: b.service_status
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

  const downloadPDF = async (booking: any) => {
    // Fetch garage name if garage_id is present
    let garageName = booking.workshop_name || '';
    if (booking.garage_id) {
      try {
        const { data: garageData } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', booking.garage_id)
          .single();
        if (garageData?.name) {
          garageName = garageData.name;
        }
      } catch (e) {
        console.warn('Could not fetch garage name:', e);
      }
    }

    const doc = new jsPDF();
    const primaryColor = [37, 99, 235]; // blue-600
    const accentColor = [13, 27, 52]; // dark navy

    // Fetch customer details if they're missing or "N/A"
    let cName = booking.customer_name || booking.profiles?.name || '';
    let cPhone = booking.customer_phone || booking.profiles?.phone || '';

    if (!cName || !cPhone || cName === "Customer") {
      try {
        const uId = booking.user_id || booking.userId || user.id;
        if (uId) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name, phone')
            .eq('id', uId)
            .single();
          if (profileData) {
            cName = profileData.name || cName;
            cPhone = profileData.phone || cPhone;
          }
        }
      } catch (e) {
        console.warn('Could not fetch customer details:', e);
      }
    }

    // Use user prop as last resort
    cName = cName || user.user_metadata?.full_name || user.name || "Customer";
    cPhone = cPhone || user.phone || "";
    
    // Header Section - dark navy background
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(0, 0, 210, 42, 'F');

    // Try to embed the logo image
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => resolve();
        logoImg.src = '/logo.jpeg';
      });
      if (logoImg.complete && logoImg.naturalHeight > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = logoImg.naturalWidth;
        canvas.height = logoImg.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(logoImg, 0, 0);
          const imgData = canvas.toDataURL('image/jpeg');
          doc.addImage(imgData, 'JPEG', 5, 3, 36, 36);
        }
      }
    } catch (e) {
      console.warn('Logo load failed, using text fallback');
    }
    
    // Brand name & tagline
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('CAR SERVICE GURU', 46, 20);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 200, 255);
    doc.text('EXPERT CARE • SMART AI', 46, 29);

    // Red dot accent
    doc.setFillColor(220, 50, 50);
    doc.circle(130, 27, 1.5, 'F');
    
    // JOB CARD text on right
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('JOB CARD', 168, 25);
    
    // Main Content
    let yPos = 57;
    
    // Section Header: Customer & Vehicle Details
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Customer & Vehicle Details', 15, yPos);
    
    yPos += 8;
    
    // Table Draw Helper
    const drawTableRow = (rowY: number, label1: string, val1: any, label2: string, val2: any) => {
      doc.setDrawColor(210, 210, 210);
      doc.setFillColor(255, 255, 255);
      
      // Cells
      doc.rect(15, rowY, 40, 10);
      doc.rect(55, rowY, 50, 10);
      doc.rect(105, rowY, 40, 10);
      doc.rect(145, rowY, 50, 10);
      
      // Content
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'bold');
      doc.text(label1, 18, rowY + 6.5);
      doc.text(label2, 108, rowY + 6.5);
      
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text(String(val1 || 'N/A'), 58, rowY + 6.5);
      doc.text(String(val2 || 'N/A'), 148, rowY + 6.5);
    };

    drawTableRow(yPos, 'Customer Name', cName, 'Mobile Number', cPhone);
    yPos += 10;
    drawTableRow(yPos, 'Vehicle Brand', booking.car_brand || '', 'Vehicle Model', booking.car_model || '');
    yPos += 10;
    drawTableRow(yPos, 'Registration No', booking.registration_no || '', 'Odometer Rd', booking.odometer_reading || '');
    yPos += 10;
    drawTableRow(yPos, 'Fuel Status', booking.fuel_status || '', 'Booking ID', (booking.id || '').toString().slice(0, 8).toUpperCase());
    yPos += 10;
    drawTableRow(yPos, 'Battery Details', booking.battery_details || '', 'Fuel Type', booking.fuel_type || '');
    yPos += 10;
    drawTableRow(yPos, 'Supervisor', booking.supervisor || '', 'Car Variant', booking.car_variant || '');
    
    yPos += 25;
    
    // Section Header: Garage Booking Details
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Garage Booking Details', 15, yPos);
    
    yPos += 8;
    
    // Mini Info Cards
    const drawMiniCard = (x: number, y: number, label: string, value: string, iconColor: number[]) => {
      doc.setFillColor(252, 252, 255);
      doc.roundedRect(x, y, 60, 25, 3, 3, 'F');
      doc.setDrawColor(240, 240, 250);
      doc.roundedRect(x, y, 60, 25, 3, 3, 'S');
      
      doc.setFillColor(iconColor[0], iconColor[1], iconColor[2]);
      doc.rect(x + 5, y + 5, 10, 5, 'F'); // Dummy Icon Shape
      
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(label.toUpperCase(), x + 5, y + 15);
      
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(value, x + 5, y + 21);
    };
    
    const bDate = booking.scheduled_date || new Date(booking.booking_time).toLocaleDateString();
    const bTime = booking.scheduled_time || new Date(booking.booking_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    drawMiniCard(15, yPos, 'Workshop', garageName, [200, 150, 80]);
    drawMiniCard(78, yPos, 'Walkin Date', bDate, [220, 50, 50]);
    drawMiniCard(141, yPos, 'Walkin Time', bTime, [100, 100, 250]);
    
    yPos += 45;
    
    // Section Header: Inventory
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Inventory', 15, yPos);
    
    yPos += 8;
    
    // Inventory Checklist
    const items = [
      { key: 'perfume', label: 'PERFUME' },
      { key: 'jack_set', label: 'JACK SET' },
      { key: 'tool_kit', label: 'TOOL KIT' },
      { key: 'spare_wheel', label: 'SPARE WHEEL' },
      { key: 'head_rest', label: 'HEAD REST' },
      { key: 'floor_mats', label: 'FLOOR MATS' },
      { key: 'wheel_cap', label: 'WHEEL CAP' },
      { key: 'mud_flap', label: 'MUD FLAP' }
    ];
    
    const cellWidth = 22;
    doc.setDrawColor(220, 230, 250);
    
    // Parse inventory from the database column (JSON object or string-based)
    let inventoryData: Record<string, any> = {};
    if (booking.inventory) {
      if (typeof booking.inventory === 'object') {
        inventoryData = booking.inventory;
      } else if (typeof booking.inventory === 'string') {
        try { inventoryData = JSON.parse(booking.inventory); } catch { inventoryData = {}; }
      }
    }

    items.forEach((item, i) => {
      const x = 15 + (i * cellWidth);
      doc.setFillColor(248, 250, 255);
      doc.setDrawColor(220, 230, 250);
      doc.rect(x, yPos, cellWidth, 10, 'F');
      doc.rect(x, yPos, cellWidth, 10, 'S');
      
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(item.label, x + (cellWidth/2), yPos + 6.5, { align: 'center' });
      
      // Value cell
      const valueY = yPos + 10;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(220, 230, 250);
      doc.rect(x, valueY, cellWidth, 15, 'F');
      doc.rect(x, valueY, cellWidth, 15, 'S');
      
      // Check state: first from inventory JSON, then from direct booking field
      const invVal = inventoryData[item.key];
      const directVal = booking[item.key];
      const isChecked = invVal === true || invVal === 'Checked' || invVal === 'YES' || invVal === 1 ||
                        directVal === true || directVal === 'Checked' || directVal === 'YES';
      if (isChecked) {
        doc.setFillColor(34, 197, 94); // emerald-500
        doc.circle(x + (cellWidth/2), valueY + 7.5, 4, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('✓', x + (cellWidth/2), valueY + 9, { align: 'center' });
      } else {
        doc.setDrawColor(200, 200, 200);
        doc.circle(x + (cellWidth/2), valueY + 7.5, 4, 'S');
      }
      doc.setFont('helvetica', 'normal');
    });

    yPos += 45;
    
    // Car Documents
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Car Documents', 15, yPos);
    
    yPos += 8;
    doc.setDrawColor(220, 230, 250);
    doc.rect(15, yPos, 180, 10);
    doc.rect(15, yPos, 130, 10);
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('SECOND HAND CAR INSPECTION', 20, yPos + 6.5);
    doc.setTextColor(34, 197, 94);
    doc.text('Checked', 150, yPos + 6.5);
    
    yPos += 25;
    
    // Undertaking
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Undertaking', 15, yPos);
    
    yPos += 8;
    doc.setTextColor(110, 110, 110);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const undertakingText = 'I authorize to execute the jobs described herein using the necessary material cost. I understand that the vehicle is stored, repaired and tested at my own risk.';
    const splitUndertaking = doc.splitTextToSize(undertakingText, 180);
    doc.text(splitUndertaking, 15, yPos);
    
    // Page 2: Terms & Conditions
    doc.addPage();

    // Page 2 sub header
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('TERMS & CONDITIONS', 105, 20, { align: 'center' });

    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(15, 25, 195, 25);

    yPos = 35;
    doc.setLineWidth(0.2);
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    
    const terms = [
      '• Pickup and Drop time is subject to the availability of drivers.',
      '• Payment should be made in full during the time of vehicle delivery. In case amount is not confirmed, a tentative amount will be levied.',
      '• Inventory discrepancies will not be entertained once confirmed by owner at time of delivery.',
      '• Car Service Guru will not be liable for any delay due to conditions beyond control.',
      '• Garaging cost (500/day) will be levied if: a) Approval not provided within 7 days for insurance jobs b) Approval not provided within 3 days for other jobs c) Car not picked up within 7 days of completion.',
      '• Fuel consumed during vehicle transport will be borne by the customer.',
      '• All personal belongings should be removed. We are not responsible for any loss.',
      '• Full payment for drivers will be made upon successful delivery.',
      '• Bodywork/Painting vehicles dispatched only after successful payment and inspection.',
      '• Repair estimate is based on request and subject to change if additional parts are required.'
    ];
    
    terms.forEach(term => {
      const splitTerm = doc.splitTextToSize(term, 175);
      doc.text(splitTerm, 15, yPos);
      yPos += (splitTerm.length * 7) + 8;
    });
    
    const customerNameSlug = cName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') || 'Customer';
    const dateStr = new Date().toISOString().slice(0, 10);
    doc.save(`${customerNameSlug}_jobcard_${dateStr}.pdf`);
  };

  const downloadInvoicePDF = async (booking: any) => {
    // Fetch garage name if garage_id is present
    let garageName = booking.workshop_name || '';
    if (booking.garage_id) {
      try {
        const { data: garageData } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', booking.garage_id)
          .single();
        if (garageData?.name) {
          garageName = garageData.name;
        }
      } catch (e) {
        console.warn('Could not fetch garage name:', e);
      }
    }

    const doc = new jsPDF();
    const primaryColor = [37, 99, 235]; // blue-600
    const accentColor = [13, 27, 52]; // dark navy

    // Fetch customer details
    let cName = booking.customer_name || booking.profiles?.name || '';
    let cPhone = booking.customer_phone || booking.profiles?.phone || '';

    if (!cName || !cPhone || cName === 'Customer') {
      try {
        const uId = booking.user_id || booking.userId || user.id;
        if (uId) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name, phone')
            .eq('id', uId)
            .single();
          if (profileData) {
            cName = profileData.name || cName;
            cPhone = profileData.phone || cPhone;
          }
        }
      } catch (e) {
        console.warn('Could not fetch customer details:', e);
      }
    }

    cName = cName || user.user_metadata?.full_name || user.name || 'Customer';
    cPhone = cPhone || user.phone || '';

    // Format phone with +91 if not already
    if (cPhone && !cPhone.startsWith('+')) {
      const digits = cPhone.replace(/\D/g, '');
      cPhone = digits.length === 10 ? `+91 ${digits}` : `+91${digits}`;
    } else if (cPhone && cPhone.startsWith('+91') && cPhone.length > 3) {
      const digits = cPhone.replace(/\D/g, '').slice(2);
      cPhone = `+91 ${digits}`;
    }

    // Fetch invoice data from admin_invoices if available
    let invoiceData: any = null;
    try {
      const { data: invData } = await supabase
        .from('admin_invoices')
        .select('*')
        .eq('booking_id', booking.id)
        .single();
      invoiceData = invData;
    } catch (e) {
      console.warn('No invoice data found:', e);
    }

    const services = booking.services || [];
    const orderValue = booking.total_price || 0;
    const discount = invoiceData?.discount || 0;
    const discountType = invoiceData?.discount_type || 'fixed';
    const discountAmt = discountType === 'percent' ? Math.round(orderValue * discount / 100) : discount;
    const discountLabel = invoiceData?.discount_label || (discountAmt > 0 ? 'Discount' : '');
    const tax = invoiceData?.tax || 0;
    const grandTotal = invoiceData?.grand_total || (orderValue - discountAmt + tax) || orderValue;
    const remarks = invoiceData?.remarks || booking.notes || booking.additional_notes || '';
    const deliveryDate = booking.scheduled_date || booking.delivery_date || (booking.booking_time ? new Date(booking.booking_time).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'));
    const regNo = booking.registration_no || booking.reg_no || booking.vehicle_reg || '';
    const odometer = booking.odometer_reading || booking.odometer || '';
    const fuelType = booking.fuel_type || '';
    const carVariant = booking.car_variant || booking.car_model || '';
    const city = booking.city || 'N/A';
    const orderId = booking.id ? booking.id.toString().slice(0, 13) : '';
    const address = booking.location || booking.address || 'N/A';

    // ===========================
    // PAGE 1: INVOICE
    // ===========================

    // Header - dark navy background
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(0, 0, 210, 42, 'F');

    // Logo
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => resolve();
        logoImg.src = '/logo.jpeg';
      });
      if (logoImg.complete && logoImg.naturalHeight > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = logoImg.naturalWidth;
        canvas.height = logoImg.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(logoImg, 0, 0);
          const imgData = canvas.toDataURL('image/jpeg');
          doc.addImage(imgData, 'JPEG', 5, 3, 36, 36);
        }
      }
    } catch (e) {
      console.warn('Logo load failed');
    }

    // Brand name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('CAR SERVICE GURU', 46, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 200, 255);
    doc.text('EXPERT CARE • SMART AI', 46, 29);

    // Order Summary label top right
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Order Summary', 155, 25);

    let yPos = 52;

    // ---- Customer/Vehicle Details Table ----
    const drawCell = (x: number, y: number, w: number, h: number, label: string, value: string, labelBold = true) => {
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(255, 255, 255);
      doc.rect(x, y, w / 2, h);
      doc.rect(x + w / 2, y, w / 2, h);

      doc.setFontSize(8.5);
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', labelBold ? 'bold' : 'normal');
      doc.text(label, x + 2, y + h / 2 + 2);

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      const valStr = String(value || 'N/A');
      doc.text(valStr, x + w / 2 + 2, y + h / 2 + 2);
    };

    const rowH = 9;
    const col1X = 14;
    const col2X = 110;
    const colW = 96;

    drawCell(col1X, yPos, colW, rowH, 'Customer Name', cName);
    drawCell(col2X, yPos, colW, rowH, 'Brand', booking.car_brand || '');
    yPos += rowH;
    drawCell(col1X, yPos, colW, rowH, 'Delivery Date', deliveryDate);
    drawCell(col2X, yPos, colW, rowH, 'Fuel Type', fuelType);
    yPos += rowH;
    drawCell(col1X, yPos, colW, rowH, 'Reg No', regNo);
    drawCell(col2X, yPos, colW, rowH, 'Model', carVariant);
    yPos += rowH;
    drawCell(col1X, yPos, colW, rowH, 'Order Id', orderId);
    drawCell(col2X, yPos, colW, rowH, 'Odometer Rd', odometer);
    yPos += rowH;
    drawCell(col1X, yPos, colW, rowH, 'Workshop Name', garageName);
    drawCell(col2X, yPos, colW, rowH, 'City', city);
    yPos += rowH;
    // Full width address row
    doc.setDrawColor(200, 200, 200);
    doc.rect(col1X, yPos, 48, rowH);
    doc.rect(col1X + 48, yPos, colW * 2 - 48, rowH);
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'bold');
    doc.text('Address', col1X + 2, yPos + rowH / 2 + 2);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    const addrSplit = doc.splitTextToSize(String(address), colW * 2 - 52);
    doc.text(addrSplit[0] || '', col1X + 50, yPos + rowH / 2 + 2);
    yPos += rowH + 10;

    // ---- Services Section ----
    doc.setFillColor(245, 247, 255);
    doc.rect(col1X, yPos, 192, 8, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(col1X, yPos, 192, 8);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Service Items', col1X + 4, yPos + 5.5);
    doc.text('Amount (INR)', col1X + 150, yPos + 5.5);
    yPos += 8;

    services.forEach((s: any) => {
      const sName = typeof s === 'object' ? (s.name || '') : String(s);
      const sPrice = typeof s === 'object' ? (s.price || 0) : 0;
      doc.setDrawColor(220, 220, 220);
      doc.rect(col1X, yPos, 192, 8);
      doc.setFontSize(8.5);
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'normal');
      doc.text(sName, col1X + 4, yPos + 5.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`Rs. ${sPrice}`, col1X + 150, yPos + 5.5);
      yPos += 8;
    });

    yPos += 6;

    // ---- Order Summary Table ----
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Order Summary', 105, yPos, { align: 'center' });
    yPos += 6;

    const drawSummaryRow = (label: string, value: string, valueColor?: number[], remarkLabel?: string, remarkValue?: string) => {
      doc.setDrawColor(200, 200, 200);
      doc.rect(col1X, yPos, 96, 9);
      doc.rect(col1X + 96, yPos, 96, 9);
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);
      doc.setFont('helvetica', 'bold');
      doc.text(label, col1X + 3, yPos + 6);
      doc.setFont('helvetica', 'normal');
      if (valueColor) doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
      else doc.setTextColor(0, 0, 0);
      doc.text(value, col1X + 3 + (label === 'Grand Total' ? 0 : 0), yPos + 6);
      // Right cell
      doc.setTextColor(100, 100, 100);
      if (remarkLabel) doc.text(remarkLabel, col1X + 99, yPos + 6);
      if (remarkValue) {
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(remarkValue, col1X + 140, yPos + 6);
      }
      yPos += 9;
    };

    // Order Value row
    doc.setDrawColor(200, 200, 200);
    doc.rect(col1X, yPos, 96, 9);
    doc.rect(col1X + 96, yPos, 96, 9);
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'bold');
    doc.text('Order Value', col1X + 3, yPos + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Rs. ${orderValue}`, col1X + 40, yPos + 6);
    doc.setTextColor(100, 100, 100);
    doc.text('Remarks', col1X + 99, yPos + 6);
    yPos += 9;

    // Discount row
    doc.setDrawColor(200, 200, 200);
    doc.rect(col1X, yPos, 96, 9);
    doc.rect(col1X + 96, yPos, 96, 9);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text(discountAmt > 0 ? `Discount (${discountType === 'percent' ? discount + '%' : 'fixed'})` : 'Discount', col1X + 3, yPos + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(220, 50, 50);
    doc.text(discountAmt > 0 ? `- Rs. ${discountAmt}` : 'Rs. 0', col1X + 40, yPos + 6);
    // Right cell with loyalty label
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    if (discountLabel) doc.text(discountLabel, col1X + 99, yPos + 6);
    yPos += 9;

    // Tax row
    doc.setDrawColor(200, 200, 200);
    doc.rect(col1X, yPos, 96, 9);
    doc.rect(col1X + 96, yPos, 96, 9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text('Tax', col1X + 3, yPos + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Rs. ${tax}`, col1X + 40, yPos + 6);
    yPos += 9;

    // Grand Total row
    doc.setFillColor(245, 247, 255);
    doc.rect(col1X, yPos, 96, 9, 'FD');
    doc.rect(col1X + 96, yPos, 96, 9, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(20, 20, 20);
    doc.text('Grand Total', col1X + 3, yPos + 6.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`Rs. ${grandTotal}`, col1X + 40, yPos + 6.5);
    yPos += 12;

    // Additional Notes
    if (remarks) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(50, 50, 50);
      doc.text('Additional Notes', col1X, yPos);
      yPos += 6;
      doc.setDrawColor(200, 200, 200);
      doc.rect(col1X, yPos, 192, 20);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      const notesSplit = doc.splitTextToSize(remarks, 185);
      doc.text(notesSplit, col1X + 3, yPos + 6);
    }

    // ===========================
    // PAGE 2: TERMS & CONDITION (DISCLAIMER)
    // ===========================
    doc.addPage();

    // Disclaimer header - dark background
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(0, 40, 210, 14, 'F');
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Terms and Condition', 105, 49, { align: 'center' });

    yPos = 65;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const disclaimerItems = [
      { text: 'Prices are inclusive of all applicable taxes', color: [50, 50, 50] as [number, number, number] },
      { text: 'This is a summary of the order placed on Car Service Guru and not a tax Invoice.', color: [37, 99, 235] as [number, number, number] },
      { text: '  The Tax invoice shall be provided by the workshop directly.', color: [37, 99, 235] as [number, number, number] },
      { text: 'Colour of Engine Oil might turn black post service in Diesel Cars.', color: [220, 120, 20] as [number, number, number] },
      { text: 'Safety & Warranty Fees covers Skill India Training, Pickup & Drop Warranty', color: [220, 120, 20] as [number, number, number] },
      { text: '  & Upskilling of Workshop Partners', color: [220, 120, 20] as [number, number, number] },
    ];

    disclaimerItems.forEach(item => {
      const bullet = item.text.startsWith('  ') ? '' : '• ';
      doc.setTextColor(item.color[0], item.color[1], item.color[2]);
      const fullText = bullet + item.text;
      const split = doc.splitTextToSize(fullText, 180);
      doc.text(split, 15, yPos);
      yPos += split.length * 7 + 2;
    });

    yPos += 15;

    // Full terms
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const fullTerms = [
      '• Pickup and Drop time is subject to the availability of drivers.',
      '• Payment should be made in full during the time of vehicle delivery.',
      '• Inventory discrepancies will not be entertained once confirmed by owner at time of delivery.',
      '• Car Service Guru will not be liable for any delay due to conditions beyond control.',
      '• Garaging cost (500/day) will be levied if: a) Approval not provided within 7 days for insurance jobs b) Approval not provided within 3 days for other jobs c) Car not picked up within 7 days of completion.',
      '• Fuel consumed during vehicle transport will be borne by the customer.',
      '• All personal belongings should be removed. We are not responsible for any loss.',
      '• Bodywork/Painting vehicles dispatched only after successful payment and inspection.',
    ];

    fullTerms.forEach(term => {
      const split = doc.splitTextToSize(term, 180);
      doc.text(split, 15, yPos);
      yPos += split.length * 6 + 4;
    });

    const customerNameSlug2 = cName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') || 'Customer';
    const dateStr2 = new Date().toISOString().slice(0, 10);
    doc.save(`${customerNameSlug2}_invoice_${dateStr2}.pdf`);
  };


  const getStatusStep = (status: string) => {
    const s = (status || '').toLowerCase().replace(/[_-]/g, ' ').trim();
    if (s.includes('cancelled by garage')) return -2;
    switch (s) {
      case 'pickup on the way': return 1;
      case 'assigned': return 2;
      case 'in progress': return 3;
      case 'quality check': return 4;
      case 'ready for delivery': return 5;
      case 'drop on the way': return 6;
      case 'delivered': return 7;
      case 'completed': return 7;
      case 'cancelled': return -1;
      case 'pending': return 0;
      default: return 0;
    }
  };

  const getStatusColor = (bookingStatus: string) => {
    const status = (bookingStatus || 'pending').toLowerCase().replace(/[_-]/g, ' ').trim();
    if (status.includes('cancelled by garage')) return 'bg-rose-100 text-rose-600 border-rose-200';
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-600 border-amber-200';
      case 'pickup on the way': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'assigned': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'in progress': return 'bg-purple-100 text-purple-600 border-purple-200';
      case 'quality check': return 'bg-indigo-100 text-indigo-600 border-indigo-200';
      case 'ready for delivery': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
      case 'drop on the way': return 'bg-cyan-100 text-cyan-600 border-cyan-200';
      case 'delivered':
      case 'completed': return 'bg-green-100 text-green-600 border-green-200';
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
                const isGarageCancelled = booking.service_status?.toLowerCase().includes('cancelled');
                const finalDisplayStatus = isGarageCancelled ? booking.service_status : (booking.display_status || booking.status || 'pending');
                const currentStep = getStatusStep(finalDisplayStatus);
                const isExpanded = expandedId === booking.id;
                const canCancel = !isGarageCancelled && !booking.garage_id && booking.status !== 'completed' && !booking.status.includes('cancelled');

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
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(finalDisplayStatus)}`}>
                                {finalDisplayStatus.replace('_', ' ')}
                              </span>
                            </div>
                            {isGarageCancelled && (
                              <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 p-3 rounded-xl mt-2">
                                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                                <p className="text-[11px] font-bold text-rose-700 leading-tight">
                                  {booking.service_status}. Our team is working to reassign your service.
                                </p>
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-6 mt-4">
                              <button 
                                onClick={() => downloadPDF(booking)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-100 transition-colors border border-blue-100 shadow-sm"
                              >
                                <Download className="w-4 h-4" />
                                Job Card
                              </button>
                              <button 
                                onClick={() => downloadInvoicePDF(booking)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-colors border border-emerald-100 shadow-sm"
                              >
                                <Download className="w-4 h-4" />
                                Invoice
                              </button>
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
                                  style={{ width: currentStep === -1 ? '0%' : `${Math.max(0, (currentStep - 1)) * (100 / 6)}%` }}
                                ></div>
                              </div>
                              <div className="relative flex justify-between">
                                {[
                                  { label: 'Pickup', icon: Truck },
                                  { label: 'Assigned', icon: User },
                                  { label: 'In Progress', icon: Activity },
                                  { label: 'Quality Check', icon: ShieldCheck },
                                  { label: 'Ready', icon: Package },
                                  { label: 'Drop', icon: MapPin },
                                  { label: 'Delivered', icon: CheckCircle2 }
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
                                      <span className={`text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-center px-1 ${isCompleted ? 'text-blue-600' : 'text-stone-400'}`}>
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

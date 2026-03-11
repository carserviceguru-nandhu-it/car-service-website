import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Car, 
  MapPin, 
  Calendar, 
  Clock, 
  Loader2, 
  Navigation, 
  CheckCircle2, 
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

interface BookingFormProps {
  user: any;
}

export default function BookingForm({ user }: BookingFormProps) {
  const [formData, setFormData] = useState({
    carBrand: '',
    carModel: '',
    location: '',
    bookingDate: '',
    bookingTime: ''
  });
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceDetails, setServiceDetails] = useState<any[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [locating, setLocating] = useState(false);
  const navigate = useNavigate();

  // Generate time slots (9 AM to 6 PM, 1-hour intervals)
  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
  ];

  // Generate next 30 days
  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dates.push(dateStr);
    }
    return dates;
  };

  const availableDates = generateAvailableDates();

  useEffect(() => {
    // Set default date to today
    if (!formData.bookingDate && availableDates.length > 0) {
      setFormData(prev => ({ ...prev, bookingDate: availableDates[0] }));
    }
    
    const services = localStorage.getItem('csg_selected_services');
    if (services) {
      const selected = JSON.parse(services);
      setSelectedServices(selected);
      fetchServiceDetails(selected);
    } else {
      navigate('/services');
    }
  }, [navigate]);

  const fetchServiceDetails = async (selectedIds: string[]) => {
    setLoadingDetails(true);
    try {
      const response = await fetch('/api/services');
      const result = await response.json();
      if (result.success) {
        const details = result.services.filter((s: any) => selectedIds.includes(s.id));
        setServiceDetails(details);
        const total = details.reduce((sum: number, s: any) => sum + (s.price || 0), 0);
        setTotalPrice(total);
      }
    } catch (error) {
      console.error('Error fetching service details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleGetLocation = () => {
    setLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
            const data = await response.json();
            setFormData({ ...formData, location: data.display_name });
          } catch (error) {
            console.error("Geocoding error:", error);
            setFormData({ ...formData, location: `${latitude}, ${longitude}` });
          } finally {
            setLocating(false);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocating(false);
          alert("Could not get your location. Please enter it manually.");
        }
      );
    } else {
      setLocating(false);
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submission triggered");
    setLoading(true);

    try {
      if (!user || !user.phone) {
        throw new Error("User information is missing. Please log in again.");
      }

      console.log("Preparing booking data for:", user.name);
      const bookingTime = `${formData.bookingDate}T${formData.bookingTime}:00Z`;
      
      const payload = {
        customerName: user.name,
        phone: user.phone,
        email: user.email,
        carBrand: formData.carBrand,
        carModel: formData.carModel,
        services: selectedServices,
        location: formData.location,
        bookingTime,
        userId: user.id,
        totalPrice
      };

      console.log("Sending payload to /api/bookings:", payload);

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log("Response received, status:", response.status);
      const result = await response.json();
      console.log("Result from server:", result);
      
      if (result.success) {
        // Prepare WhatsApp message
        const message = `New Car Service Booking\n\nName: ${user.name}\nPhone: ${user.phone}\nEmail: ${user.email}\nCar: ${formData.carBrand} ${formData.carModel}\nServices: ${serviceDetails.map(s => s.name).join(', ')}\nLocation: ${formData.location}\nDate & Time: ${formData.bookingDate} ${formData.bookingTime}\nTotal: ₹${totalPrice}`;
        const encodedMessage = encodeURIComponent(message);
        const waUrl = `https://wa.me/919751969009?text=${encodedMessage}`;
        
        const enrichedBooking = {
          ...result.booking,
          car_brand: formData.carBrand,
          car_model: formData.carModel,
          location: formData.location,
          services: serviceDetails,
          total_price: totalPrice,
          booking_time: bookingTime
        };
        localStorage.setItem('csg_last_booking', JSON.stringify(enrichedBooking));
        localStorage.setItem('csg_wa_url', waUrl);
        
        // Clear selected services
        localStorage.removeItem('csg_selected_services');
        
        // Use a more reliable way to notify and redirect
        navigate('/confirmation');
      } else {
        throw new Error(result.error || 'Server returned an error');
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      alert(`Booking Failed: ${error.message}. Please check your connection or try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12">
      <div className="flex items-center gap-4 mb-12">
        <button 
          onClick={() => navigate('/services')}
          className="p-3 hover:bg-stone-100 rounded-2xl transition-colors text-stone-500"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-4xl font-black text-blue-900">Complete Your Booking</h1>
          <p className="text-blue-600/60 font-medium">Just a few more details to get your car serviced.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 md:p-10 rounded-3xl border border-blue-100 shadow-2xl shadow-blue-600/5"
          >
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-blue-500 ml-1">Car Brand</label>
                  <div className="relative group">
                    <Car className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300 group-focus-within:text-blue-600 transition-colors" />
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Toyota"
                      className="w-full pl-12 pr-4 py-4 bg-blue-50/30 border border-blue-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      value={formData.carBrand}
                      onChange={(e) => setFormData({ ...formData, carBrand: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-blue-500 ml-1">Car Model</label>
                  <div className="relative group">
                    <Car className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300 group-focus-within:text-blue-600 transition-colors" />
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Camry"
                      className="w-full pl-12 pr-4 py-4 bg-blue-50/30 border border-blue-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      value={formData.carModel}
                      onChange={(e) => setFormData({ ...formData, carModel: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-blue-500 ml-1">Service Location</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300 group-focus-within:text-blue-600 transition-colors" />
                  <input 
                    type="text" 
                    required
                    placeholder="Enter your address"
                    className="w-full pl-12 pr-32 py-4 bg-blue-50/30 border border-blue-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                  <button 
                    type="button"
                    onClick={handleGetLocation}
                    disabled={locating}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white border border-blue-100 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-blue-50 text-blue-600 transition-colors disabled:opacity-50"
                  >
                    {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                    GPS
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-blue-500 ml-1">Preferred Date</label>
                  <div className="relative group">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300 group-focus-within:text-blue-600 transition-colors pointer-events-none z-10" />
                    <input 
                      type="date" 
                      required
                      min={availableDates[0]}
                      max={availableDates[availableDates.length - 1]}
                      className="w-full pl-12 pr-4 py-4 bg-blue-50/30 border border-blue-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      value={formData.bookingDate}
                      onChange={(e) => setFormData({ ...formData, bookingDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-blue-500 ml-1">Preferred Time</label>
                  <div className="relative group">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300 group-focus-within:text-blue-600 transition-colors pointer-events-none z-10" />
                    <select 
                      required
                      className="w-full pl-12 pr-4 py-4 bg-blue-50/30 border border-blue-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium appearance-none cursor-pointer"
                      value={formData.bookingTime}
                      onChange={(e) => setFormData({ ...formData, bookingTime: e.target.value })}
                    >
                      <option value="">Select a time</option>
                      {timeSlots.map((time) => {
                        const [hours, minutes] = time.split(':');
                        const hour = parseInt(hours);
                        const ampm = hour >= 12 ? 'PM' : 'AM';
                        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
                        return (
                          <option key={time} value={time}>
                            {displayHour}:{minutes} {ampm}
                          </option>
                        );
                      })}
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300 pointer-events-none rotate-90" />
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed group mt-4"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    Confirm Booking
                    <CheckCircle2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>

        <div className="space-y-6">
          <div className="bg-stone-900 text-white p-8 rounded-3xl shadow-2xl">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
              Summary
            </h3>
            <div className="space-y-4 mb-8">
              {loadingDetails ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                </div>
              ) : serviceDetails.length > 0 ? serviceDetails.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-stone-400 font-medium capitalize">{s.name}</span>
                  <span className="font-bold">₹{s.price}</span>
                </div>
              )) : (
                <div className="text-stone-500 text-sm italic">No services selected</div>
              )}
            </div>
            <div className="pt-6 border-t border-white/10 flex items-center justify-between">
              <div>
                <span className="text-stone-400 font-bold uppercase tracking-widest text-[10px] block mb-1">Total Amount</span>
                <span className="text-3xl font-black text-blue-400">₹{totalPrice}</span>
              </div>
              <div className="text-right">
                <span className="text-stone-400 font-bold uppercase tracking-widest text-[10px] block mb-1">Services</span>
                <span className="text-xl font-black text-white">{selectedServices.length}</span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => navigate('/services')}
            className="w-full bg-white border-2 border-blue-100 text-blue-600 py-4 rounded-2xl font-black text-sm hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/5 active:scale-95"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Add More Services
          </button>

          <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
            <div className="flex items-start gap-4">
              <div className="bg-emerald-600 p-2 rounded-xl text-white">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-emerald-900 mb-1">Doorstep Service</h4>
                <p className="text-emerald-700 text-sm font-medium leading-relaxed">Our mechanic will reach your location at the selected time.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

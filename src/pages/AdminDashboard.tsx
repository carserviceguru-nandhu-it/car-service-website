import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Loader2, 
  User, 
  Phone, 
  Mail, 
  Car, 
  MapPin, 
  Calendar,
  ChevronDown,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      let { data, error } = await supabase
        .from('bookings')
        .select('*, profiles:user_id(address, name, phone), vehicles:vehicle_id(brand, model), booking_services(services(name, price))')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn("Join query failed, trying simple query:", error);
        const fallback = await supabase
          .from('bookings')
          .select('*')
          .order('created_at', { ascending: false });
        
        data = fallback.data;
        if (fallback.error) throw fallback.error;
      }

      const normalizedData = (data || []).map((b: any) => {
        // Prioritize joined data, then direct columns
        const vehicleData = Array.isArray(b.vehicles) ? b.vehicles[0] : b.vehicles;
        const brand = vehicleData?.brand || b.brand || b.car_brand || b.carBrand || b.vehicle_brand || "Unknown";
        const model = vehicleData?.model || b.model || b.car_model || b.carModel || b.vehicle_model || "Vehicle";
        const address = b.profiles?.address || b.address || b.location || b.service_location || "Not specified";
        
        // Extract services from booking_services join if available
        let finalServices = [];
        if (b.booking_services && Array.isArray(b.booking_services)) {
          finalServices = b.booking_services.map((bs: any) => {
            const s = Array.isArray(bs.services) ? bs.services[0] : bs.services;
            return {
              name: s?.name,
              price: s?.price
            };
          }).filter(s => s.name);
        }
        
        // Fallback to direct services column
        if (finalServices.length === 0) {
          const rawServices = b.services || b.selected_services || b.service_list || b.items || [];
          const servicesArray = Array.isArray(rawServices) ? rawServices : (typeof rawServices === 'string' ? rawServices.split(',') : []);
          finalServices = servicesArray.map((s: any) => {
            if (typeof s === 'object' && s.name) return s;
            return { name: String(s), price: 0 };
          }).filter(s => s.name);
        }

        const bTime = b.scheduled_date && b.scheduled_time 
          ? `${b.scheduled_date}T${b.scheduled_time}` 
          : (b.booking_time || b.booking_date || b.scheduled_at || b.date || b.created_at);

        // Normalize status spelling and handle alternate variants
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
      });
      setBookings(normalizedData);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const updateData: any = { 
        status: newStatus
      };

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      fetchBookings();
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update status.');
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.profiles?.phone.includes(searchTerm) || b.profiles?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const bookingStatus = (b.display_status || b.status || '').toLowerCase().replace(/_/g, '-');
    const filterStatus = (statusFilter || '').toLowerCase().replace(/_/g, '-');
    const matchesStatus = statusFilter === 'all' || bookingStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    const s = (status || '').toLowerCase().replace(/_/g, '-');
    switch (s) {
      case 'pending': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'assigned': return <User className="w-4 h-4 text-indigo-500" />;
      case 'in-progress': return <Activity className="w-4 h-4 text-purple-500" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    const s = (status || 'pending').toLowerCase().replace(/_/g, '-');
    switch (s) {
      case 'pending': return 'bg-amber-100 text-amber-600 border-amber-200';
      case 'assigned': return 'bg-indigo-100 text-indigo-600 border-indigo-200';
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
    <div className="max-w-7xl mx-auto py-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
        <div>
          <h1 className="text-4xl font-black mb-2">Admin Dashboard</h1>
          <p className="text-stone-500 font-medium">Manage all customer bookings and service status.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Search by name or phone..."
              className="pl-12 pr-4 py-3 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium w-full sm:w-80"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <select 
                  className="pl-12 pr-10 py-3 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium appearance-none w-full sm:w-48"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
              </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-stone-400">Customer</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-stone-400">Vehicle</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-stone-400">Services</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-stone-400">Schedule</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-stone-400 text-center">Status</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-stone-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredBookings.map((booking, idx) => (
                <motion.tr 
                  key={booking.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="hover:bg-stone-50/50 transition-colors group"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {booking.profiles?.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-stone-900 leading-tight">{booking.profiles?.name}</p>
                        <p className="text-xs font-medium text-stone-400 flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" /> {booking.profiles?.phone}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-stone-900 p-2 rounded-lg text-white">
                        <Car className="w-4 h-4" />
                      </div>
                      <p className="font-bold text-sm">{booking.car_brand} {booking.car_model}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                      {(booking.services || []).map((s: any, i: number) => {
                        const sName = typeof s === 'object' ? s.name : s;
                        return (
                          <span key={i} className="bg-stone-100 px-2 py-0.5 rounded text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                            {(sName || "").replace('-', ' ')}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <p className="text-sm font-bold flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        {new Date(booking.booking_time).toLocaleDateString()}
                      </p>
                      <p className="text-xs font-medium text-stone-400 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(booking.booking_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${getStatusColor(booking.display_status || booking.status)}`}>
                      {getStatusIcon(booking.display_status || booking.status)}
                      {(booking.display_status || booking.status || 'pending').replace('_', ' ')}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <select 
                        className="text-xs font-bold border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={booking.display_status || booking.status}
                        onChange={(e) => updateStatus(booking.id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="assigned">Assigned</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredBookings.length === 0 && (
          <div className="p-20 text-center">
            <div className="bg-stone-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-stone-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">No results found</h3>
            <p className="text-stone-500 font-medium">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

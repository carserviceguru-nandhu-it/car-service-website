import { useState, useEffect } from 'react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  CheckCircle2, ArrowRight, Loader2,
  Car, Snowflake, Battery, CircleDot, 
  Paintbrush, Sparkles, Droplets, 
  ClipboardCheck, Sun, Wrench, Disc, ShieldCheck
} from 'lucide-react';

const getIconForService = (name: string) => {
  const n = name.toLowerCase();
  
  if (n.includes('ac')) return (
    <div className="relative">
      <Car className="w-12 h-12 text-blue-600" />
      <Snowflake className="w-6 h-6 text-[#262626] absolute -top-2 left-3 fill-[#262626]" />
    </div>
  );
  if (n.includes('battery') || n.includes('batteries')) return (
    <div className="relative">
      <Battery className="w-12 h-12 text-[#262626]" />
      <span className="absolute inset-0 flex items-center justify-center text-blue-600 font-black text-xl">+</span>
    </div>
  );
  if (n.includes('tyre') || n.includes('wheel')) return <CircleDot className="w-12 h-12 text-[#262626]" />;
  if (n.includes('dent') || n.includes('paint')) return (
    <div className="relative">
      <Paintbrush className="w-12 h-12 text-[#262626]" />
      <div className="w-5 h-5 bg-blue-600 rounded-sm absolute bottom-0 -right-2"></div>
    </div>
  );
  if (n.includes('detail')) return <Sparkles className="w-12 h-12 text-[#262626]" />;
  if (n.includes('spa') || n.includes('clean')) return <Droplets className="w-12 h-12 text-blue-600" />;
  if (n.includes('inspection')) return (
    <div className="relative">
      <Car className="w-12 h-12 text-blue-600" />
      <ClipboardCheck className="w-8 h-8 text-[#262626] absolute -top-1 -right-4 bg-white rounded" />
    </div>
  );
  if (n.includes('windshield') || n.includes('glass')) return <Sun className="w-12 h-12 text-[#262626]" />;
  if (n.includes('suspension')) return (
    <div className="relative">
      <Wrench className="w-12 h-12 text-[#262626]" />
      <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-blue-600"></div>
    </div>
  );
  if (n.includes('clutch')) return <Disc className="w-12 h-12 text-blue-600" />;
  if (n.includes('insurance')) return <ShieldCheck className="w-12 h-12 text-blue-600 fill-blue-600" />;
  
  // Default / Car Services
  return (
    <div className="relative">
      <Car className="w-12 h-12 text-blue-600" />
      <div className="absolute top-1 left-2 w-8 h-5 bg-[#262626] rounded-sm flex items-center justify-center">
        <div className="w-6 h-1 bg-white rounded-full"></div>
      </div>
    </div>
  );
};

export default function ServiceSelection() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch('/api/services');
        const data = await response.json();
        if (data.success) {
          setServices(data.services);
        }
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();

    const saved = localStorage.getItem('csg_selected_services');
    if (saved) {
      try {
        setSelectedServices(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved services', e);
      }
    }
  }, []);

  const toggleService = (id: string) => {
    if (selectedServices.includes(id)) {
      setSelectedServices(selectedServices.filter(s => s !== id));
    } else {
      setSelectedServices([...selectedServices, id]);
    }
  };

  const handleContinue = () => {
    if (selectedServices.length > 0) {
      localStorage.setItem('csg_selected_services', JSON.stringify(selectedServices));
      navigate('/book');
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
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-black mb-4">Select Your Services</h1>
        <p className="text-stone-500 font-medium">Choose one or more services you need for your vehicle.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {services.map((service, idx) => {
          const isSelected = selectedServices.includes(service.id);
          return (
            <motion.div 
              key={service.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => toggleService(service.id)}
              className={`
                relative pt-10 pb-6 px-4 rounded-sm cursor-pointer transition-all flex flex-col items-center justify-center text-center h-[160px] md:h-[180px]
                ${isSelected 
                  ? 'bg-stone-100 ring-2 ring-stone-400 drop-shadow-md' 
                  : 'bg-[#f4f5f6] hover:bg-stone-100 border border-transparent'}
              `}
            >
              {service.label && (
                <div className="absolute top-0 right-0 bg-green-50 text-green-600 px-2 py-1 text-[10px] sm:text-xs font-medium rounded-bl-md">
                  {service.label}
                </div>
              )}

              <div className="mb-6">
                {getIconForService(service.name)}
              </div>
              
              <h3 className="text-[13px] md:text-sm font-bold text-stone-700 leading-snug">{service.name}</h3>
              <p className="text-[11px] md:text-xs font-black text-blue-600 mt-2">₹{service.price}</p>
              
              {isSelected && (
                <div className="absolute top-2 left-2 bg-stone-800 text-white p-0.5 rounded-full shadow-lg">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-16 flex flex-col items-center gap-6">
        <div className="flex items-center gap-4 text-stone-500 font-bold uppercase tracking-widest text-xs">
          <div className="w-12 h-px bg-stone-200"></div>
          {selectedServices.length} Services Selected
          <div className="w-12 h-px bg-stone-200"></div>
        </div>
        
        <button 
          onClick={handleContinue}
          disabled={selectedServices.length === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-2xl font-black text-xl flex items-center gap-3 transition-all shadow-xl hover:shadow-blue-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          Continue to Booking
          <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}

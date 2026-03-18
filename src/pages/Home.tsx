import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Wrench, 
  ChevronRight, 
  Star, 
  Instagram, 
  Youtube, 
  Mail, 
  Phone, 
  MessageSquare,
  ChevronDown,
  Droplets,
  Wind,
  Disc,
  Battery,
  AlertTriangle,
  ClipboardCheck,
  Waves,
  Settings,
  Paintbrush,
  Sparkles,
  Activity,
  Sun,
  Loader2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import React from 'react';

const iconMap: Record<string, React.ReactNode> = {
  'Wrench': <Wrench className="w-6 h-6" />,
  'Droplets': <Droplets className="w-6 h-6" />,
  'Wind': <Wind className="w-6 h-6" />,
  'Disc': <Disc className="w-6 h-6" />,
  'Battery': <Battery className="w-6 h-6" />,
  'AlertTriangle': <AlertTriangle className="w-6 h-6" />,
  'ClipboardCheck': <ClipboardCheck className="w-6 h-6" />,
  'Waves': <Waves className="w-6 h-6" />,
  'Settings': <Settings className="w-6 h-6" />,
  'Paintbrush': <Paintbrush className="w-6 h-6" />,
  'Sparkles': <Sparkles className="w-6 h-6" />,
  'Activity': <Activity className="w-6 h-6" />,
  'Sun': <Sun className="w-6 h-6" />,
};

const features = [
  {
    icon: <ShieldCheck className="w-6 h-6 text-blue-600" />,
    title: "Trusted Experts",
    desc: "Certified mechanics with years of experience in all car brands."
  },
  {
    icon: <Clock className="w-6 h-6 text-blue-600" />,
    title: "Fast Booking",
    desc: "Book your service in under 60 seconds. No more waiting on calls."
  },
  {
    icon: <MapPin className="w-6 h-6 text-blue-600" />,
    title: "Doorstep Service",
    desc: "We come to your location or provide free pickup and drop-off."
  },
  {
    icon: <Wrench className="w-6 h-6 text-blue-600" />,
    title: "Genuine Parts",
    desc: "We only use 100% genuine OEM parts for all replacements."
  }
];

const serviceFeatures: Record<string, string[]> = {
  "Basic Services": [
    "Oil Replacement",
    "Oil filter replacement",
    "Air Filter Cleaning",
    "Coolant Top up",
    "Wiper Fluid Replacement",
    "Washing"
  ],
  "Standard Service": [
    "Oil Replacement",
    "Oil filter replacement",
    "Air Filter Replacement",
    "Coolant Top up",
    "Wiper Fluid Replacement",
    "Washing",
    "Break oil Topup",
    "AC Filter Cleaning",
    "Front & Rear Brake Cleaning",
    "Engine Scanning"
  ],
  "Comprehensive Services": [
    "Oil Replacement",
    "Oil filter replacement",
    "Air Filter Replacement",
    "Ac Filter Replacement",
    "Wiper Fluid Replacement",
    "Washing",
    "Break oil Topup",
    "Coolant Top up",
    "Front & Rear Brake Cleaning",
    "Engine Scanning",
    "Engine Flushing",
    "Throttle Body Cleaning",
    "Gear Oil",
    "Wheel Alignment"
  ],
  "Battery Jumpstart": [
    "Inspection Rs.500"
  ]
};

export default function Home() {
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const navigate = useNavigate();

  const handleServiceClick = (serviceId: string) => {
    const saved = localStorage.getItem('csg_selected_services');
    let selected: string[] = [];
    if (saved) {
      try { selected = JSON.parse(saved); } catch(e){}
    }
    if (!selected.includes(serviceId)) {
      selected.push(serviceId);
    }
    localStorage.setItem('csg_selected_services', JSON.stringify(selected));
    navigate('/services'); 
  };

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch('/api/services');
        const data = await response.json();
        if (data.success) {
          // Find our main 4 services by name, or fallback to first 4
          const targetNames = ["Basic Services", "Standard Service", "Comprehensive Services", "Battery Jumpstart"];
          const filtered = data.services.filter((s: any) => targetNames.includes(s.name));
          
          if (filtered.length >= 4) {
            // Sort by targetNames order
            filtered.sort((a: any, b: any) => targetNames.indexOf(a.name) - targetNames.indexOf(b.name));
            setServices(filtered.slice(0, 4));
          } else {
            setServices(data.services.slice(0, 4));
          }
        }
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoadingServices(false);
      }
    };

    fetchServices();
  }, []);

  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features-section');
    featuresSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-24 pb-20 relative">
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex flex-col justify-center overflow-hidden rounded-3xl bg-stone-900 text-white p-8 md:p-16 lg:p-24 shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=1000" 
            alt="Car Engine" 
            className="object-cover w-full h-full"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 bg-blue-600/20 text-blue-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6 border border-blue-600/30">
            <Star className="w-3.5 h-3.5 fill-current" />
            #1 Rated Car Service in Bangalore
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.9] mb-8">
            EXPERT CARE FOR YOUR <span className="text-blue-500">CAR.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-stone-400 mb-10 leading-relaxed font-medium">
            Professional car maintenance and repair services at your doorstep in Bangalore. 
            Transparent pricing, genuine parts, and certified experts.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              to="/services" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-600/20 active:scale-95 group"
            >
              Book Service Now
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              to="/login" 
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-8 py-4 rounded-2xl font-bold text-lg flex items-center justify-center transition-all active:scale-95"
            >
              View History
            </Link>
          </div>
        </motion.div>

        {/* Scroll Down Arrow */}
        <motion.button
          onClick={scrollToFeatures}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-stone-500 hover:text-white transition-colors animate-bounce cursor-pointer z-20"
          aria-label="Scroll Down"
        >
          <ChevronDown className="w-8 h-8" />
        </motion.button>
      </section>

      {/* Features Grid */}
      <section id="features-section" className="scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Car Service Guru?</h2>
          <p className="text-stone-500 font-medium">We've reimagined car maintenance to be simple, transparent, and reliable.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-8 rounded-3xl border border-stone-200 hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-600/5 transition-all group"
            >
              <div className="bg-blue-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-stone-500 leading-relaxed text-sm font-medium">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Popular Services Section */}
      <section className="scroll-mt-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-black mb-4">Popular Services</h2>
            <p className="text-stone-500 font-medium">Top-rated maintenance services for your vehicle.</p>
          </div>
          <Link to="/services" className="text-blue-600 font-bold flex items-center gap-2 hover:translate-x-1 transition-transform group">
            View All Services
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {loadingServices ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, idx) => {
              const styles = [
                { gradient: 'from-blue-500/10 to-transparent', borderColor: 'group-hover:border-blue-500', shadow: 'hover:shadow-blue-500/20', iconColor: 'text-blue-500', originalPrice: Math.round(service.price * 1.5) },
                { gradient: 'from-purple-500/10 to-transparent', borderColor: 'group-hover:border-purple-500', shadow: 'hover:shadow-purple-500/20', iconColor: 'text-purple-500', originalPrice: Math.round(service.price * 1.4) },
                { gradient: 'from-emerald-500/10 to-transparent', borderColor: 'group-hover:border-emerald-500', shadow: 'hover:shadow-emerald-500/20', iconColor: 'text-emerald-500', originalPrice: Math.round(service.price * 1.3) },
                { gradient: 'from-orange-500/10 to-transparent', borderColor: 'group-hover:border-orange-500', shadow: 'hover:shadow-orange-500/20', iconColor: 'text-orange-500', originalPrice: null }
              ];
              const style = styles[idx % styles.length];
              
              const IconComponent = (iconMap[service.icon] as React.ReactElement) || <Wrench />;
              const styledIcon = React.cloneElement(IconComponent, { className: `w-8 h-8 ${style.iconColor}` });
              const featuresList = serviceFeatures[service.name] || [];

              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                  onClick={() => handleServiceClick(service.id)}
                  className={`bg-white rounded-3xl border border-stone-200 p-1 group relative overflow-hidden transition-all duration-300 cursor-pointer ${style.shadow} ${style.borderColor}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-b ${style.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}></div>
                  
                  <div className="bg-white rounded-[20px] p-6 h-full relative z-10 flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-stone-50 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-sm border border-stone-100">
                        {styledIcon}
                      </div>
                      {service.label && (
                        <div className="bg-stone-900 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">
                          {service.label}
                        </div>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-black text-stone-800 mb-2 group-hover:text-stone-900 transition-colors">{service.name}</h3>
                    
                    <div className="pt-2 pb-4 flex items-baseline gap-2 mb-2">
                      <span className="text-3xl font-black text-blue-600">₹{service.price}</span>
                      {style.originalPrice && (
                        <span className="text-sm font-bold text-stone-400 line-through">₹{style.originalPrice}</span>
                      )}
                    </div>

                    {featuresList.length > 0 && (
                      <ul className="mt-auto pt-4 border-t border-stone-100 space-y-2.5 text-xs text-stone-600 font-medium">
                        {featuresList.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${style.iconColor.replace('text-', 'bg-')}`}></div>
                            <span className="leading-snug">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Contact info below popular services */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 bg-gradient-to-r from-stone-900 to-stone-800 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl border border-stone-800"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/20 blur-[80px] rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 text-stone-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4 border border-white/5 backdrop-blur-sm">
                <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" /> Need Assistance?
              </div>
              <h3 className="text-3xl md:text-4xl font-black text-white mb-3">For more services contact</h3>
              <p className="text-stone-400 font-medium text-lg max-w-xl">
                Our auto experts are available to guide you and provide the most accurate estimates for your vehicle's specific needs.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto shrink-0">
              <a 
                href="tel:+919751969009" 
                className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] active:scale-95 group"
              >
                <div className="bg-white/20 p-2 rounded-full group-hover:animate-bounce">
                  <Phone className="w-5 h-5" />
                </div>
                Call +91 9751969009
              </a>
              <a 
                href="mailto:carserviceguru@gmail.com"
                className="flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 active:scale-95 group"
              >
                <Mail className="w-5 h-5 group-hover:scale-110 transition-transform" />
                carserviceguru@gmail.com
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Guarantee Section */}
      <section className="py-12">
        <h2 className="text-3xl font-black mb-10">Car Service Guru Guarantee</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-xl font-bold text-stone-800">Free Pickup Drop</span>
          </div>
          <div className="bg-purple-50/50 p-6 rounded-xl border border-purple-100 flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span className="text-xl font-bold text-stone-800">Genuine Parts</span>
          </div>
          <div className="bg-green-50/50 p-6 rounded-xl border border-green-100 flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-xl font-bold text-stone-800">30 Days Warranty</span>
          </div>
          <div className="bg-yellow-50/50 p-6 rounded-xl border border-yellow-100 flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <span className="text-xl font-bold text-stone-800">Affordable Prices</span>
          </div>
        </div>
      </section>

      {/* Social Media Section */}
      <section className="bg-white rounded-3xl p-8 md:p-16 border border-stone-200 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50 rounded-full -ml-32 -mb-32 opacity-50"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">Connect With Us</h2>
          <p className="text-stone-500 font-medium mb-12 max-w-lg">
            Stay updated with our latest offers, car care tips, and service updates on our social media platforms.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 w-full max-w-3xl">
            <a 
              href="tel:+919751969009" 
              className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-stone-50 hover:bg-white hover:shadow-xl hover:shadow-blue-500/10 transition-all border border-stone-100 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <Phone className="w-8 h-8" />
              </div>
              <span className="font-bold text-sm">Call Us</span>
            </a>
            
            <a 
              href="https://www.instagram.com/carserviceguru" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-stone-50 hover:bg-white hover:shadow-xl hover:shadow-pink-500/10 transition-all border border-stone-100 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <Instagram className="w-8 h-8" />
              </div>
              <span className="font-bold text-sm">Instagram</span>
            </a>
            
            <a 
              href="https://www.youtube.com/@carserviceguru" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-stone-50 hover:bg-white hover:shadow-xl hover:shadow-red-500/10 transition-all border border-stone-100 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <Youtube className="w-8 h-8" />
              </div>
              <span className="font-bold text-sm">YouTube</span>
            </a>
            
            <a 
              href="mailto:carserviceguru@gmail.com"
              className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-stone-50 hover:bg-white hover:shadow-xl hover:shadow-blue-500/10 transition-all border border-stone-100 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <Mail className="w-8 h-8" />
              </div>
              <span className="font-bold text-sm">Gmail</span>
            </a>
            
            <a 
              href="https://wa.me/919751969009" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-stone-50 hover:bg-white hover:shadow-xl hover:shadow-green-500/10 transition-all border border-stone-100 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#25D366] flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <MessageSquare className="w-8 h-8" />
              </div>
              <span className="font-bold text-sm">WhatsApp</span>
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 rounded-3xl p-8 md:p-16 text-center text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-white blur-3xl"></div>
        </div>
        
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">Ready to give your car the best treatment?</h2>
          <p className="text-blue-100 text-lg mb-10 font-medium">Join thousands of happy car owners who trust Car Service Guru.</p>
          <Link 
            to="/services" 
            className="bg-white text-blue-600 px-10 py-4 rounded-2xl font-black text-xl hover:bg-stone-100 transition-all shadow-xl active:scale-95 inline-block"
          >
            Get Started Today
          </Link>
        </div>
      </section>

      {/* Detailed Services & Brands Section */}
      <section className="bg-stone-900 rounded-3xl p-8 md:p-16 text-white border border-stone-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <h3 className="text-blue-500 font-bold uppercase tracking-widest text-sm mb-8">Our Services</h3>
            <ul className="space-y-4 text-stone-400 font-medium">
              <li>Scheduled Services</li>
              <li>AC Services</li>
              <li>Cleaning & Detailing</li>
              <li>Lights & Fitments</li>
              <li>Denting Painting</li>
              <li>Insurance Services</li>
              <li>Custom Repair</li>
              <li>Batteries</li>
              <li>Tyres</li>
              <li>Detailing Services</li>
              <li>Windshields & Glass</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-blue-500 font-bold uppercase tracking-widest text-sm mb-8">Luxury Brands</h3>
            <ul className="space-y-4 text-stone-400 font-medium">
              <li>Mercedes</li>
              <li>BMW</li>
              <li>Audi</li>
              <li>Volvo</li>
              <li>Mitsubishi</li>
              <li>Jaguar</li>
              <li>Porsche</li>
              <li>Rolls Royce</li>
              <li>Ferrari</li>
              <li>Land Rover</li>
            </ul>
          </div>

          <div>
            <h3 className="text-blue-500 font-bold uppercase tracking-widest text-sm mb-8">Popular Brands</h3>
            <ul className="space-y-4 text-stone-400 font-medium">
              <li>Maruti Suzuki</li>
              <li>Hyundai</li>
              <li>Honda</li>
              <li>Toyota</li>
              <li>Tata</li>
              <li>Mahindra</li>
              <li>Chevrolet</li>
              <li>Fiat</li>
              <li>Renault</li>
              <li>Kia</li>
              <li>Skoda</li>
              <li>Volkswagen</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

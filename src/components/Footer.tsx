import { Mail, Phone, Instagram, Youtube, MessageSquare, MapPin, Car } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-stone-900 text-white pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <Car className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                Car Service <span className="text-blue-500">Guru</span>
              </span>
            </div>
            <p className="text-stone-400 text-sm font-medium leading-relaxed">
              Your trusted partner for professional car maintenance and repair. 
              We bring expert care right to your doorstep.
            </p>
            <div className="flex items-center gap-4">
              <a 
                href="https://www.instagram.com/carserviceguru" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center hover:bg-blue-600 transition-all group"
              >
                <Instagram className="w-5 h-5 text-stone-400 group-hover:text-white" />
              </a>
              <a 
                href="https://www.youtube.com/@carserviceguru" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center hover:bg-blue-600 transition-all group"
              >
                <Youtube className="w-5 h-5 text-stone-400 group-hover:text-white" />
              </a>
              <a 
                href="mailto:carserviceguru@gmail.com"
                className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center hover:bg-blue-600 transition-all group"
              >
                <Mail className="w-5 h-5 text-stone-400 group-hover:text-white" />
              </a>
              <a 
                href="https://wa.me/919751969009" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center hover:bg-blue-600 transition-all group"
              >
                <MessageSquare className="w-5 h-5 text-stone-400 group-hover:text-white" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-6">Quick Links</h4>
            <ul className="space-y-4 text-sm font-medium text-stone-400">
              <li><a href="/" className="hover:text-blue-500 transition-colors">Home</a></li>
              <li><a href="/services" className="hover:text-blue-500 transition-colors">Book a Service</a></li>
              <li><a href="/login" className="hover:text-blue-500 transition-colors">Customer Login</a></li>
              <li><a href="/dashboard" className="hover:text-blue-500 transition-colors">My Bookings</a></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-6">Our Services</h4>
            <ul className="space-y-4 text-sm font-medium text-stone-400">
              <li>General Service</li>
              <li>Oil Change</li>
              <li>AC Service & Repair</li>
              <li>Brake Maintenance</li>
              <li>Battery Replacement</li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-6">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Email</p>
                  <a href="mailto:carserviceguru@gmail.com" className="text-sm font-bold hover:text-blue-500 transition-colors">
                    carserviceguru@gmail.com
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-blue-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Phone Number</p>
                  <a href="tel:+919751969009" className="text-sm font-bold hover:text-blue-500 transition-colors">
                    +91 9751969009
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Location</p>
                  <p className="text-sm font-bold">Bangalore</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-stone-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-stone-500 uppercase tracking-widest">
          <p>© 2026 Car Service Guru. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

import { Link } from 'react-router-dom';
import { Car, User, LogOut, Menu, Instagram, Youtube, Mail, MessageSquare } from 'lucide-react';
import { useState } from 'react';

interface NavbarProps {
  user: any;
  onLogout: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          {!imgError ? (
            <img 
              src="/logo.png" 
              alt="Car Service Guru Logo" 
              className="w-10 h-10 md:w-12 md:h-12 object-contain hover:scale-105 transition-transform"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="bg-blue-600 p-1.5 rounded-lg group-hover:bg-blue-700 transition-colors">
              <Car className="w-6 h-6 text-white" />
            </div>
          )}
          <span className="text-xl font-bold tracking-tight">
            Car Service <span className="text-blue-600">Guru</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-4 pr-4 mr-2 border-r border-stone-100">
            <a href="https://www.instagram.com/carserviceguru" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-pink-50 text-[#E4405F] transition-all hover:scale-110">
              <Instagram className="w-4 h-4" />
            </a>
            <a href="https://www.youtube.com/@carserviceguru" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-red-50 text-[#FF0000] transition-all hover:scale-110">
              <Youtube className="w-4 h-4" />
            </a>
            <a href="mailto:carserviceguru@gmail.com" className="p-1.5 rounded-lg hover:bg-red-50 text-[#D44638] transition-all hover:scale-110">
              <Mail className="w-4 h-4" />
            </a>
            <a href="https://wa.me/919751969009" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-green-50 text-[#25D366] transition-all hover:scale-110">
              <MessageSquare className="w-4 h-4" />
            </a>
          </div>
          
          <Link to="/" className="px-4 py-2 text-sm font-bold rounded-xl hover:bg-stone-50 hover:text-blue-600 transition-all">Home</Link>
          
          {user ? (
            <>
              <Link to="/services" className="px-4 py-2 text-sm font-bold rounded-xl hover:bg-stone-50 hover:text-blue-600 transition-all">Book Service</Link>
              <Link to="/dashboard" className="px-4 py-2 text-sm font-bold rounded-xl hover:bg-stone-50 hover:text-blue-600 transition-all">My Bookings</Link>
              
              <div className="flex items-center gap-3 pl-4 ml-2 border-l border-stone-200">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest leading-none mb-1">
                    {user.role || 'Customer'}
                  </span>
                  <span className="text-sm font-black text-stone-900 leading-none">{user.name}</span>
                </div>
                <button 
                  onClick={onLogout}
                  className="p-2.5 bg-stone-100 hover:bg-red-50 text-stone-500 hover:text-red-600 rounded-xl transition-all active:scale-95 group"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                </button>
              </div>
            </>
          ) : (
            <Link 
              to="/login" 
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95 ml-2"
            >
              Login / Register
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-stone-100 px-4 py-4 flex flex-col gap-4 animate-in slide-in-from-top duration-300">
          <Link to="/" onClick={() => setIsMenuOpen(false)} className="font-medium">Home</Link>
          {user ? (
            <>
              <Link to="/services" onClick={() => setIsMenuOpen(false)} className="font-medium">Book Service</Link>
              <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="font-medium">My Bookings</Link>
              <button 
                onClick={() => { onLogout(); setIsMenuOpen(false); }}
                className="text-left font-medium text-red-600"
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" onClick={() => setIsMenuOpen(false)} className="font-medium text-blue-600">Login / Register</Link>
          )}
        </div>
      )}
    </nav>
  );
}

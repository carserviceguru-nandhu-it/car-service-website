import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Phone, Mail, User, Loader2, ArrowRight, Shield, X, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLogin: (userData: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [showRoleModal, setShowRoleModal] = useState<{show: boolean, role: string}>({show: false, role: ''});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      const userData = result.user;

      if (userData.role === 'admin' || userData.role === 'garage') {
        setShowRoleModal({ show: true, role: userData.role });
        return;
      }

      onLogin(userData);
      
      // 3. Redirect based on history
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userData.id)
        .limit(1);

      if (bookings && bookings.length > 0) {
        navigate('/dashboard');
      } else {
        navigate('/services');
      }
    } catch (err: any) {
      console.error('Login error details:', {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code
      });
      setError(`Login failed: ${err.message || 'Please check your connection and try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 md:p-10 rounded-3xl border border-stone-200 shadow-xl"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black mb-3">Welcome Back</h1>
          <p className="text-stone-500 font-medium">Enter your details to access your account and book services.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold mb-6 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-stone-500 ml-1">Full Name</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-blue-600 transition-colors" />
              <input 
                type="text" 
                required
                placeholder="John Doe"
                className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-stone-500 ml-1">Phone Number</label>
            <div className="relative group">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-blue-600 transition-colors" />
              <input 
                type="tel" 
                required
                placeholder="+91 98765 43210"
                className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-stone-500 ml-1">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-blue-600 transition-colors" />
              <input 
                type="email" 
                required
                placeholder="john@example.com"
                className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-600/20 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed group mt-4"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                Continue
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-8 text-xs text-stone-400 font-medium leading-relaxed">
          By continuing, you agree to our <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
        </p>
      </motion.div>

      {/* Role Restriction Modal */}
      {showRoleModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
            
            <button 
              onClick={() => {
                setShowRoleModal({ show: false, role: '' });
                navigate('/');
              }}
              className="absolute top-4 right-4 p-2 hover:bg-stone-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-stone-500" />
            </button>

            <div className="text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-10 h-10 text-blue-600" />
              </div>
              
              <h2 className="text-2xl font-black mb-2 uppercase tracking-tight">
                {showRoleModal.role} Account
              </h2>
              <p className="text-stone-600 font-medium mb-8 leading-relaxed">
                This is a <span className="text-blue-600 font-bold">{showRoleModal.role} account</span>. 
                Please go and visit your site to manage your dashboard.
              </p>

              <button 
                onClick={() => {
                  setShowRoleModal({ show: false, role: '' });
                  navigate('/');
                }}
                className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-95 shadow-lg shadow-stone-200"
              >
                Close & Go Home
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Home from './pages/Home';
import Login from './pages/Login';
import ServiceSelection from './pages/ServiceSelection';
import BookingForm from './pages/BookingForm';
import Confirmation from './pages/Confirmation';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';

export default function App() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('csg_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      // Security: If an admin or garage is somehow still logged in, log them out
      if (parsedUser.role === 'admin' || parsedUser.role === 'garage') {
        localStorage.removeItem('csg_user');
        setUser(null);
      } else {
        setUser(parsedUser);
      }
    }
  }, []);

  const handleLogin = (userData: any) => {
    setUser(userData);
    localStorage.setItem('csg_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('csg_user');
  };

  return (
    <Router>
      <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex flex-col">
        <Navbar user={user} onLogout={handleLogout} />
        <main className="container mx-auto px-4 py-8 flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route 
              path="/services" 
              element={user ? <ServiceSelection /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/book" 
              element={user ? <BookingForm user={user} /> : <Navigate to="/login" />} 
            />
            <Route path="/confirmation" element={<Confirmation />} />
            <Route 
              path="/dashboard" 
              element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} 
            />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </main>
        <Footer />
        <ScrollToTop />
      </div>
    </Router>
  );
}

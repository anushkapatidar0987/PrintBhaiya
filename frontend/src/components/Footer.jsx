import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Printer, Heart } from 'lucide-react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Hide footer on dashboard pages if needed, or keep it.
  // We'll keep it as it's currently rendered globally.

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  const onEnterPortal = (role) => {
    if (role === 'student') navigate('/auth?mode=register');
    else if (role === 'shopkeeper') navigate('/auth?mode=login');
    else if (role === 'admin') navigate('/superadmin');
  };

  return (
    <footer className="mt-auto bg-[#191A23] text-white pt-16 pb-8 border-t border-slate-800">
      <div className="w-full max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12 text-left">
          
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-4">
            <h2 className="font-display font-bold text-2xl flex items-center gap-2">
              <Printer className="h-6 w-6 text-emerald-400" />
              PrintKarDoBhaiya
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Skip the queue. Print smart. Revolutionizing campus printing with transparent pricing and instant cloud spools.
            </p>
          </div>
          
          {/* Navigation Links */}
          <div className="space-y-4">
            <h4 className="font-bold text-sm text-emerald-400 uppercase tracking-wider">Navigation</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><button onClick={() => navigate('/')} className="hover:text-emerald-400 transition-colors">Home</button></li>
              <li><button onClick={() => onEnterPortal('student')} className="hover:text-emerald-400 transition-colors">Student Portal</button></li>
              <li><button onClick={() => onEnterPortal('shopkeeper')} className="hover:text-emerald-400 transition-colors">Partner Stores</button></li>
              <li><button onClick={() => onEnterPortal('admin')} className="hover:text-emerald-400 transition-colors">Admin Dashboard</button></li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div className="space-y-4">
            <h4 className="font-bold text-sm text-emerald-400 uppercase tracking-wider">Legal & Support</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><Link to="/terms" className="hover:text-emerald-400 transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/privacy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms#refund" className="hover:text-emerald-400 transition-colors">Refund Policy</Link></li>
              <li className="pt-2">
                <span className="block text-xs font-semibold text-slate-400 mb-1">Contact Us</span>
                <a href="mailto:support@printkardobhaiya.com" className="text-emerald-400 hover:underline">support@printkardobhaiya.com</a>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-4">
            <h4 className="font-bold text-sm text-emerald-400 uppercase tracking-wider">Keep Updated</h4>
            {!subscribed ? (
              <form onSubmit={handleSubscribe} className="flex flex-col gap-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500 text-white placeholder-slate-500"
                  required
                />
                <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold rounded-lg text-sm transition-colors">
                  Subscribe
                </button>
              </form>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-lg text-sm font-medium">
                🎉 Thank you for subscribing!
              </div>
            )}
          </div>

        </div>
        
        {/* Bottom Section */}
        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <p>&copy; {new Date().getFullYear()} Print Kar Do Bhaiya. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" /> for Campus Students
          </p>
        </div>
      </div>
    </footer>
  );
}

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Printer, 
  Bell, 
  Shield, 
  BookOpen, 
  Store, 
  User as UserIcon, 
  LogOut, 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar({ currentUser, onLogout }) {
  const navigate = useNavigate();
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifications, setNotifications] = useState([]); // Real app would fetch this

  const handleLogoutClick = () => {
    onLogout();
    navigate('/');
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const roleLabels = {
    student: {
      label: 'Student Portal',
      icon: <BookOpen className="w-4 h-4" />,
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      path: '/student/dashboard'
    },
    shopkeeper: {
      label: 'Shop Portal',
      icon: <Store className="w-4 h-4" />,
      color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
      path: '/shop/dashboard'
    },
    admin: {
      label: 'Super Admin',
      icon: <Shield className="w-4 h-4" />,
      color: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
      path: '/admin/dashboard'
    },
  };

  return (
    <nav className="glass-light sticky top-4 z-50 px-6 py-3 flex items-center justify-between gap-4 w-full max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 rounded-2xl mb-8">
      {/* Brand Logo */}
      <Link 
        to="/"
        className="flex items-center gap-3 text-left focus:outline-none select-none group hover:opacity-90"
      >
        <div className="p-2 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-xl text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
          <Printer className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <span className="font-extrabold text-xl md:text-2xl tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent flex items-center gap-1">
            PrintKarDoBhaiya
          </span>
        </div>
      </Link>

      {/* Center Role Navigation (Visible only when logged in) */}
      {currentUser && (
        <div className="hidden md:flex bg-slate-100/60 p-1.5 rounded-xl border border-white/50 gap-1">
          {Object.keys(roleLabels).map(role => {
            if (currentUser.role !== role && role === 'admin') return null; // hide admin unless admin
            if (currentUser.role !== role && currentUser.role !== 'admin') return null; // hide other portals for standard users unless they want to see it, but let's restrict to just their role for now.
            // Actually just show the link for their role:
            if (currentUser.role !== role) return null;
            
            const config = roleLabels[role];
            return (
              <Link
                key={role}
                to={config.path}
                className="bg-white text-indigo-600 shadow-sm border border-slate-100 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all duration-300"
              >
                {config.icon}
                {config.label}
              </Link>
            );
          })}
        </div>
      )}

      {/* Right Side Options & Notifications */}
      <div className="flex items-center gap-2.5">
        
        {!currentUser && (
          <div className="flex gap-2">
            <Link to="/auth?mode=login" className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors">Log In</Link>
            <Link to="/auth?mode=register" className="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-colors">Sign Up</Link>
          </div>
        )}

        {/* Current Active Role Badge */}
        {currentUser && (
          <div className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold ${roleLabels[currentUser.role]?.color}`}>
            <UserIcon className="w-3.5 h-3.5" />
            <span>{currentUser.name ? currentUser.name.split(' ')[0] : currentUser.email.split('@')[0]}</span>
          </div>
        )}

        {/* Notifications Button */}
        {currentUser && (
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="p-2.5 hover:bg-slate-50 rounded-xl border border-slate-100 relative transition-all duration-300"
            >
              <Bell className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        )}

        {/* Secure Logout / Sign Out Button */}
        {currentUser && (
          <button
            onClick={handleLogoutClick}
            className="p-2.5 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl border border-slate-100 hover:border-rose-100 transition-all duration-300"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </nav>
  );
}

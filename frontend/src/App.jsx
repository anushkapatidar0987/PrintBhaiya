import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import Auth from './pages/Auth';
import StudentDashboard from './pages/StudentDashboard';
import NewOrder from './pages/NewOrder';
import ShopDashboard from './pages/ShopDashboard';
import SuperAdmin from './pages/SuperAdmin';
import SuperAdminEntry from './pages/SuperAdminEntry';
import { authService } from './services/api';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('access_token');
      const savedUser = localStorage.getItem('user');
      
      if (token && savedUser) {
        try {
          // Verify token is still valid
          const response = await authService.getMe();
          // Normalize role name to match existing frontend expectations
          const user = response.data;
          let role = 'student';
          if (user.role === 'SHOP_OWNER') role = 'shopkeeper';
          if (user.role === 'SUPER_ADMIN') role = 'admin';
          
          setCurrentUser({ ...user, role });
        } catch (error) {
          console.error('Session invalid', error);
          handleLogout();
        }
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  const handleLoginSuccess = (user) => {
    // role is already normalized in Auth.jsx
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setCurrentUser(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'var(--font-sans)' }}>
        <h2>Loading PrintKarDoBhaiya...</h2>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Navbar currentUser={currentUser} onLogout={handleLogout} />
      
      <main>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route 
            path="/auth" 
            element={
              currentUser ? (
                currentUser.role === 'student' ? (
                  <Navigate to="/student/dashboard" replace />
                ) : currentUser.role === 'shopkeeper' ? (
                  <Navigate to="/shop/dashboard" replace />
                ) : (
                  <Navigate to="/superadmin" replace />
                )
              ) : (
                <Auth onLoginSuccess={handleLoginSuccess} />
              )
            } 
          />

          {/* Student Protected Routes */}
          <Route 
            path="/student/dashboard" 
            element={
              currentUser && currentUser.role === 'student' ? (
                <StudentDashboard currentUser={currentUser} />
              ) : (
                <Navigate to="/auth?mode=login" replace />
              )
            } 
          />
          <Route 
            path="/student/new-order" 
            element={
              currentUser && currentUser.role === 'student' ? (
                <NewOrder currentUser={currentUser} />
              ) : (
                <Navigate to="/auth?mode=login" replace />
              )
            } 
          />

          {/* Shopkeeper Protected Routes */}
          <Route 
            path="/shop/dashboard" 
            element={
              currentUser && currentUser.role === 'shopkeeper' ? (
                <ShopDashboard currentUser={currentUser} />
              ) : (
                <Navigate to="/auth?mode=login" replace />
              )
            } 
          />

          {/* Super Admin Protected Route & Login */}
          <Route 
            path="/superadmin" 
            element={
              <SuperAdminEntry 
                currentUser={currentUser} 
                onLoginSuccess={handleLoginSuccess} 
              />
            } 
          />

          {/* Redirect old admin dashboard just in case */}
          <Route path="/admin/dashboard" element={<Navigate to="/superadmin" replace />} />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
    </BrowserRouter>
  );
}

export default App;

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
import { mockDb } from './services/mockDb';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user session exists on mount
    const user = mockDb.getCurrentUser();
    setCurrentUser(user);
    setLoading(false);
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
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
                  <Navigate to="/admin/dashboard" replace />
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

          {/* Super Admin Protected Routes */}
          <Route 
            path="/admin/dashboard" 
            element={
              currentUser && currentUser.role === 'admin' ? (
                <SuperAdmin />
              ) : (
                <Navigate to="/auth?mode=login" replace />
              )
            } 
          />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
    </BrowserRouter>
  );
}

export default App;

import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';

const CORE_VISUAL_ASSETS = [
  '/assets/images/oliveal-logo.png',
  '/assets/images/hero-controller.png',
  '/assets/images/ps5-station.png',
  '/assets/images/racing-simulator.png',
];

// Keep decoded Image objects pinned in memory so mobile browsers never re-decode across routes
const preloadedImages = [];

export default function App() {
  useEffect(() => {
    if (preloadedImages.length > 0) return;
    CORE_VISUAL_ASSETS.forEach((src) => {
      const img = new Image();
      img.src = src;
      if (typeof img.decode === 'function') {
        img.decode().catch(() => {});
      }
      preloadedImages.push(img);
    });
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-[#07060e] text-white selection:bg-purple-500 selection:text-white">
          <AppRoutes />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

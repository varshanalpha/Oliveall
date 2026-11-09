import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#07060e] text-white selection:bg-purple-500 selection:text-white">
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}


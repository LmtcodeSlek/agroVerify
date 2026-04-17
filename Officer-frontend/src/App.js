import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RegisterFarmer from './pages/RegisterFarmer';
import MyFarmers from './pages/MyFarmers';
import Distribution from './pages/Distribution';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

import Layout from './components/Layout';
import AuthLayout from './components/AuthLayout';
import { WalletProvider } from './context/WalletContext';

import './App.css';

function App() {
  return (
    <Router>
      <WalletProvider>
        <Toaster position="top-center" />
        <Routes>
          <Route path="/" element={<AuthLayout />}>
            <Route index element={<Login />} />
          </Route>
          <Route path="/app" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="register" element={<RegisterFarmer />} />
            <Route path="farmers" element={<MyFarmers />} />
            <Route path="distribution" element={<Distribution />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </WalletProvider>
    </Router>
  );
}

export default App;

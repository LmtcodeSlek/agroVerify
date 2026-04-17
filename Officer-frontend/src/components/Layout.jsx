import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import useWallet from '../hooks/useWallet';

const Layout = () => {
  const { walletConnected } = useWallet();
  const location = useLocation();
  const hideBottomNav = location.pathname.startsWith('/app/settings');

  if (!walletConnected) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="app-shell">
      <div className="phone">
        <Outlet />
        {!hideBottomNav && <BottomNav />}
      </div>
    </div>
  );
};

export default Layout;

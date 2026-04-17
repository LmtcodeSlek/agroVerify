import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="app-shell">
      <div className="phone">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;

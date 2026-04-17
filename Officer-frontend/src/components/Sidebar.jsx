import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiHome, FiUserPlus, FiUsers, FiTruck } from 'react-icons/fi';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">AF</div>
        <div>
          <div className="brand-title">AgroVerify</div>
          <div className="brand-subtitle">Officer Portal</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/app" end className="sidebar-link">
          <FiHome />
          Dashboard
        </NavLink>
        <NavLink to="/app/register" className="sidebar-link">
          <FiUserPlus />
          Register Farmer
        </NavLink>
        <NavLink to="/app/farmers" className="sidebar-link">
          <FiUsers />
          My Farmers
        </NavLink>
        <NavLink to="/app/distribution" className="sidebar-link">
          <FiTruck />
          Distribution
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="status-pill">Officer Access</div>
        <div className="small-muted">Secure Agricultural Management</div>
      </div>
    </aside>
  );
};

export default Sidebar;

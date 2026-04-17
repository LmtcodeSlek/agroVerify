import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiHome, FiEdit, FiUsers, FiBox, FiBarChart2 } from 'react-icons/fi';

const linkClass = ({ isActive }) => `nav-tab${isActive ? ' active' : ''}`;

const BottomNav = () => {
  return (
    <nav className="bottom-nav">
      <NavLink to="/app" end className={linkClass}>
        <FiHome className="tab-icon" />
        Home
      </NavLink>
      <NavLink to="/app/register" className={linkClass}>
        <FiEdit className="tab-icon" />
        Register
      </NavLink>
      <NavLink to="/app/farmers" className={linkClass}>
        <FiUsers className="tab-icon" />
        My Farmers
      </NavLink>
      <NavLink to="/app/distribution" className={linkClass}>
        <FiBox className="tab-icon" />
        Distribution
      </NavLink>
      <NavLink to="/app/reports" className={linkClass}>
        <FiBarChart2 className="tab-icon" />
        Reports
      </NavLink>
    </nav>
  );
};

export default BottomNav;

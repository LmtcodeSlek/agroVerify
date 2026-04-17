import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser } from 'react-icons/fi';
import useWallet from '../hooks/useWallet';

const Topbar = ({ title, subtitle }) => {
  const navigate = useNavigate();
  const { officer } = useWallet();

  return (
    <div className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        <div className="topbar-subtitle">{subtitle}</div>
      </div>
      <button type="button" className="officer-badge" onClick={() => navigate('/app/settings')}>
        <div className="avatar-sm">
          <FiUser />
        </div>
        {officer?.name?.split(' ')[0] || 'Officer'}
      </button>
    </div>
  );
};

export default Topbar;

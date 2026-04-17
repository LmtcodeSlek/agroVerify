import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useWallet from '../hooks/useWallet';

const Settings = () => {
  const { officer, address, disconnectWallet, updateOfficer } = useWallet();
  const navigate = useNavigate();
  const [statusNote, setStatusNote] = useState('');
  const [statusBusy, setStatusBusy] = useState(false);

  const isSleeping = officer?.status === 'sleep' || officer?.status === 'sleeping';
  const statusLabel = isSleeping ? 'Sleeping (Not in field)' : 'In Field';
  const statusBadgeClass = isSleeping ? 'badge-orange' : 'badge-green';

  const handleToggleStatus = async () => {
    const nextStatus = isSleeping ? 'active' : 'sleep';
    setStatusBusy(true);
    setStatusNote('');
    updateOfficer({ status: nextStatus });
    setStatusBusy(false);
    setStatusNote(nextStatus === 'sleep'
      ? 'Status updated locally for this wallet session.'
      : 'Officer is back in the field.');
  };

  const handleLogout = () => {
    disconnectWallet();
    navigate('/', { replace: true });
  };

  return (
    <div className="scroll-content">
      <div className="page-top">
        <button type="button" className="back-btn" onClick={() => navigate(-1)}>
          Back
        </button>
        <div className="page-title">Settings</div>
      </div>

      <div className="card">
        <div className="card-title">Officer Profile</div>
        <div className="info-row">
          <span className="info-row-label">Name</span>
          <span className="info-row-value">{officer?.name}</span>
        </div>
        <div className="info-row">
          <span className="info-row-label">Officer ID</span>
          <span className="info-row-value">{officer?.id}</span>
        </div>
        <div className="info-row">
          <span className="info-row-label">Status</span>
          <span className={`badge ${statusBadgeClass}`}>{statusLabel}</span>
        </div>
        <div className="info-row">
          <span className="info-row-label">Wallet</span>
          <span className="info-row-value mono">{address || 'Not Connected'}</span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Field Status</div>
        <div className="info-row">
          <span className="info-row-label">Current Status</span>
          <span className={`badge ${statusBadgeClass}`}>{statusLabel}</span>
        </div>
        {statusNote && <div className="status-note">{statusNote}</div>}
        <button
          type="button"
          className={`btn-full ${isSleeping ? 'btn-green' : 'btn-outline'}`}
          onClick={handleToggleStatus}
          disabled={statusBusy}
        >
          {statusBusy ? 'Updating...' : isSleeping ? 'Return to Field' : 'Go to Sleep'}
        </button>
      </div>

      <div className="card">
        <div className="card-title">Authentication</div>
        <div className="status-note">This app now uses MetaMask only. Password-based backend login has been removed.</div>
      </div>

      <button type="button" className="btn-full btn-outline" onClick={handleLogout}>
        Disconnect Wallet
      </button>
    </div>
  );
};

export default Settings;

import React from 'react';
import { FiPhone, FiMapPin } from 'react-icons/fi';

const FarmerCard = ({ farmer }) => {
  if (!farmer) return null;

  return (
    <div className="farmer-card">
      <div className="farmer-card-header">
        <div>
          <div className="farmer-name">{farmer.name}</div>
          <div className="farmer-nrc">NRC: {farmer.maskedNrc || farmer.nrc || 'N/A'}</div>
        </div>
        <span className={`status-badge status-${farmer.status}`}>{farmer.status}</span>
      </div>
      <div className="farmer-card-body">
        <div className="farmer-meta">
          <FiPhone />
          {farmer.phone || 'N/A'}
        </div>
        <div className="farmer-meta">
          <FiMapPin />
          {farmer.village || 'Unknown'}
        </div>
        <div className="farmer-meta">Crop: {farmer.crop || 'N/A'}</div>
        <div className="farmer-meta">Registered Bags: {farmer.bags || 0}</div>
        {farmer.collectedBags ? (
          <div className="farmer-meta">Collected Bags: {farmer.collectedBags}</div>
        ) : null}
      </div>
      <div className="farmer-card-footer">
        <div className="small-muted">Registered: {farmer.createdAt?.slice(0, 10)}</div>
        <div className="small-muted">Zone: {farmer.officerZone}</div>
      </div>
    </div>
  );
};

export default FarmerCard;

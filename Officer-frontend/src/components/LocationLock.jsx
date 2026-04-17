import React from 'react';
import { FiLock } from 'react-icons/fi';

const LocationLock = ({ province, district }) => {
  return (
    <div className="location-lock">
      <FiLock />
      <div>
        <div className="location-label">Locked Location</div>
        <div className="location-value">{province} • {district}</div>
      </div>
    </div>
  );
};

export default LocationLock;

import React, { useState } from 'react';
import Topbar from '../components/Topbar';
import useContract from '../hooks/useContract';
import { getReadableLocationName } from '../utils/location';

const Distribution = () => {
  const { findFarmer, confirmCollection } = useContract();
  const [query, setQuery] = useState('');
  const [farmer, setFarmer] = useState(null);
  const [tx, setTx] = useState(null);
  const [searchNote, setSearchNote] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSearch = async () => {
    const normalized = query.trim();
    if (!normalized) {
      setFarmer(null);
      setSearchNote('Enter NRC or Farmer ID before searching.');
      setActionNote('');
      setTx(null);
      return;
    }

    const found = await findFarmer(normalized);
    setFarmer(found);
    setTx(null);
    setSearchNote(found ? '' : 'No farmer found for that NRC/Farmer ID.');
  };

  const handleConfirm = async () => {
    if (!farmer || farmer.collectionStatus === 'collected' || submitting) return;
    setSubmitting(true);
    setActionNote('');
    try {
      const result = await confirmCollection({ farmerId: farmer.id, farmer });
      setTx(result);
      setFarmer({
        ...farmer,
        collectionStatus: 'collected',
        collectedAt: new Date().toISOString(),
        collectedBags: Number(farmer.bagsAllocated || 0),
      });
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setActionNote(typeof detail === 'string' ? detail : (error?.message || 'Unable to confirm collection right now.'));
    } finally {
      setSubmitting(false);
    }
  };

  const canConfirm = farmer && farmer.approvalStatus === 'approved' && farmer.collectionStatus !== 'collected' && !submitting;

  return (
    <div className="scroll-content">
      <Topbar title="Record Collection" subtitle="Search · Verify · Confirm" />

      <div className="card">
        <div className="card-title">Find Farmer</div>
        <div className="search-box">
          <input
            type="text"
            placeholder="Enter NRC or Farmer ID..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="form-row">
          <button className="btn-full btn-green" type="button" onClick={handleSearch}>Search</button>
          <button className="btn-full btn-outline" type="button">Scan QR</button>
        </div>
      </div>

      {farmer ? (
        <div className="dist-result">
          <div className="dist-result-header">
            <div className="dist-farmer-avatar">{farmer.initials}</div>
            <div>
              <div className="dist-farmer-name">{farmer.name}</div>
              <div className="dist-farmer-meta">{farmer.farmerId} · Registered by you · {farmer.createdAt?.slice(0, 10)}</div>
            </div>
          </div>
          <div className="dist-body">
            <div className="info-row">
              <span className="info-row-label">NRC</span>
              <span className="info-row-value mono">{farmer.maskedNrc || 'Hidden'}</span>
            </div>
            <div className="info-row">
              <span className="info-row-label">Location</span>
              <span className="info-row-value">{getReadableLocationName(farmer) || 'Location pending'}</span>
            </div>
            <div className="info-row">
              <span className="info-row-label">Farm Size</span>
              <span className="info-row-value">{farmer.farmSize} Hectares</span>
            </div>
            <div className="info-row">
              <span className="info-row-label">Approval Status</span>
              <span className={`badge ${farmer.approvalStatus === 'approved' ? 'badge-green' : 'badge-yellow'}`}>
                {farmer.approvalStatus}
              </span>
            </div>
            <div className="info-row">
              <span className="info-row-label">Bags Allocated</span>
              <span className="info-row-value large">{farmer.bagsAllocated} Bags</span>
            </div>
            <div className="info-row">
              <span className="info-row-label">Collection Status</span>
              <span className={`badge ${farmer.collectionStatus === 'collected' ? 'badge-green' : 'badge-orange'}`}>
                {farmer.collectionStatus === 'collected' ? 'Collected' : 'Not Yet Collected'}
              </span>
            </div>
          </div>
          <div className="dist-actions">
            <div className="warning-box">
              <div className="warning-title">Confirm before proceeding:</div>
              <div>• Farmer is physically present</div>
              <div>• NRC matches the farmer</div>
              <div>• Bags counted and verified</div>
            </div>
            <button className="btn-full btn-green" type="button" onClick={handleConfirm} disabled={!canConfirm}>
              {farmer.collectionStatus === 'collected' ? 'Already Collected' : submitting ? 'Confirming...' : 'Confirm Collection'}
            </button>
            {farmer.approvalStatus !== 'approved' ? (
              <div className="helper-text">This farmer must be approved before collection can be confirmed.</div>
            ) : null}
            <div className="helper-text">Action will be logged with your ID, timestamp and location. Cannot be undone.</div>
          </div>
        </div>
      ) : (
        <div className="empty-state">Search a farmer by NRC or Farmer ID to confirm collection.</div>
      )}

      {searchNote ? <div className="status-note error">{searchNote}</div> : null}
      {actionNote ? <div className="status-note error">{actionNote}</div> : null}

      {tx ? (
        <div className="tx-card">Transaction submitted: {tx.hash}</div>
      ) : null}
    </div>
  );
};

export default Distribution;

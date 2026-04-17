import React, { useMemo, useState } from 'react';
import Topbar from '../components/Topbar';
import useContract from '../hooks/useContract';
import useWallet from '../hooks/useWallet';
import { getReadableLocationName } from '../utils/location';

const filterOptions = [
  { key: 'all', label: 'All' },
  { key: 'approved', label: 'Approved' },
  { key: 'pending', label: 'Pending' },
  { key: 'collected', label: 'Collected' },
];

const MyFarmers = () => {
  const { getFarmers, loadingFarmers } = useContract();
  const { officer } = useWallet();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const farmers = getFarmers();

  const counts = useMemo(() => ({
    all: farmers.length,
    approved: farmers.filter((farmer) => farmer.approvalStatus === 'approved').length,
    pending: farmers.filter((farmer) => farmer.approvalStatus === 'pending').length,
    collected: farmers.filter((farmer) => farmer.collectionStatus === 'collected').length,
  }), [farmers]);

  const filtered = useMemo(() => {
    let list = farmers;
    if (filter === 'approved') list = list.filter((farmer) => farmer.approvalStatus === 'approved');
    if (filter === 'pending') list = list.filter((farmer) => farmer.approvalStatus === 'pending');
    if (filter === 'collected') list = list.filter((farmer) => farmer.collectionStatus === 'collected');

    if (!query) return list;
    const normalized = query.toLowerCase();
    return list.filter((farmer) => (
      farmer.name?.toLowerCase().includes(normalized)
      || farmer.nrc?.toLowerCase().includes(normalized)
      || farmer.farmerId?.toLowerCase().includes(normalized)
    ));
  }, [farmers, query, filter]);

  return (
    <div className="scroll-content">
      <Topbar title="My Farmers" subtitle={`${officer?.ward || officer?.district || 'Assigned area'} · ${farmers.length} registered`} />

      <div className="search-box">
        <input
          type="text"
          placeholder="Search by name, NRC or ID..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="filter-chips">
        {filterOptions.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`chip ${filter === item.key ? 'active' : ''}`}
            onClick={() => setFilter(item.key)}
          >
            {item.label} ({counts[item.key]})
          </button>
        ))}
      </div>

      <div className="farmer-list">
        {loadingFarmers ? (
          <div className="empty-state">Loading farmers...</div>
        ) : filtered.length ? (
          filtered.map((farmer) => (
            <div className="farmer-item" key={farmer.id}>
              <div className="farmer-initials">{farmer.initials}</div>
              <div className="farmer-info">
                <div className="farmer-name">{farmer.name}</div>
                <div className="farmer-id">{farmer.farmerId} · {farmer.maskedNrc || 'Hidden'}</div>
                <div className="farmer-meta">{getReadableLocationName(farmer) || 'Location pending'} · {farmer.farmSize} ha</div>
              </div>
              <div className="farmer-status">
                <span className={`badge ${farmer.collectionStatus === 'collected' ? 'badge-green' : farmer.approvalStatus === 'pending' ? 'badge-yellow' : 'badge-orange'}`}>
                  {farmer.collectionStatus === 'collected' ? 'Collected' : farmer.approvalStatus === 'pending' ? 'Pending' : 'Not Yet'}
                </span>
                <div className="farmer-date">{farmer.createdAt?.slice(0, 10)}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">No farmers found yet.</div>
        )}
      </div>
    </div>
  );
};

export default MyFarmers;

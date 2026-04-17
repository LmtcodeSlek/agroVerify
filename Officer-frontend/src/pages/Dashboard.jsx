import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiClock, FiCheckCircle, FiBox } from 'react-icons/fi';
import Topbar from '../components/Topbar';
import useContract from '../hooks/useContract';
import useWallet from '../hooks/useWallet';

const Dashboard = () => {
  const navigate = useNavigate();
  const { getStats, getDistributionWindow, loadingFarmers, contractError } = useContract();
  const { officer } = useWallet();
  const stats = getStats();
  const windowData = getDistributionWindow();

  const windowBadgeClass = windowData.status === 'open'
    ? 'badge-green'
    : windowData.status === 'upcoming'
      ? 'badge-yellow'
      : 'badge-orange';
  const windowBadgeLabel = windowData.status === 'open'
    ? 'OPEN'
    : windowData.status === 'upcoming'
      ? 'UPCOMING'
      : 'CLOSED';

  return (
    <div className="scroll-content">
      <Topbar title={`Good Morning, ${officer?.name?.split(' ')[0] || 'Officer'}`} subtitle={windowData.todayLabel} />

      <div className="loc-strip">
        <div className="loc-strip-icon">LOC</div>
        <div>
          <div className="loc-strip-title">{officer?.ward || officer?.district || 'Assigned Area'} · {officer?.village || 'Village'}</div>
          <div className="loc-strip-sub">{officer?.province || 'Province'} · {officer?.district || 'District'} · Locked</div>
        </div>
      </div>

      {contractError ? (
        <div className="status-note error">{contractError}</div>
      ) : null}

      <div className="stat-grid">
        <div className="stat-box">
          <FiUsers className="stat-icon" />
          <div className="stat-val">{loadingFarmers ? '...' : stats.total}</div>
          <div className="stat-lbl">My Registered Farmers</div>
        </div>
        <div className="stat-box">
          <FiClock className="stat-icon" />
          <div className="stat-val warning">{loadingFarmers ? '...' : stats.pendingApproval}</div>
          <div className="stat-lbl">Pending Approval</div>
        </div>
        <div className="stat-box">
          <FiCheckCircle className="stat-icon" />
          <div className="stat-val success">{loadingFarmers ? '...' : stats.collectedToday}</div>
          <div className="stat-lbl">Collected Today</div>
        </div>
        <div className="stat-box">
          <FiBox className="stat-icon" />
          <div className="stat-val danger">{loadingFarmers ? '...' : stats.pendingCollection}</div>
          <div className="stat-lbl">Pending Collection</div>
        </div>
      </div>

      <div className="schedule-strip">
        <div className="schedule-strip-header">
          <div className="schedule-strip-title">Active Distribution Window</div>
          <span className={`badge ${windowBadgeClass}`}>{windowBadgeLabel}</span>
        </div>
        <div className="schedule-date">{windowData.rangeLabel}</div>
        <div className="schedule-sub">{officer?.ward || officer?.district || 'Area'} · {windowData.daysRemaining} days remaining</div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${windowData.progress}%` }} />
        </div>
        <div className="schedule-footer">
          <span>{stats.collectedTotal} collected</span>
          <span>{windowData.eligibleFarmers || stats.total} eligible</span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Quick Actions</div>
        <button className="btn-full btn-green" type="button" onClick={() => navigate('/app/register')}>
          + Register New Farmer
        </button>
        <button className="btn-full btn-outline" type="button" onClick={() => navigate('/app/distribution')}>
          Record Collection
        </button>
      </div>
    </div>
  );
};

export default Dashboard;

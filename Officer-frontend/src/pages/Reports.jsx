import React, { useMemo } from 'react';
import { format, startOfMonth } from 'date-fns';
import Topbar from '../components/Topbar';
import useContract from '../hooks/useContract';
import useWallet from '../hooks/useWallet';

const Reports = () => {
  const { getStats, getWeeklyCollectionTrend, loadingFarmers } = useContract();
  const { officer } = useWallet();
  const stats = getStats();
  const chart = getWeeklyCollectionTrend();

  const maxValue = useMemo(() => {
    const max = Math.max(...chart.map((item) => item.value), 0);
    return max || 1;
  }, [chart]);

  const periodLabel = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    return format(monthStart, 'MMMM yyyy');
  }, []);

  return (
    <div className="scroll-content">
      <Topbar title="My Reports" subtitle="Your activity summary" />

      <div className="loc-strip">
        <div className="loc-strip-icon">REP</div>
        <div>
          <div className="loc-strip-title">{periodLabel} Summary</div>
          <div className="loc-strip-sub">{officer?.ward || officer?.district || 'Assigned area'} · Updated now</div>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-box">
          <div className="stat-val">{loadingFarmers ? '...' : stats.total}</div>
          <div className="stat-lbl">Total Registered</div>
        </div>
        <div className="stat-box">
          <div className="stat-val success">{loadingFarmers ? '...' : stats.approved}</div>
          <div className="stat-lbl">Approved</div>
        </div>
        <div className="stat-box">
          <div className="stat-val success">{loadingFarmers ? '...' : stats.bagsDistributed}</div>
          <div className="stat-lbl">Bags Distributed</div>
        </div>
        <div className="stat-box">
          <div className="stat-val danger">{loadingFarmers ? '...' : stats.pendingCollection}</div>
          <div className="stat-lbl">Still Pending</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Collections This Week</div>
        <div className="card-sub">Daily distribution count</div>
        <div className="chart-bar">
          {chart.map((item, index) => (
            <div
              key={String(index)}
              className={`bar ${isToday(item.date) ? 'today' : item.value === 0 ? 'dim' : ''}`}
              style={{ height: `${Math.max(8, (item.value / maxValue) * 100)}%` }}
              title={`${item.label}: ${item.value}`}
            />
          ))}
        </div>
        <div className="bar-labels">
          {chart.map((item) => (
            <div key={item.label} className={`bar-label ${isToday(item.date) ? 'highlight' : ''}`}>{item.label}</div>
          ))}
        </div>
      </div>

      <div className="report-item">
        <div className="report-icon-box green">REP</div>
        <div>
          <div className="report-title">Registration Report</div>
          <div className="report-sub">{stats.total} farmers · {periodLabel}</div>
        </div>
        <div className="report-link">Live</div>
      </div>

      <div className="report-item">
        <div className="report-icon-box blue">DST</div>
        <div>
          <div className="report-title">Distribution Report</div>
          <div className="report-sub">{stats.collectedTotal} collected · {stats.pendingCollection} pending</div>
        </div>
        <div className="report-link">Live</div>
      </div>

      <div className="report-item">
        <div className="report-icon-box yellow">LOG</div>
        <div>
          <div className="report-title">My Activity Log</div>
          <div className="report-sub">{stats.collectedToday} collections today</div>
        </div>
        <div className="report-link">Live</div>
      </div>
    </div>
  );
};

const isToday = (date) => {
  if (!(date instanceof Date)) return false;
  const now = new Date();
  return date.toDateString() === now.toDateString();
};

export default Reports;

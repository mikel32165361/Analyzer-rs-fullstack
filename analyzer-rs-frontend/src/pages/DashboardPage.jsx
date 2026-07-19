import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEncounters, getTransactions, getDashboardSummary } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const [encounters, setEncounters] = useState([]);
  const [totalEncounters, setTotalEncounters] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [approvalRate, setApprovalRate] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [riskCount, setRiskCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [encRes, txRes] = await Promise.all([
          getEncounters({ page: 1, limit: 8 }),
          getTransactions({ page: 1, limit: 10 }),
        ]);
        const encData = encRes.data?.data;
        setEncounters(encData?.rows || []);
        setTotalEncounters(encData?.totalRecords || 0);

        const txData = txRes.data?.data;
        const txList = txData?.data || [];
        setTransactions(txList);
        setTotalTransactions(txData?.pagination?.totalItems || 0);

        // Compute approval rate
        const approved = txList.filter(t => t.status === 'approved').length;
        const total = txList.length;
        setApprovalRate(total > 0 ? Math.round((approved / total) * 100) : 100);
        setPendingCount(txList.filter(t => t.status === 'pending').length);
        setRiskCount(txList.filter(t => (t.profit_amount || 0) < 0).length);

        // Try dashboard summary API
        try {
          const summRes = await getDashboardSummary();
          const summData = summRes.data?.data;
          if (summData) {
            if (summData.approvalRate) setApprovalRate(summData.approvalRate);
            if (summData.pendingCount) setPendingCount(summData.pendingCount);
          }
        } catch { /* API may not exist yet, use computed values */ }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = [
    { icon: '👥', label: 'Total Pasien', value: totalEncounters.toLocaleString(), grad: 'grad-blue', badge: '↑ Data encounter aktif' },
    { icon: '✅', label: 'Approval Rate', value: `${approvalRate}%`, grad: 'grad-green', badge: 'Klaim disetujui' },
    { icon: '⏳', label: 'Pending Review', value: pendingCount.toString(), grad: 'grad-amber', badge: 'Perlu validasi' },
    { icon: '🔴', label: 'Risk Alert', value: riskCount.toString(), grad: 'grad-red', badge: 'Profit negatif' },
  ];

  const serviceTypeBadge = (type) => {
    if (!type) return <span className="badge badge-gray">-</span>;
    return type.toLowerCase().includes('inap')
      ? <span className="badge badge-blue">Rawat Inap</span>
      : <span className="badge badge-green">Rawat Jalan</span>;
  };

  return (
    <div className="fade-in">
      {/* Welcome */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
          Selamat datang, {user?.name || user?.username} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          {user?.hospital?.name || 'Analyzer RS'} &mdash; {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Gradient Stat Cards */}
      <div className="grid-cols-4" style={{ marginBottom: 20 }}>
        {stats.map((s, i) => (
          <div className={`stat-card-grad ${s.grad}`} key={i}>
            <div className="stat-grad-icon">{s.icon}</div>
            <div className="stat-grad-badge">{s.badge}</div>
            <div className="stat-grad-val">{s.value}</div>
            <div className="stat-grad-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="btn btn-primary" onClick={() => navigate('/new-analysis')}>
          📝 Buat Analisis Baru
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/transactions')}>
          ⏳ Review Klaim Tertunda
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/encounters')}>
          👥 Lihat Encounters
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent Encounters */}
        <div className="card">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="card-title">👥 Encounter Terbaru</div>
              <div className="card-subtitle">Data pasien terakhir diperiksa</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/encounters')}>
              Lihat Semua →
            </button>
          </div>
          {loading ? (
            <div className="loading-wrap"><div className="spinner" /><span>Memuat data...</span></div>
          ) : encounters.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">Belum ada data encounter</div>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Pasien</th>
                    <th>Keluhan</th>
                    <th>Jenis</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {encounters.slice(0, 5).map((enc) => (
                    <tr key={enc.id} className="table-clickable" onClick={() => navigate(`/encounters/${enc.id}`)}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{enc.patient_name || '—'}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{enc.age} th • {enc.gender}</div>
                      </td>
                      <td style={{ maxWidth: 150, fontSize: 11, color: 'var(--text-secondary)' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {enc.subjective || '—'}
                        </div>
                      </td>
                      <td>{serviceTypeBadge(enc.service_type)}</td>
                      <td>
                        <button className="btn btn-primary btn-sm" style={{ fontSize: 10 }}
                          onClick={(e) => { e.stopPropagation(); navigate(`/validation/${enc.id}`); }}>
                          🔍 Validasi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="card-title">💊 Transaksi Terbaru</div>
              <div className="card-subtitle">Status klaim BPJS</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/transactions')}>
              Lihat Semua →
            </button>
          </div>
          {loading ? (
            <div className="loading-wrap"><div className="spinner" /><span>Memuat data...</span></div>
          ) : transactions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💊</div>
              <div className="empty-state-title">Belum ada transaksi</div>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Pasien</th>
                    <th>Status</th>
                    <th>Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 5).map((tx) => {
                    const profit = tx.profit_amount || ((tx.coverage_amount || 0) - (tx.cost_amount || 0));
                    return (
                      <tr key={tx.id}>
                        <td style={{ fontSize: 12, fontWeight: 600 }}>{tx.patient_name || tx.patient_id || '—'}</td>
                        <td>
                          <span className={`badge ${tx.status === 'approved' ? 'badge-green' : tx.status === 'rejected' ? 'badge-danger' : 'badge-orange'}`}>
                            {tx.status || 'pending'}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, fontWeight: 700, color: profit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                          {profit >= 0 ? '+' : ''}Rp {profit.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

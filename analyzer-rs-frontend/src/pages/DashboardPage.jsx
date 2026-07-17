import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEncounters, getTransactions } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const [encounters, setEncounters] = useState([]);
  const [totalEncounters, setTotalEncounters] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [encRes, txRes] = await Promise.all([
          getEncounters({ page: 1, limit: 8 }),
          getTransactions({ page: 1, limit: 1 }),
        ]);
        const encData = encRes.data?.data;
        setEncounters(encData?.rows || []);
        setTotalEncounters(encData?.totalRecords || 0);
        setTotalTransactions(txRes.data?.data?.pagination?.totalItems || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = [
    { icon: '👥', label: 'Total Pasien', value: totalEncounters.toLocaleString(), color: 'blue', sub: 'Data encounter aktif' },
    { icon: '🤖', label: 'AI Rekomendasi', value: '∞', color: 'purple', sub: 'Siap digunakan' },
    { icon: '💊', label: 'Transaksi BPJS', value: totalTransactions.toLocaleString(), color: 'green', sub: 'Total transaksi' },
    { icon: '🔬', label: 'Kode ICD Tersedia', value: '23.173', color: 'orange', sub: 'ICD-10 & ICD-9-CM' },
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
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
          Selamat datang, {user?.name || user?.username} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          {user?.hospital?.name || 'Analyzer RS'} &mdash; {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map((s, i) => (
          <div className="stat-card" key={i}>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-change up">↑ {s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ gap: 20 }}>
        {/* Recent Encounters */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="card-title">👥 Encounter Terbaru</div>
              <div className="card-subtitle">Data pasien yang terakhir diperiksa</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/encounters')}>
              Lihat Semua →
            </button>
          </div>
          {loading ? (
            <div className="loading-wrap">
              <div className="spinner" />
              <span>Memuat data...</span>
            </div>
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
                    <th>Usia/Gender</th>
                    <th>Keluhan</th>
                    <th>Assessment</th>
                    <th>Jenis</th>
                    <th>Tanggal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {encounters.map((enc) => (
                    <tr key={enc.id} className="table-clickable" onClick={() => navigate(`/encounters/${enc.id}`)}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{enc.patient_name || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {enc.patient_id}</div>
                      </td>
                      <td>
                        <div>{enc.age} th</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{enc.gender}</div>
                      </td>
                      <td style={{ maxWidth: 180 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                          {enc.subjective || '—'}
                        </div>
                      </td>
                      <td style={{ maxWidth: 160 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                          {enc.assesment || '—'}
                        </div>
                      </td>
                      <td>{serviceTypeBadge(enc.service_type)}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {enc.created_at ? new Date(enc.created_at).toLocaleDateString('id-ID') : '—'}
                      </td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/encounters/${enc.id}`); }}>
                          🤖 AI
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

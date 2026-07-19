import { useState, useEffect } from 'react';
import { getTransactions } from '../services/api';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = { page, limit: 15 };
        if (statusFilter !== 'all') params.status = statusFilter;
        const res = await getTransactions(params);
        const d = res.data?.data;
        setTransactions(d?.data || []);
        setTotal(d?.pagination?.totalItems || 0);
        setTotalPages(d?.pagination?.totalPages || 1);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [page, statusFilter]);

  const filters = [
    { key: 'all', label: 'Semua' },
    { key: 'approved', label: '✅ Approved' },
    { key: 'pending', label: '⏳ Pending' },
    { key: 'rejected', label: '❌ Rejected' },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>💊 Transaksi BPJS</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Total {total.toLocaleString()} transaksi BPJS
        </p>
      </div>

      <div className="card">
        <div className="card-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {filters.map(f => (
              <button key={f.key}
                className={`tab-btn ${statusFilter === f.key ? 'active' : ''}`}
                style={{ padding: '4px 12px', fontSize: 11 }}
                onClick={() => { setStatusFilter(f.key); setPage(1); }}>
                {f.label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Hal {page} dari {totalPages}</span>
        </div>

        {loading ? (
          <div className="loading-wrap"><div className="spinner" /><span>Memuat data...</span></div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💊</div>
            <div className="empty-state-title">Belum ada transaksi</div>
            <div className="empty-state-desc">Data transaksi BPJS akan muncul di sini</div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Pasien</th>
                  <th>Diagnosis</th>
                  <th>INACBG</th>
                  <th>Coverage</th>
                  <th>Biaya</th>
                  <th>Profit</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => {
                  const coverage = tx.coverage_amount || 0;
                  const cost = tx.cost_amount || 0;
                  const profit = tx.profit_amount || (coverage - cost);
                  return (
                    <tr key={tx.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(page - 1) * 15 + i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{tx.patient_name || tx.patient_id || '—'}</div>
                      </td>
                      <td style={{ fontSize: 12 }}>{tx.diagnosis || '—'}</td>
                      <td>{tx.inacbg ? <span className="inacbg-tag">{tx.inacbg}</span> : '—'}</td>
                      <td style={{ fontSize: 12, fontWeight: 500 }}>
                        {coverage ? `Rp ${coverage.toLocaleString('id-ID')}` : '—'}
                      </td>
                      <td style={{ fontSize: 12, fontWeight: 500 }}>
                        {cost ? `Rp ${cost.toLocaleString('id-ID')}` : '—'}
                      </td>
                      <td>
                        <span style={{
                          fontSize: 12, fontWeight: 700,
                          color: profit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
                        }}>
                          {profit >= 0 ? '+' : ''}Rp {profit.toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${tx.status === 'approved' ? 'badge-green' : tx.status === 'rejected' ? 'badge-danger' : 'badge-orange'}`}>
                          {tx.status === 'approved' ? '✅' : tx.status === 'rejected' ? '❌' : '⏳'} {tx.status || 'pending'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {tx.created_at ? new Date(tx.created_at).toLocaleDateString('id-ID') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="card-footer" style={{ justifyContent: 'space-between' }}>
            <span className="page-info">{total.toLocaleString()} total transaksi</span>
            <div className="pagination">
              <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const p = Math.max(1, page - 2) + i;
                if (p > totalPages) return null;
                return <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>;
              })}
              <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

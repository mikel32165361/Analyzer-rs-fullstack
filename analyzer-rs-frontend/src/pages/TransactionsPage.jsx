import { useState, useEffect } from 'react';
import { getTransactions } from '../services/api';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await getTransactions({ page, limit: 15 });
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
  }, [page]);

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>💊 Transaksi BPJS</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Total {total.toLocaleString()} transaksi BPJS
        </p>
      </div>

      <div className="card">
        <div className="card-header" style={{ justifyContent: 'space-between' }}>
          <div className="card-title">Daftar Transaksi</div>
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
                  <th>ID Transaksi</th>
                  <th>Pasien</th>
                  <th>Diagnosis</th>
                  <th>Kode INACBG</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <tr key={tx.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(page - 1) * 15 + i + 1}</td>
                    <td><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{tx.id}</span></td>
                    <td>{tx.patient_name || tx.patient_id || '—'}</td>
                    <td>{tx.diagnosis || '—'}</td>
                    <td>{tx.inacbg ? <span className="inacbg-tag">{tx.inacbg}</span> : '—'}</td>
                    <td>
                      <span className={`badge ${tx.status === 'approved' ? 'badge-green' : tx.status === 'pending' ? 'badge-orange' : 'badge-gray'}`}>
                        {tx.status || 'pending'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {tx.created_at ? new Date(tx.created_at).toLocaleDateString('id-ID') : '—'}
                    </td>
                  </tr>
                ))}
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
                const p = i + 1;
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

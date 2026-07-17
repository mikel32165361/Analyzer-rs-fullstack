import { useState, useEffect, useCallback } from 'react';
import { getMrconso } from '../services/api';

export default function ICDSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMrconso({ page, limit: 20, search: query });
      const d = res.data?.data;
      setResults(d?.data || []);
      setTotal(d?.total || 0);
      setTotalPages(d?.totalPages || 1);
      setSearched(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>🔬 Pencarian Kode ICD</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Cari kode ICD-10 dan ICD-9-CM dari database 23.173 kode
        </p>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="search-bar" style={{ maxWidth: '100%', flex: 1 }}>
              <span className="search-icon">🔍</span>
              <input
                id="icd-search"
                placeholder="Cari berdasarkan kode atau nama penyakit... (contoh: diabetes, A15, 00.01)"
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{ width: '100%', padding: '11px 14px 11px 38px', fontSize: 14 }}
              />
            </div>
            <button id="btn-search-icd" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Mencari...</> : '🔍 Cari'}
            </button>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="card">
        <div className="card-header" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="card-title">Hasil Pencarian</div>
            {searched && <div className="card-subtitle">{total.toLocaleString()} hasil ditemukan</div>}
          </div>
          {totalPages > 1 && (
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Hal {page} dari {totalPages.toLocaleString()}</span>
          )}
        </div>

        {loading ? (
          <div className="loading-wrap"><div className="spinner" /><span>Mencari...</span></div>
        ) : results.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">{searched ? '🔍' : '🔬'}</div>
            <div className="empty-state-title">{searched ? 'Tidak ditemukan' : 'Mulai Pencarian'}</div>
            <div className="empty-state-desc">{searched ? 'Coba kata kunci lain' : 'Ketik kode atau nama penyakit di atas'}</div>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Nama (Bahasa Inggris)</th>
                    <th>Nama (Bahasa Indonesia)</th>
                    <th>Rawat Inap</th>
                    <th>Rawat Jalan</th>
                    <th>Kelas</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((item, i) => (
                    <tr key={i}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)' }}>
                          {item.code}
                        </span>
                      </td>
                      <td style={{ maxWidth: 220, fontSize: 12 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.str || '—'}
                        </div>
                      </td>
                      <td style={{ maxWidth: 220, fontSize: 12 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                          {item.str_indo || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>-</span>}
                        </div>
                      </td>
                      <td>
                        {item.inpatient
                          ? <span className="inacbg-tag">{item.inpatient}</span>
                          : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                      </td>
                      <td>
                        {item.outpatient
                          ? <span className="inacbg-tag" style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)', color: 'var(--accent-success)' }}>{item.outpatient}</span>
                          : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                      </td>
                      <td>
                        {item.class
                          ? <span className="badge badge-gray">{item.class}</span>
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="card-footer" style={{ justifyContent: 'space-between' }}>
                <span className="page-info">{total.toLocaleString()} total kode</span>
                <div className="pagination">
                  <button className="page-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
                  <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const p = Math.max(1, page - 2) + i;
                    if (p > totalPages) return null;
                    return <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>;
                  })}
                  <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
                  <button className="page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

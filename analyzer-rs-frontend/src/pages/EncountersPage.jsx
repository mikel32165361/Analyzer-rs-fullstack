import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEncounters } from '../services/api';

export default function EncountersPage() {
  const [encounters, setEncounters] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const limit = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (search) params.search = search;
      const res = await getEncounters(params);
      const d = res.data?.data;
      setEncounters(d?.rows || []);
      setTotal(d?.totalRecords || 0);
      setTotalPages(d?.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const serviceTypeBadge = (type) => {
    if (!type) return <span className="badge badge-gray">-</span>;
    return type.toLowerCase().includes('inap')
      ? <span className="badge badge-blue">Rawat Inap</span>
      : <span className="badge badge-green">Rawat Jalan</span>;
  };

  const pageNumbers = () => {
    const pages = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>👥 Daftar Encounter Pasien</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Total {total.toLocaleString()} pasien tersedia — klik baris untuk generate AI Recommendation
        </p>
      </div>

      <div className="card">
        {/* Toolbar */}
        <div className="card-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="search-bar" style={{ maxWidth: 280 }}>
              <span className="search-icon">🔍</span>
              <input
                id="search-encounters"
                placeholder="Cari pasien..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm">Cari</button>
            {search && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>✕ Reset</button>
            )}
          </form>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Hal {page} dari {totalPages.toLocaleString()}
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="loading-wrap"><div className="spinner" /><span>Memuat data...</span></div>
        ) : encounters.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-title">Tidak ada data ditemukan</div>
            <div className="empty-state-desc">Coba ubah kata kunci pencarian</div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nama Pasien</th>
                  <th>Usia</th>
                  <th>Gender</th>
                  <th>Keluhan Utama</th>
                  <th>Assessment</th>
                  <th>Jenis</th>
                  <th>Tanggal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {encounters.map((enc, idx) => (
                  <tr key={enc.id} className="table-clickable" onClick={() => navigate(`/encounters/${enc.id}`)}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {(page - 1) * limit + idx + 1}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{enc.patient_name || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {enc.patient_id}</div>
                    </td>
                    <td>{enc.age || '—'}</td>
                    <td>
                      <span className={`badge ${enc.gender === 'Perempuan' ? 'badge-purple' : 'badge-blue'}`}>
                        {enc.gender === 'Perempuan' ? '♀' : '♂'} {enc.gender}
                      </span>
                    </td>
                    <td style={{ maxWidth: 200 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {enc.subjective || '—'}
                      </div>
                    </td>
                    <td style={{ maxWidth: 180 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {enc.assesment || '—'}
                      </div>
                    </td>
                    <td>{serviceTypeBadge(enc.service_type)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {enc.created_at ? new Date(enc.created_at).toLocaleDateString('id-ID') : '—'}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(`/validation/${enc.id}`)}
                          style={{ fontSize: 10 }}
                        >
                          🔍 Validasi
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/encounters/${enc.id}`)}
                          style={{ fontSize: 10 }}
                        >
                          🤖 AI
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="card-footer" style={{ justifyContent: 'space-between' }}>
            <span className="page-info">Menampilkan {encounters.length} dari {total.toLocaleString()} data</span>
            <div className="pagination">
              <button className="page-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
              <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
              {pageNumbers().map(p => (
                <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>
                  {p}
                </button>
              ))}
              <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
              <button className="page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

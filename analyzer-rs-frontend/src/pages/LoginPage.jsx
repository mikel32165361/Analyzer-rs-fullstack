import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(form);
      loginUser(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal. Periksa username dan password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <div className="login-logo-icon">🏥</div>
          <h1 className="login-title">Analyzer RS</h1>
          <p className="login-subtitle">Sistem Pendukung Keputusan Klinis Berbasis AI</p>
        </div>

        <div className="login-card fade-in">
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>Masuk ke Akun</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Gunakan kredensial yang diberikan oleh administrator
          </p>

          {error && <div className="login-error">⚠️ {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <div className="input-icon-wrap">
                <span className="input-icon">👤</span>
                <input
                  id="username"
                  className="form-input"
                  type="text"
                  placeholder="Masukkan username"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-icon-wrap">
                <span className="input-icon">🔒</span>
                <input
                  id="password"
                  className="form-input"
                  type="password"
                  placeholder="Masukkan password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
            </div>

            <button
              id="btn-login"
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Memproses...
                </>
              ) : '🔑 Masuk'}
            </button>
          </form>

          <div style={{ marginTop: 24, padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Demo Credentials</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>👤 <strong>admin</strong> &nbsp;/&nbsp; 🔒 <strong>Admin@1234</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EncountersPage from './pages/EncountersPage';
import RecommendationPage from './pages/RecommendationPage';
import TransactionsPage from './pages/TransactionsPage';
import ICDSearchPage from './pages/ICDSearchPage';
import './index.css';

function PrivateRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return (
    <div className="loading-wrap" style={{ minHeight: '100vh' }}>
      <div className="spinner" />
    </div>
  );
  return token ? children : <Navigate to="/login" replace />;
}

function Sidebar() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: '📊', label: 'Dashboard', end: true },
    { to: '/encounters', icon: '👥', label: 'Daftar Pasien' },
    { to: '/transactions', icon: '💊', label: 'Transaksi BPJS' },
    { to: '/icd-search', icon: '🔬', label: 'Pencarian ICD' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">🏥</div>
        <div>
          <div className="sidebar-brand-text">Analyzer RS</div>
          <div className="sidebar-brand-sub">Medical AI Dashboard</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label" style={{ marginTop: 8 }}>Menu Utama</div>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        <div className="nav-section-label" style={{ marginTop: 20 }}>AI Tools</div>
        <div
          className="nav-item"
          style={{ cursor: 'default', opacity: 0.6 }}
        >
          <span className="nav-icon">🤖</span>
          AI Rekomendasi
          <span className="nav-badge">v1</span>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="user-card" onClick={handleLogout} title="Klik untuk logout">
          <div className="user-avatar">
            {(user?.name || user?.username || 'A')[0].toUpperCase()}
          </div>
          <div>
            <div className="user-name">{user?.name || user?.username || 'Admin'}</div>
            <div className="user-role">{user?.department?.name || 'Staff'}</div>
          </div>
          <button className="logout-btn" title="Logout">⏻</button>
        </div>
      </div>
    </aside>
  );
}

function Layout({ children, title, subtitle }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <header className="page-header">
          <div style={{ flex: 1 }}>
            <div className="page-header-title">{title}</div>
            {subtitle && <div className="page-header-sub">{subtitle}</div>}
          </div>
          <div className="header-actions">
            <div style={{
              padding: '6px 14px',
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              color: 'var(--accent-success)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 600
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-success)', display: 'inline-block', animation: 'pulse-glow 2s infinite' }} />
              Server Online
            </div>
          </div>
        </header>
        <div className="page-body">{children}</div>
      </main>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={
        <PrivateRoute>
          <Layout title="Dashboard" subtitle="Ringkasan sistem Analyzer RS">
            <DashboardPage />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/encounters" element={
        <PrivateRoute>
          <Layout title="Daftar Pasien" subtitle="Data encounter & pemeriksaan pasien">
            <EncountersPage />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/encounters/:id" element={
        <PrivateRoute>
          <Layout title="AI Recommendation" subtitle="Analisis klinis berbasis AI">
            <RecommendationPage />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/transactions" element={
        <PrivateRoute>
          <Layout title="Transaksi BPJS" subtitle="Manajemen klaim dan transaksi">
            <TransactionsPage />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/icd-search" element={
        <PrivateRoute>
          <Layout title="Pencarian Kode ICD" subtitle="Database ICD-10 & ICD-9-CM">
            <ICDSearchPage />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

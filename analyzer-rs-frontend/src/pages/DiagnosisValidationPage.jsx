import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEncounterByNumber, generateAIRecommendation, getMrconso, createTransaction } from '../services/api';
import { useValidation, DOC_REQ, checkINACBGLinkage } from '../context/ValidationContext';

const TABS = [
  { id: 'diagnosis', icon: '🔴', label: 'Diagnosis' },
  { id: 'treatment', icon: '💊', label: 'Tindakan' },
  { id: 'documents', icon: '📄', label: 'Dokumen' },
  { id: 'risk', icon: '📊', label: 'Risk' },
  { id: 'finance', icon: '💰', label: 'Keuangan' },
  { id: 'submit', icon: '🔒', label: 'Submit' },
];

function ConfidenceBar({ value }) {
  const pct = value || 0;
  const color = pct >= 80 ? 'green' : pct >= 60 ? 'amber' : 'red';
  return (
    <div style={{ marginTop: 4 }}>
      <div className="progress-bar-track" style={{ height: 5 }}>
        <div className={`progress-bar-fill ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{pct}% confidence</div>
    </div>
  );
}

function RiskRing({ score, size = 140 }) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 85 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="risk-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-color)" strokeWidth="10" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="risk-ring-label">
        <div style={{ fontSize: 28, fontWeight: 800, color }}>{score}%</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Risk Score</div>
      </div>
    </div>
  );
}

export default function DiagnosisValidationPage() {
  const { encId } = useParams();
  const navigate = useNavigate();
  const {
    currentAnalysis, loadAnalysis, resetValidation,
    selectedPrimaryDiagnosis, setSelectedPrimaryDiagnosis,
    selectedSecondaryDiagnoses, setSelectedSecondaryDiagnoses,
    selectedTreatments, setSelectedTreatments,
    documentChecklist, setDocumentChecklist,
    validation, coherence,
  } = useValidation();

  const [activeTab, setActiveTab] = useState('diagnosis');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchModal, setSearchModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Load encounter and generate AI if navigating via /validation/:encId
  useEffect(() => {
    if (encId && !currentAnalysis) {
      const load = async () => {
        setLoading(true);
        try {
          const res = await getEncounterByNumber(encId);
          const enc = res.data?.data;
          if (!enc) { setError('Encounter tidak ditemukan'); return; }
          setAiLoading(true);
          const payload = {
            patient_id: String(enc.patient_id || encId),
            encounter_number: String(enc.encounter_number || encId),
            unit: enc.unit || 'Umum',
            patient_name: enc.patient_name || 'Pasien',
            age: enc.age,
            gender: enc.gender,
            weight: enc.weight,
            subjective: enc.subjective || '-',
            objectif: enc.objective || enc.objectif || '-',
            assesment: enc.assesment || enc.assessment || '-',
            service_type: enc.service_type || 'Rawat Jalan',
            creator: 'admin',
            condition: enc.condition || {},
          };
          const aiRes = await generateAIRecommendation(payload);
          const aiData = aiRes.data?.data?.ai_analysis_recommendations || aiRes.data?.data || aiRes.data;
          loadAnalysis({
            ...payload,
            ...aiData,
            patient_name: enc.patient_name,
            subjective: enc.subjective,
            objective: enc.objective || enc.objectif,
            assessment: enc.assesment || enc.assessment,
          });
        } catch (err) {
          setError(err.response?.data?.message || 'Gagal memuat data');
        } finally {
          setLoading(false);
          setAiLoading(false);
        }
      };
      load();
    }
  }, [encId, currentAnalysis, loadAnalysis]);

  // Search master diagnosis
  const handleSearch = async (q) => {
    if (!q || q.length < 2) return;
    setSearchLoading(true);
    try {
      const res = await getMrconso({ search: q, limit: 20 });
      setSearchResults(res.data?.data?.data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectFromMaster = (item) => {
    const diag = {
      code: item.code,
      title: item.str_indo || item.str,
      inacbg: item.inpatient || item.outpatient || null,
      cost: null,
      confidence: null,
      fromMaster: true,
    };
    if (searchModal === 'primary') {
      setSelectedPrimaryDiagnosis(diag);
    } else {
      if (selectedSecondaryDiagnoses.length >= 2) {
        showToast('Maksimal 2 diagnosis sekunder', 'warning');
        return;
      }
      setSelectedSecondaryDiagnoses(prev => [...prev, diag]);
    }
    setSearchModal(null);
    setSearchQuery('');
    setSearchResults([]);
    showToast(`Diagnosis [${diag.code}] dipilih`, 'success');
  };

  const handleSubmitTransaction = async () => {
    setSubmitLoading(true);
    try {
      const payload = {
        patient_name: currentAnalysis?.patient_name,
        patient_id: currentAnalysis?.patient_id,
        encounter_number: currentAnalysis?.encounter_number,
        diagnosis: selectedPrimaryDiagnosis?.code,
        diagnosis_name: selectedPrimaryDiagnosis?.title,
        secondary_diagnoses: selectedSecondaryDiagnoses.map(d => ({ code: d.code, name: d.title })),
        treatments: selectedTreatments.filter(t => t.selected).map(t => ({ code: t.code, name: t.title })),
        severity_level: documentChecklist.severity_level,
        inacbg: selectedPrimaryDiagnosis?.inacbg,
        risk_score: validation.riskScore,
        service_type: currentAnalysis?.service_type,
        documents: documentChecklist,
        status: 'pending',
      };
      await createTransaction(payload);
      showToast('Transaksi berhasil disubmit!', 'success');
      resetValidation();
      setTimeout(() => navigate('/transactions'), 1500);
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal submit transaksi', 'error');
    } finally {
      setSubmitLoading(false);
      setShowConfirm(false);
    }
  };

  // Computed values
  const sevLevel = documentChecklist.severity_level || 1;
  const reqDocs = DOC_REQ[sevLevel] || DOC_REQ[1];
  const docEntries = Object.entries(reqDocs);
  const requiredDocs = docEntries.filter(([, v]) => v.required);
  const completedRequired = requiredDocs.filter(([k]) => documentChecklist[k]).length;
  const totalDone = docEntries.filter(([k]) => documentChecklist[k]).length;
  const docProgress = docEntries.length ? Math.round((totalDone / docEntries.length) * 100) : 0;

  const aiDiagPrimary = currentAnalysis?.diagnosis_primer || [];
  const aiDiagSecondary = currentAnalysis?.diagnosis_sekunder || [];
  const aiTreatments = currentAnalysis?.tindakan_medis || [];

  // Financials
  const coverage = selectedPrimaryDiagnosis?.cost || aiDiagPrimary[0]?.cost || 0;
  const treatCost = selectedTreatments.filter(t => t.selected).reduce((s, t) => s + (t.cost || 0), 0);
  const totalCost = treatCost || Math.round(coverage * 0.6);
  const profit = coverage - totalCost;

  if (loading || aiLoading) {
    return (
      <div className="fade-in">
        <div className="card" style={{ minHeight: 400 }}>
          <div className="ai-generating" style={{ padding: 60 }}>
            <div className="ai-pulse" style={{ fontSize: 40 }}>🤖</div>
            <div className="ai-generating-text" style={{ fontSize: 16, fontWeight: 700, marginTop: 16 }}>
              {aiLoading ? 'AI sedang menganalisis data klinis...' : 'Memuat data encounter...'}
            </div>
            <div className="ai-dots" style={{ marginTop: 12 }}>
              <div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>
              Proses ini membutuhkan 10-30 detik
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fade-in">
        <div className="inline-alert alert-danger">⚠️ {error}</div>
        <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => navigate(-1)}>← Kembali</button>
      </div>
    );
  }

  if (!currentAnalysis) {
    return (
      <div className="fade-in">
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-title">Belum ada data analisis</div>
            <div className="empty-state-desc">Gunakan halaman "Analisis Baru" atau pilih encounter dari daftar pasien</div>
            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={() => navigate('/new-analysis')}>📝 Analisis Baru</button>
              <button className="btn btn-secondary" onClick={() => navigate('/encounters')}>👥 Daftar Pasien</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast-item ${toast.type}`}>{toast.msg}</div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => { resetValidation(); navigate(-1); }}>← Kembali</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800 }}>🛡️ Validasi Diagnosis — {currentAnalysis.patient_name}</h1>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            ID: {currentAnalysis.patient_id} • {currentAnalysis.service_type} • Severity Level {sevLevel}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`badge ${validation.riskLevel === 'low' ? 'badge-green' : validation.riskLevel === 'medium' ? 'badge-orange' : 'badge-danger'}`}
            style={{ fontSize: 11, padding: '4px 10px' }}>
            Risk: {validation.riskScore}%
          </span>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar" style={{ marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ============== TAB 1: DIAGNOSIS ============== */}
      {activeTab === 'diagnosis' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
          {/* Left: AI Recommendations */}
          <div className="card card-ai">
            <div className="card-header">
              <div>
                <div className="card-title">🤖 Rekomendasi AI</div>
                <div className="card-subtitle">Referensi — bukan keputusan final</div>
              </div>
            </div>
            <div className="card-body" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-danger)', marginBottom: 8, textTransform: 'uppercase' }}>
                Diagnosis Primer
              </div>
              {aiDiagPrimary.map((d, i) => (
                <div key={i}
                  className={`diag-card ai-rec ${selectedPrimaryDiagnosis?.code === d.kode ? 'selected-primary' : ''}`}
                  onClick={() => {
                    setSelectedPrimaryDiagnosis({ code: d.kode, title: d.nama, inacbg: d.inacbg, cost: d.cost, confidence: d.confidence, fromMaster: true });
                    showToast(`Diagnosis primer [${d.kode}] dipilih`, 'success');
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span className="diagnosis-code">{d.kode}</span>
                    <span className="badge badge-blue" style={{ fontSize: 10 }}>⭐ AI Rec.</span>
                    {d.confidence && <span className="badge badge-gray" style={{ fontSize: 10 }}>{d.confidence}%</span>}
                    {d.inacbg && <span className="inacbg-tag">{d.inacbg}</span>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{d.nama}</div>
                  {d.alasan && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>💡 {d.alasan}</div>}
                  {d.confidence && <ConfidenceBar value={d.confidence} />}
                </div>
              ))}

              {aiDiagSecondary.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-info)', marginBottom: 8, marginTop: 16, textTransform: 'uppercase' }}>
                    Diagnosis Sekunder
                  </div>
                  {aiDiagSecondary.map((d, i) => (
                    <div key={i}
                      className={`diag-card ai-rec ${selectedSecondaryDiagnoses.some(s => s.code === d.kode) ? 'selected' : ''}`}
                      onClick={() => {
                        if (selectedSecondaryDiagnoses.some(s => s.code === d.kode)) {
                          setSelectedSecondaryDiagnoses(prev => prev.filter(s => s.code !== d.kode));
                        } else if (selectedSecondaryDiagnoses.length < 2) {
                          setSelectedSecondaryDiagnoses(prev => [...prev, { code: d.kode, title: d.nama, inacbg: d.inacbg, cost: d.cost, confidence: d.confidence, fromMaster: true }]);
                        } else {
                          showToast('Maksimal 2 diagnosis sekunder', 'warning');
                        }
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span className="diagnosis-code">{d.kode}</span>
                        <span className="badge badge-orange" style={{ fontSize: 10 }}>Sekunder</span>
                        {d.confidence && <span className="badge badge-gray" style={{ fontSize: 10 }}>{d.confidence}%</span>}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{d.nama}</div>
                      {d.alasan && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>💡 {d.alasan}</div>}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Right: Doctor Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card card-doctor">
              <div className="card-header" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div className="card-title">👨‍⚕️ Pilihan Dokter</div>
                  <div className="card-subtitle">Keputusan final diagnosis</div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setSearchModal('primary')}>
                  🔍 Cari Master
                </button>
              </div>
              <div className="card-body" style={{ padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
                  Primer (wajib)
                </div>
                {selectedPrimaryDiagnosis ? (
                  <div className="diag-card selected-primary">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <span className="diagnosis-code">{selectedPrimaryDiagnosis.code}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, marginLeft: 8 }}>{selectedPrimaryDiagnosis.title}</span>
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={() => setSelectedPrimaryDiagnosis(null)}
                        style={{ fontSize: 10, padding: '2px 8px' }}>✕</button>
                    </div>
                    {selectedPrimaryDiagnosis.inacbg && (
                      <div style={{ marginTop: 6 }}><span className="inacbg-tag">INACBG: {selectedPrimaryDiagnosis.inacbg}</span></div>
                    )}
                  </div>
                ) : (
                  <div className="inline-alert alert-danger">⚠️ Diagnosis primer belum dipilih — klik rekomendasi AI atau cari dari master</div>
                )}

                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginTop: 16, marginBottom: 8, textTransform: 'uppercase' }}>
                  Sekunder (maks 2)
                </div>
                {selectedSecondaryDiagnoses.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 8 }}>Belum ada — klik diagnosis sekunder AI untuk memilih</div>
                ) : (
                  selectedSecondaryDiagnoses.map((d, i) => (
                    <div key={i} className="diag-card selected" style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <span className="diagnosis-code">{d.code}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, marginLeft: 8 }}>{d.title}</span>
                        </div>
                        <button className="btn btn-secondary btn-sm" style={{ fontSize: 10, padding: '2px 8px' }}
                          onClick={() => setSelectedSecondaryDiagnoses(prev => prev.filter((_, j) => j !== i))}>✕</button>
                      </div>
                    </div>
                  ))
                )}
                {selectedSecondaryDiagnoses.length < 2 && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setSearchModal('secondary')}
                    style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>
                    + Cari diagnosis sekunder dari master
                  </button>
                )}
              </div>
            </div>

            {/* Coherence Check */}
            <div className={`card ${coherence.status === 'ok' ? 'card-doctor' : coherence.status === 'warn' ? 'card-amber' : 'card-warn'}`}>
              <div className="card-header">
                <div className="card-title">⚡ Clinical Coherence Check</div>
              </div>
              <div className="card-body" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 800, color: 'white',
                    background: coherence.score >= 70 ? 'var(--accent-success)' : coherence.score >= 50 ? 'var(--accent-warning)' : 'var(--accent-danger)',
                  }}>{coherence.score}%</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {coherence.score >= 70 ? 'Koherensi Baik' : coherence.score >= 50 ? 'Perhatian Diperlukan' : 'Koherensi Rendah'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Kesesuaian SOAP vs diagnosis</div>
                  </div>
                </div>
                {coherence.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }}>
                    <span>{item.ok ? '✅' : '⚠️'}</span>
                    <span style={{ color: item.ok ? 'var(--text-primary)' : 'var(--accent-warning)' }}>{item.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============== TAB 2: TINDAKAN ============== */}
      {activeTab === 'treatment' && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">💊 Tindakan Medis</div>
              <div className="card-subtitle">AI Recommendation — toggle untuk memilih / membatalkan</div>
            </div>
          </div>
          <div className="card-body" style={{ padding: 16 }}>
            {selectedTreatments.length === 0 && aiTreatments.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-state-icon">💊</div>
                <div className="empty-state-title">Belum ada rekomendasi tindakan</div>
              </div>
            ) : (
              selectedTreatments.map((t, i) => {
                const linkOk = checkINACBGLinkage(selectedPrimaryDiagnosis?.code, t.inacbg);
                return (
                  <div key={i} className={`diag-card ${t.selected ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedTreatments(prev => prev.map((tr, j) => j === i ? { ...tr, selected: !tr.selected } : tr));
                    }}
                    style={{ opacity: t.selected ? 1 : 0.5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span className="diagnosis-code" style={{ color: 'var(--accent-success)' }}>{t.code}</span>
                      <span className="badge badge-green" style={{ fontSize: 10 }}>⭐ AI Rec.</span>
                      {t.category && <span className="badge badge-gray" style={{ fontSize: 10 }}>{t.category}</span>}
                      {t.inacbg && <span className="inacbg-tag">{t.inacbg}</span>}
                      <span className={`badge ${t.selected ? 'badge-success-solid' : 'badge-gray'}`} style={{ fontSize: 10, marginLeft: 'auto' }}>
                        {t.selected ? '✅ Terpilih' : '❌ Tidak dipilih'}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</div>
                    {t.reason && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>💡 {t.reason}</div>}
                    {t.confidence && <ConfidenceBar value={t.confidence} />}
                    {!linkOk && t.selected && (
                      <div className="inline-alert alert-danger" style={{ marginTop: 8 }}>
                        ⚠️ INA-CBG [{t.inacbg}] tidak sesuai diagnosis primer [{selectedPrimaryDiagnosis?.code}] — linkage error!
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============== TAB 3: DOCUMENTS ============== */}
      {activeTab === 'documents' && (
        <div className="card">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="card-title">📄 Checklist Dokumen Klaim</div>
              <div className="card-subtitle">Persyaratan berdasarkan Severity Level</div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3].map(lv => (
                <button key={lv}
                  className={`tab-btn ${sevLevel === lv ? 'active' : ''}`}
                  style={{ padding: '4px 12px', fontSize: 11 }}
                  onClick={() => setDocumentChecklist(p => ({ ...p, severity_level: lv }))}>
                  Lvl {lv}
                </button>
              ))}
            </div>
          </div>
          <div className="card-body" style={{ padding: 16 }}>
            {/* Progress bar */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                <span>Progress Dokumen</span>
                <span style={{ fontWeight: 700 }}>{totalDone}/{docEntries.length} ({docProgress}%)</span>
              </div>
              <div className="progress-bar-track">
                <div className={`progress-bar-fill ${completedRequired === requiredDocs.length ? 'green' : 'red'}`}
                  style={{ width: `${docProgress}%` }} />
              </div>
              <div style={{ marginTop: 6, fontSize: 11 }}>
                {completedRequired === requiredDocs.length ? (
                  <span style={{ color: 'var(--accent-success)', fontWeight: 600 }}>✅ Semua dokumen wajib lengkap</span>
                ) : (
                  <span style={{ color: 'var(--accent-danger)', fontWeight: 600 }}>🔴 {requiredDocs.length - completedRequired} dokumen wajib belum lengkap</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {docEntries.map(([key, spec]) => {
                const checked = documentChecklist[key];
                const cls = spec.required
                  ? (checked ? 'required-ok' : 'required-missing')
                  : spec.recommended ? 'recommended' : '';
                return (
                  <div key={key} className={`doc-item ${cls}`}
                    onClick={() => setDocumentChecklist(p => ({ ...p, [key]: !p[key] }))}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 4,
                      border: `2px solid ${checked ? 'var(--accent-success)' : 'var(--border-color)'}`,
                      background: checked ? 'var(--accent-success)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: 12, flexShrink: 0, marginTop: 1,
                    }}>
                      {checked && '✓'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {spec.label}
                        {spec.required && <span className="badge badge-danger" style={{ fontSize: 9, marginLeft: 8 }}>WAJIB</span>}
                        {!spec.required && spec.recommended && <span className="badge badge-orange" style={{ fontSize: 9, marginLeft: 8 }}>DISARANKAN</span>}
                        {!spec.required && !spec.recommended && <span className="badge badge-gray" style={{ fontSize: 9, marginLeft: 8 }}>OPSIONAL</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{spec.note}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============== TAB 4: RISK ============== */}
      {activeTab === 'risk' && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="card-body" style={{ padding: 24 }}>
              <RiskRing score={validation.riskScore} />
              <div style={{ marginTop: 12, fontSize: 14, fontWeight: 800,
                color: validation.riskLevel === 'low' ? 'var(--accent-success)' : validation.riskLevel === 'medium' ? 'var(--accent-warning)' : 'var(--accent-danger)' }}>
                {validation.riskLevel === 'low' ? '🟢 PELUANG DITERIMA TINGGI' :
                  validation.riskLevel === 'medium' ? '🟡 PELUANG DITERIMA SEDANG' : '🔴 PELUANG DITERIMA RENDAH'}
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">📊 Detail Faktor Risiko</div></div>
            <div className="card-body" style={{ padding: 16 }}>
              {validation.errors.map((e, i) => (
                <div key={`e${i}`} className="gate-item fail">
                  <div className="gate-icon fail">✕</div>
                  <div style={{ fontSize: 12 }}>{e}</div>
                </div>
              ))}
              {validation.warnings.map((w, i) => (
                <div key={`w${i}`} className="gate-item warn">
                  <div className="gate-icon warn">!</div>
                  <div style={{ fontSize: 12 }}>{w}</div>
                </div>
              ))}
              {validation.errors.length === 0 && validation.warnings.length === 0 && (
                <div className="gate-item pass">
                  <div className="gate-icon pass">✓</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Semua validasi lolos — klaim siap disubmit</div>
                </div>
              )}
              <div className="inline-alert alert-info" style={{ marginTop: 12 }}>
                💡 <strong>Tips:</strong> Lengkapi semua dokumen wajib dan pastikan diagnosis sesuai SOAP untuk meningkatkan risk score.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============== TAB 5: FINANCE ============== */}
      {activeTab === 'finance' && (
        <div className="card">
          <div className="card-header"><div className="card-title">💰 Proyeksi Keuangan</div></div>
          <div className="card-body" style={{ padding: 16 }}>
            <div className="grid-cols-3" style={{ marginBottom: 16 }}>
              <div className="finance-card blue">
                <div className="fin-label" style={{ color: 'var(--accent-primary)' }}>Coverage BPJS</div>
                <div className="fin-value" style={{ color: 'var(--accent-primary)' }}>Rp {coverage.toLocaleString('id-ID')}</div>
                <div className="fin-sub">Dari diagnosis_master.claim</div>
              </div>
              <div className="finance-card amber">
                <div className="fin-label" style={{ color: 'var(--accent-warning)' }}>Estimasi Biaya RS</div>
                <div className="fin-value" style={{ color: 'var(--accent-warning)' }}>Rp {totalCost.toLocaleString('id-ID')}</div>
                <div className="fin-sub">Severity Lv.{sevLevel} + Tindakan</div>
              </div>
              <div className={`finance-card ${profit >= 0 ? 'green' : 'red'}`}>
                <div className="fin-label" style={{ color: profit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>Proyeksi Profit</div>
                <div className="fin-value" style={{ color: profit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                  {profit >= 0 ? '+' : ''}Rp {profit.toLocaleString('id-ID')}
                </div>
                <div className="fin-sub">{coverage > 0 ? `${((profit / coverage) * 100).toFixed(1)}%` : '—'}</div>
              </div>
            </div>

            <div className={`profit-banner ${profit >= 0 ? 'profitable' : 'loss'}`}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{profit >= 0 ? '🟢 PROFITABLE' : '🔴 LOSS'}</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                {profit >= 0 ? 'Klaim diperkirakan menguntungkan' : 'Biaya RS melebihi coverage BPJS'}
              </div>
            </div>

            {coverage > 0 && (
              <div className="inline-alert alert-danger" style={{ marginTop: 8 }}>
                ⚠️ <strong>Jika klaim ditolak:</strong> Kerugian total -Rp {totalCost.toLocaleString('id-ID')} (seluruh biaya RS tidak ter-cover)
              </div>
            )}

            {/* Tariff breakdown */}
            {selectedTreatments.filter(t => t.selected).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>INACBG Tariff Breakdown</div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Kode</th><th>Tindakan</th><th>INACBG</th><th style={{ textAlign: 'right' }}>Tarif</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTreatments.filter(t => t.selected).map((t, i) => (
                        <tr key={i}>
                          <td><span className="diagnosis-code" style={{ color: 'var(--accent-success)' }}>{t.code}</span></td>
                          <td style={{ fontSize: 12 }}>{t.title}</td>
                          <td>{t.inacbg ? <span className="inacbg-tag">{t.inacbg}</span> : '—'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 12 }}>Rp {(t.cost || 0).toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============== TAB 6: SUBMIT GATE ============== */}
      {activeTab === 'submit' && (
        <div className="card">
          <div className="card-header"><div className="card-title">🔒 Final Validation Gate</div></div>
          <div className="card-body" style={{ padding: 16 }}>
            <div style={{ marginBottom: 16 }}>
              {/* Gate checks */}
              {[
                {
                  label: 'Diagnosis Primer',
                  detail: selectedPrimaryDiagnosis ? `[${selectedPrimaryDiagnosis.code}] ${selectedPrimaryDiagnosis.title}` : 'Belum dipilih',
                  status: selectedPrimaryDiagnosis ? 'pass' : 'fail',
                },
                {
                  label: 'Diagnosis Sekunder',
                  detail: selectedSecondaryDiagnoses.length > 0 ? `${selectedSecondaryDiagnoses.length} diagnosis dipilih` : 'Belum ada (opsional)',
                  status: selectedSecondaryDiagnoses.length > 0 ? 'pass' : 'warn',
                },
                {
                  label: 'INA-CBG Linkage',
                  detail: selectedPrimaryDiagnosis?.inacbg ? `${selectedPrimaryDiagnosis.code} → ${selectedPrimaryDiagnosis.inacbg}` : 'N/A',
                  status: !selectedTreatments.some(t => t.selected && !checkINACBGLinkage(selectedPrimaryDiagnosis?.code, t.inacbg)) ? 'pass' : 'warn',
                },
                {
                  label: 'Dokumentasi Lengkap',
                  detail: `${completedRequired}/${requiredDocs.length} dokumen wajib`,
                  status: completedRequired === requiredDocs.length ? 'pass' : 'fail',
                },
                {
                  label: 'Clinical Coherence',
                  detail: `Score: ${coherence.score}%`,
                  status: coherence.score >= 70 ? 'pass' : coherence.score >= 50 ? 'warn' : 'fail',
                },
                {
                  label: 'Tindakan Medis',
                  detail: `${selectedTreatments.filter(t => t.selected).length} tindakan dipilih`,
                  status: selectedTreatments.some(t => t.selected) ? 'pass' : 'warn',
                },
              ].map((g, i) => (
                <div key={i} className={`gate-item ${g.status}`}>
                  <div className={`gate-icon ${g.status}`}>
                    {g.status === 'pass' ? '✓' : g.status === 'warn' ? '!' : '✕'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{g.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{g.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Risk Score Banner */}
            <div style={{
              padding: '14px 20px',
              borderRadius: 'var(--radius-md)',
              background: validation.riskLevel === 'low' ? 'rgba(16,185,129,0.1)' : validation.riskLevel === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${validation.riskLevel === 'low' ? 'rgba(16,185,129,0.3)' : validation.riskLevel === 'medium' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 16,
            }}>
              <span style={{ fontWeight: 700 }}>Risk Score: {validation.riskScore}%</span>
              <span style={{ fontWeight: 700 }}>
                Peluang Klaim Disetujui: {validation.riskLevel === 'low' ? 'TINGGI' : validation.riskLevel === 'medium' ? 'SEDANG' : 'RENDAH'}
              </span>
            </div>

            {/* Submit button */}
            <button
              id="btn-submit-claim"
              className="btn btn-primary"
              style={{
                width: '100%', justifyContent: 'center', padding: 16, fontSize: 15, fontWeight: 800,
                opacity: validation.isValid ? 1 : 0.4,
              }}
              disabled={!validation.isValid || submitLoading}
              onClick={() => {
                if (validation.warnings.length > 0) setShowConfirm(true);
                else handleSubmitTransaction();
              }}
            >
              {submitLoading ? (
                <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Mengirim...</>
              ) : validation.isValid ? '✅ Submit Klaim BPJS' : '🔒 Submit Diblokir — Validasi Belum Lengkap'}
            </button>

            {!validation.isValid && (
              <div className="inline-alert alert-danger" style={{ marginTop: 8 }}>
                ⚠️ Perbaiki {validation.errors.length} error di atas sebelum submit
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============== SEARCH MODAL ============== */}
      {searchModal && (
        <div className="modal-overlay" onClick={() => setSearchModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔍 Cari Diagnosis dari Master (ICD-10)</h3>
              <button className="modal-close" onClick={() => setSearchModal(null)}>✕</button>
            </div>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
              <div className="search-bar" style={{ maxWidth: '100%' }}>
                <span className="search-icon">🔍</span>
                <input
                  autoFocus
                  placeholder="Ketik kode ICD atau nama penyakit..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); handleSearch(e.target.value); }}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div className="modal-body">
              {searchLoading ? (
                <div className="loading-wrap"><div className="spinner" /><span>Mencari...</span></div>
              ) : searchResults.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
                  {searchQuery.length >= 2 ? 'Tidak ditemukan' : 'Ketik minimal 2 karakter'}
                </div>
              ) : (
                searchResults.map((item, i) => (
                  <div key={i} className="search-result-item" onClick={() => selectFromMaster(item)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="diagnosis-code">{item.code}</span>
                      <span style={{ fontWeight: 600 }}>{item.str_indo || item.str}</span>
                    </div>
                    {item.str_indo && item.str && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.str}</div>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="modal-footer">Pilih diagnosis untuk {searchModal === 'primary' ? 'primer' : 'sekunder'}</div>
          </div>
        </div>
      )}

      {/* ============== CONFIRM MODAL ============== */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>⚠️ Konfirmasi Submit</h3>
              <button className="modal-close" onClick={() => setShowConfirm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, marginBottom: 12 }}>Ada {validation.warnings.length} peringatan yang perlu diperhatikan:</p>
              {validation.warnings.map((w, i) => (
                <div key={i} className="inline-alert alert-warning" style={{ marginBottom: 6 }}>⚠️ {w}</div>
              ))}
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 12 }}>Apakah Anda yakin tetap ingin submit?</p>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSubmitTransaction} disabled={submitLoading}>
                {submitLoading ? 'Mengirim...' : '✅ Ya, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

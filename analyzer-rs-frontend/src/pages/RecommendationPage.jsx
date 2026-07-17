import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEncounterByNumber, generateAIRecommendation } from '../services/api';

export default function RecommendationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [encounter, setEncounter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEncounter = async () => {
      try {
        const res = await getEncounterByNumber(id);
        setEncounter(res.data?.data);
      } catch (err) {
        setError('Gagal memuat data encounter.');
      } finally {
        setLoading(false);
      }
    };
    fetchEncounter();
  }, [id]);

  const handleGenerateAI = async () => {
    if (!encounter) return;
    setAiLoading(true);
    setError('');
    setAiResult(null);
    try {
      const payload = {
        patient_id: String(encounter.patient_id || id),
        encounter_number: String(encounter.encounter_number || id),
        unit: encounter.unit || 'Umum',
        patient_name: encounter.patient_name || 'Pasien',
        age: encounter.age,
        gender: encounter.gender,
        weight: encounter.weight,
        subjective: encounter.subjective || '-',
        objectif: encounter.objective || encounter.objectif || '-',
        assesment: encounter.assesment || encounter.assessment || '-',
        service_type: encounter.service_type || 'Rawat Jalan',
        creator: 'admin',
        condition: encounter.condition || {},
      };
      const res = await generateAIRecommendation(payload);
      setAiResult(res.data?.data?.ai_analysis_recommendations || res.data);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Gagal generate rekomendasi AI.';
      setError(msg);
    } finally {
      setAiLoading(false);
    }
  };

  const ConfidenceBar = ({ value }) => (
    <div>
      <div className="confidence-bar">
        <div className="confidence-fill" style={{ width: `${value}%` }} />
      </div>
      <div className="confidence-label">{value}% confidence</div>
    </div>
  );

  const SeverityBadge = ({ level }) => {
    const map = { 1: ['severity-1', '🟢', 'Level 1 - Ringan'], 2: ['severity-2', '🟡', 'Level 2 - Sedang'], 3: ['severity-3', '🔴', 'Level 3 - Berat'] };
    const [cls, icon, label] = map[level] || ['severity-1', '⚪', 'Tidak diketahui'];
    return <div className={`severity-badge ${cls}`}>{icon} Severity {label}</div>;
  };

  if (loading) return (
    <div className="loading-wrap" style={{ minHeight: '60vh' }}>
      <div className="spinner" /><span>Memuat data pasien...</span>
    </div>
  );

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>← Kembali</button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>🤖 AI Recommendation</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {encounter?.patient_name} — ID {encounter?.patient_id}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Left: Patient Data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Patient Info */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">👤 Data Pasien</div>
              </div>
            </div>
            <div className="card-body" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Nama', encounter?.patient_name],
                  ['ID Pasien', encounter?.patient_id],
                  ['Usia', encounter?.age ? `${encounter.age} tahun` : '-'],
                  ['Gender', encounter?.gender],
                  ['Jenis Pelayanan', encounter?.service_type],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{label}</span>
                    <span style={{ fontWeight: 600 }}>{value || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SOAP */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">📋 Data SOAP</div>
            </div>
            <div className="card-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'S — Subjective', value: encounter?.subjective, icon: '💬' },
                { label: 'O — Objective', value: encounter?.objective || encounter?.objectif, icon: '🔬' },
                { label: 'A — Assessment', value: encounter?.assesment || encounter?.assessment, icon: '🏥' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="soap-item" style={{ padding: '12px 14px' }}>
                  <div className="soap-label">{icon} {label}</div>
                  <div className="soap-value" style={{ fontSize: 12 }}>{value || '—'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            id="btn-generate-ai"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
            onClick={handleGenerateAI}
            disabled={aiLoading}
          >
            {aiLoading ? (
              <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Generating...</>
            ) : '🤖 Generate AI Recommendation'}
          </button>

          {error && <div className="alert alert-error">⚠️ {error}</div>}
        </div>

        {/* Right: AI Result */}
        <div>
          {aiLoading && (
            <div className="card">
              <div className="ai-generating">
                <div className="ai-pulse">🤖</div>
                <div className="ai-generating-text">AI sedang menganalisis data klinis...</div>
                <div className="ai-dots">
                  <div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" />
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                  Proses ini membutuhkan waktu 10-30 detik
                </p>
              </div>
            </div>
          )}

          {!aiLoading && !aiResult && (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">🤖</div>
                <div className="empty-state-title">Siap Generate Rekomendasi</div>
                <div className="empty-state-desc">
                  Klik tombol "Generate AI Recommendation" untuk mendapatkan<br />
                  analisis klinis berbasis AI, diagnosis ICD-10, tindakan ICD-9-CM,<br />
                  kode INACBG, dan severity level.
                </div>
              </div>
            </div>
          )}

          {aiResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Severity & Jenis Pelayanan */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">📊 Hasil Analisis</div>
                </div>
                <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                  <SeverityBadge level={aiResult.severity_level} />
                  <div className={`severity-badge ${aiResult.jenis_pelayanan?.toLowerCase().includes('inap') ? 'badge-blue' : 'badge-green'}`}
                    style={{ background: aiResult.jenis_pelayanan?.toLowerCase().includes('inap') ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)', color: aiResult.jenis_pelayanan?.toLowerCase().includes('inap') ? 'var(--accent-primary)' : 'var(--accent-success)', border: '1px solid', borderColor: aiResult.jenis_pelayanan?.toLowerCase().includes('inap') ? 'rgba(59,130,246,0.3)' : 'rgba(16,185,129,0.3)', padding: '8px 16px', borderRadius: 'var(--radius-md)', fontWeight: 700 }}>
                    🏥 {aiResult.jenis_pelayanan || '—'}
                  </div>
                  {aiResult.severity_justifikasi && (
                    <p style={{ width: '100%', fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                      {aiResult.severity_justifikasi}
                    </p>
                  )}
                </div>
              </div>

              {/* Diagnosis Primer */}
              {aiResult.diagnosis_primer?.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">🔴 Diagnosis Primer</div>
                      <div className="card-subtitle">Berdasarkan data SOAP dan analisis AI</div>
                    </div>
                  </div>
                  <div className="card-body" style={{ padding: '16px' }}>
                    <div className="ai-section-title">ICD-10</div>
                    {aiResult.diagnosis_primer.map((d, i) => (
                      <div key={i} className={`diagnosis-card ${d.rekomendasi_ai ? 'recommended' : ''}`}>
                        <div className={`diagnosis-rank ${i === 0 ? 'top' : ''}`}>{i + 1}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                            <span className="diagnosis-code">{d.kode}</span>
                            {d.rekomendasi_ai && <span className="badge badge-blue" style={{ fontSize: 10 }}>⭐ REKOMENDASI AI</span>}
                            {d.inacbg && <span className="inacbg-tag">INACBG: {d.inacbg}</span>}
                          </div>
                          <div className="diagnosis-name">{d.nama}</div>
                          {d.alasan && <div className="diagnosis-reason">💡 {d.alasan}</div>}
                          {d.confidence && <ConfidenceBar value={d.confidence} />}
                          {d.inacbgList?.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              {d.inacbgList.map((ib, j) => (
                                <span key={j} className="inacbg-tag">{ib.inacbg} — Rp {ib.claim?.toLocaleString('id-ID')}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diagnosis Sekunder */}
              {aiResult.diagnosis_sekunder?.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">🟡 Diagnosis Sekunder</div>
                      <div className="card-subtitle">Kondisi penyerta / komorbid</div>
                    </div>
                  </div>
                  <div className="card-body" style={{ padding: '16px' }}>
                    {aiResult.diagnosis_sekunder.map((d, i) => (
                      <div key={i} className={`diagnosis-card ${d.rekomendasi_ai ? 'recommended' : ''}`}>
                        <div className="diagnosis-rank">{i + 1}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                            <span className="diagnosis-code">{d.kode}</span>
                            {d.rekomendasi_ai && <span className="badge badge-orange" style={{ fontSize: 10 }}>⭐ REKOMENDASI AI</span>}
                            {d.inacbg && <span className="inacbg-tag">INACBG: {d.inacbg}</span>}
                          </div>
                          <div className="diagnosis-name">{d.nama}</div>
                          {d.alasan && <div className="diagnosis-reason">💡 {d.alasan}</div>}
                          {d.confidence && <ConfidenceBar value={d.confidence} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tindakan Medis */}
              {aiResult.tindakan_medis?.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">💊 Tindakan Medis</div>
                      <div className="card-subtitle">Prosedur & tindakan yang direkomendasikan</div>
                    </div>
                  </div>
                  <div className="card-body" style={{ padding: '16px' }}>
                    {aiResult.tindakan_medis.map((t, i) => (
                      <div key={i} className={`diagnosis-card ${t.rekomendasi_ai ? 'recommended-green' : ''}`}>
                        <div className={`diagnosis-rank ${t.rekomendasi_ai ? 'top' : ''}`}>{i + 1}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                            <span className="diagnosis-code" style={{ color: 'var(--accent-success)' }}>{t.kode}</span>
                            {t.rekomendasi_ai && <span className="badge badge-green" style={{ fontSize: 10 }}>⭐ REKOMENDASI AI</span>}
                            {t.kategori && <span className="badge badge-gray" style={{ fontSize: 10 }}>{t.kategori}</span>}
                            {t.inacbg && <span className="inacbg-tag">INACBG: {t.inacbg}</span>}
                          </div>
                          <div className="diagnosis-name">{t.nama}</div>
                          {t.alasan && <div className="diagnosis-reason">💡 {t.alasan}</div>}
                          {t.confidence && <ConfidenceBar value={t.confidence} />}
                          {t.inacbgList?.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              {t.inacbgList.map((ib, j) => (
                                <span key={j} className="inacbg-tag">{ib.inacbg} — Rp {ib.claim?.toLocaleString('id-ID')}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dokumen Checklist */}
              {(aiResult.resume_medis !== undefined) && (
                <div className="card">
                  <div className="card-header"><div className="card-title">📄 Kelengkapan Dokumen</div></div>
                  <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      ['Resume Medis', aiResult.resume_medis],
                      ['Hasil Laboratorium', aiResult.hasil_laboratorium],
                      ['Hasil Radiologi', aiResult.hasil_radiologi],
                      ['Lembar Observasi', aiResult.lembar_observasi],
                    ].map(([label, val]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: `1px solid ${val ? 'rgba(16,185,129,0.2)' : 'var(--border-color)'}` }}>
                        <span style={{ fontSize: 18 }}>{val ? '✅' : '❌'}</span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: val ? 'var(--accent-success)' : 'var(--text-secondary)' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

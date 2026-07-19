import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateAIRecommendation } from '../services/api';
import { useValidation } from '../context/ValidationContext';

const VITAL_FIELDS = [
  { key: 'blood_pressure', label: 'Tekanan Darah', unit: 'mmHg', placeholder: '120/80', type: 'text' },
  { key: 'heart_rate', label: 'Nadi', unit: 'x/menit', placeholder: '80', type: 'number' },
  { key: 'respiratory_rate', label: 'Laju Napas (RR)', unit: 'x/menit', placeholder: '20', type: 'number' },
  { key: 'temperature', label: 'Suhu Tubuh', unit: '°C', placeholder: '36.5', type: 'number' },
  { key: 'spo2', label: 'SpO2', unit: '%', placeholder: '98', type: 'number' },
  { key: 'weight', label: 'Berat Badan', unit: 'kg', placeholder: '65', type: 'number' },
  { key: 'height', label: 'Tinggi Badan', unit: 'cm', placeholder: '170', type: 'number' },
];

function getVitalWarnings(vitals) {
  const w = [];
  const hr = parseFloat(vitals.heart_rate);
  if (hr && hr < 60) w.push({ key: 'heart_rate', msg: 'Bradikardi (< 60 bpm)', level: 'warning' });
  if (hr && hr > 100) w.push({ key: 'heart_rate', msg: 'Takikardi (> 100 bpm)', level: 'danger' });
  const rr = parseFloat(vitals.respiratory_rate);
  if (rr && rr > 24) w.push({ key: 'respiratory_rate', msg: 'Takipnea (> 24 x/mnt)', level: 'warning' });
  if (rr && rr < 12) w.push({ key: 'respiratory_rate', msg: 'Bradipnea (< 12 x/mnt)', level: 'danger' });
  const temp = parseFloat(vitals.temperature);
  if (temp && temp >= 38) w.push({ key: 'temperature', msg: `Demam (${temp}°C)`, level: temp >= 39 ? 'danger' : 'warning' });
  if (temp && temp < 36) w.push({ key: 'temperature', msg: `Hipotermia (${temp}°C)`, level: 'warning' });
  const spo2 = parseFloat(vitals.spo2);
  if (spo2 && spo2 < 95) w.push({ key: 'spo2', msg: `Hipoksia (SpO2 ${spo2}%)`, level: spo2 < 90 ? 'danger' : 'warning' });
  const bp = vitals.blood_pressure;
  if (bp && bp.includes('/')) {
    const [sys, dia] = bp.split('/').map(Number);
    if (sys > 140 || dia > 90) w.push({ key: 'blood_pressure', msg: 'Hipertensi', level: 'warning' });
    if (sys < 90 || dia < 60) w.push({ key: 'blood_pressure', msg: 'Hipotensi', level: 'danger' });
  }
  return w;
}

export default function NewAnalysisPage() {
  const navigate = useNavigate();
  const { loadAnalysis } = useValidation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    patient_name: '', patient_id: '', age: '', gender: 'Laki-laki',
    service_type: 'Rawat Jalan', unit: 'Umum',
  });
  const [vitals, setVitals] = useState({
    blood_pressure: '', heart_rate: '', respiratory_rate: '',
    temperature: '', spo2: '', weight: '', height: '',
  });
  const [soap, setSoap] = useState({
    subjective: '', objective: '', assessment: '', plan: '',
  });

  const vitalWarnings = getVitalWarnings(vitals);

  const setField = (group, key, val) => {
    if (group === 'form') setForm(p => ({ ...p, [key]: val }));
    if (group === 'vitals') setVitals(p => ({ ...p, [key]: val }));
    if (group === 'soap') setSoap(p => ({ ...p, [key]: val }));
  };

  const isFormValid = () => {
    return form.patient_name && soap.subjective && soap.objective && soap.assessment;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) {
      setError('Mohon lengkapi minimal: Nama Pasien, Subjective, Objective, Assessment');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        patient_id: form.patient_id || 'NEW-' + Date.now(),
        encounter_number: 'ENC-' + Date.now(),
        unit: form.unit,
        patient_name: form.patient_name,
        age: form.age ? parseInt(form.age) : undefined,
        gender: form.gender,
        weight: vitals.weight ? parseFloat(vitals.weight) : undefined,
        subjective: soap.subjective,
        objectif: soap.objective,
        assesment: soap.assessment,
        service_type: form.service_type,
        creator: 'admin',
        condition: {
          vital_signs: vitals,
          plan: soap.plan,
        },
      };
      const res = await generateAIRecommendation(payload);
      const aiData = res.data?.data?.ai_analysis_recommendations || res.data?.data || res.data;
      // merge patient + AI result into analysis object
      const analysis = {
        ...payload,
        ...aiData,
        patient_name: form.patient_name,
        subjective: soap.subjective,
        objective: soap.objective,
        assessment: soap.assessment,
      };
      loadAnalysis(analysis);
      navigate('/validation');
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengirim ke AI. Periksa koneksi backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>📝 Analisis Baru</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Input data pasien lengkap untuk AI analysis dan validasi klaim BPJS
        </p>
      </div>

      {error && <div className="inline-alert alert-danger" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
          {/* Left Column: Patient + Vitals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Patient Info */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">👤 Data Pasien</div>
              </div>
              <div className="card-body" style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="soap-section" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                  <label className="field-required">Nama Pasien</label>
                  <input className="form-input" value={form.patient_name} onChange={e => setField('form', 'patient_name', e.target.value)}
                    placeholder="Nama lengkap" style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 13 }} />
                </div>
                <div className="soap-section" style={{ marginBottom: 0 }}>
                  <label>No. BPJS / ID</label>
                  <input className="form-input" value={form.patient_id} onChange={e => setField('form', 'patient_id', e.target.value)}
                    placeholder="Nomor BPJS" style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 13 }} />
                </div>
                <div className="soap-section" style={{ marginBottom: 0 }}>
                  <label>Usia</label>
                  <input type="number" value={form.age} onChange={e => setField('form', 'age', e.target.value)}
                    placeholder="tahun" style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 13 }} />
                </div>
                <div className="soap-section" style={{ marginBottom: 0 }}>
                  <label>Gender</label>
                  <select value={form.gender} onChange={e => setField('form', 'gender', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 13 }}>
                    <option>Laki-laki</option><option>Perempuan</option>
                  </select>
                </div>
                <div className="soap-section" style={{ marginBottom: 0 }}>
                  <label>Jenis Pelayanan</label>
                  <select value={form.service_type} onChange={e => setField('form', 'service_type', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 13 }}>
                    <option>Rawat Jalan</option><option>Rawat Inap</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Vital Signs */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">🩺 Tanda Vital</div>
                  <div className="card-subtitle">Semua field disarankan untuk analisis AI akurat</div>
                </div>
              </div>
              <div className="card-body" style={{ padding: 16 }}>
                <div className="vital-grid">
                  {VITAL_FIELDS.map(f => {
                    const warn = vitalWarnings.find(w => w.key === f.key);
                    return (
                      <div className="vital-field" key={f.key}>
                        <label>{f.label}</label>
                        <input
                          type={f.type}
                          step={f.type === 'number' ? 'any' : undefined}
                          placeholder={f.placeholder}
                          value={vitals[f.key]}
                          onChange={e => setField('vitals', f.key, e.target.value)}
                          style={warn ? { borderColor: warn.level === 'danger' ? 'var(--accent-danger)' : 'var(--accent-warning)' } : {}}
                        />
                        <div className="unit">{f.unit}</div>
                        {warn && (
                          <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2,
                            color: warn.level === 'danger' ? 'var(--accent-danger)' : 'var(--accent-warning)' }}>
                            ⚠️ {warn.msg}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {vitalWarnings.length > 0 && (
                  <div className="inline-alert alert-warning" style={{ marginTop: 12 }}>
                    ⚠️ Terdeteksi {vitalWarnings.length} tanda vital abnormal — pastikan data benar
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: SOAP */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">📋 Data SOAP</div>
                  <div className="card-subtitle">Semua data klinis wajib diisi</div>
                </div>
              </div>
              <div className="card-body" style={{ padding: 16 }}>
                <div className="soap-section">
                  <label className="field-required">💬 S — Subjective</label>
                  <textarea placeholder="Keluhan utama pasien (gejala yang dirasakan)..."
                    value={soap.subjective} onChange={e => setField('soap', 'subjective', e.target.value)}
                    style={{ minHeight: 90 }} />
                </div>
                <div className="soap-section">
                  <label className="field-required">🔬 O — Objective</label>
                  <textarea placeholder="Hasil pemeriksaan fisik dan laboratorium..."
                    value={soap.objective} onChange={e => setField('soap', 'objective', e.target.value)}
                    style={{ minHeight: 90 }} />
                </div>
                <div className="soap-section">
                  <label className="field-required">🏥 A — Assessment</label>
                  <textarea placeholder="Penilaian klinis dan diagnosis awal..."
                    value={soap.assessment} onChange={e => setField('soap', 'assessment', e.target.value)}
                    style={{ minHeight: 90 }} />
                </div>
                <div className="soap-section">
                  <label>📝 P — Plan</label>
                  <textarea placeholder="Rencana tindakan dan terapi (opsional)..."
                    value={soap.plan} onChange={e => setField('soap', 'plan', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              id="btn-submit-analysis"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 14, fontWeight: 700 }}
              disabled={loading || !isFormValid()}
            >
              {loading ? (
                <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Memproses AI Analysis...</>
              ) : '🤖 Generate AI Recommendation & Validasi'}
            </button>

            {!isFormValid() && (
              <div className="inline-alert alert-info">
                ℹ️ Lengkapi field bertanda <span style={{ color: 'var(--accent-danger)', fontWeight: 700 }}>*</span> untuk mengaktifkan submit
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const ValidationContext = createContext(null);

// ================================================================
//  DOCUMENT REQUIREMENTS PER SEVERITY LEVEL
// ================================================================
const DOC_REQ = {
  1: {
    has_medical_resume:        { label: 'Resume Medis Lengkap',       required: true,  recommended: false, note: 'ICD + Tindakan + Kronologi' },
    has_lab_results:           { label: 'Hasil Laboratorium',         required: false, recommended: true,  note: 'Disarankan Level 1' },
    has_imaging:               { label: 'Radiologi / Imaging',        required: false, recommended: false, note: 'Opsional' },
    has_specialist_consultation:{ label: 'Konsultasi Dokter Spesialis', required: false, recommended: false, note: 'Opsional' },
    has_iv_therapy_proof:      { label: 'Bukti Terapi IV',            required: false, recommended: false, note: 'Opsional' },
    has_daily_care_notes:      { label: 'Catatan Harian Perawatan',   required: false, recommended: false, note: 'Opsional' },
    has_min_5day_inpatient:    { label: 'Surat Rawat Inap ≥ 5 Hari',  required: false, recommended: false, note: 'Opsional' },
  },
  2: {
    has_medical_resume:        { label: 'Resume Medis Lengkap',       required: true,  recommended: false, note: 'WAJIB Level 2' },
    has_lab_results:           { label: 'Hasil Laboratorium',         required: true,  recommended: false, note: 'WAJIB Level 2' },
    has_imaging:               { label: 'Radiologi / Imaging',        required: false, recommended: true,  note: 'Disarankan Level 2' },
    has_specialist_consultation:{ label: 'Konsultasi Dokter Spesialis', required: true,  recommended: false, note: 'WAJIB Level 2' },
    has_iv_therapy_proof:      { label: 'Bukti Terapi IV',            required: false, recommended: false, note: 'Opsional' },
    has_daily_care_notes:      { label: 'Catatan Harian Perawatan',   required: false, recommended: true,  note: 'Disarankan Level 2' },
    has_min_5day_inpatient:    { label: 'Surat Rawat Inap ≥ 5 Hari',  required: false, recommended: false, note: 'Opsional' },
  },
  3: {
    has_medical_resume:        { label: 'Resume Medis Lengkap',       required: true,  recommended: false, note: 'WAJIB Level 3' },
    has_lab_results:           { label: 'Hasil Laboratorium',         required: true,  recommended: false, note: 'WAJIB Level 3' },
    has_imaging:               { label: 'Radiologi / Imaging',        required: true,  recommended: false, note: 'WAJIB Level 3' },
    has_specialist_consultation:{ label: 'Konsultasi Dokter Spesialis', required: true,  recommended: false, note: 'WAJIB Level 3' },
    has_iv_therapy_proof:      { label: 'Bukti Terapi IV',            required: true,  recommended: false, note: 'WAJIB jika ada terapi IV' },
    has_daily_care_notes:      { label: 'Catatan Harian Perawatan',   required: true,  recommended: false, note: 'WAJIB Level 3' },
    has_min_5day_inpatient:    { label: 'Surat Rawat Inap ≥ 5 Hari',  required: false, recommended: true,  note: 'Disarankan Level 3' },
  },
};

// ================================================================
//  ICD-10 CHAPTER → KEYWORD MAP (for SOAP coherence)
// ================================================================
const CHAPTER_KEYWORDS = {
  A: ['infeksi','diare','gastro','muntah','demam','bakteri','virus','parasit','typhoid','tifus','malaria','tb','tuberkulosis'],
  B: ['infeksi','virus','parasit','hiv','hepatitis','jamur'],
  C: ['kanker','tumor','malignan','karsinoma','neoplasma','benjolan'],
  D: ['anemia','darah','platelet','trombosit','leukemia','limfoma'],
  E: ['diabetes','gula','tiroid','hormon','dehidrasi','hipoglikemia','kolesterol','obesitas','malnutrisi'],
  F: ['jiwa','psikis','depresi','ansietas','cemas','skizofrenia','insomnia','bipolar'],
  G: ['saraf','otak','stroke','kejang','epilepsi','neuropati','parkinson','migrain'],
  H: ['mata','telinga','visus','pendengaran','konjungtivitis','katarak','otitis'],
  I: ['jantung','kardio','hipertensi','koroner','gagal jantung','aritmia','iskemia','palpitasi'],
  J: ['napas','paru','asma','bronkitis','pneumonia','sesak','batuk','ispa','influenza','faringitis'],
  K: ['perut','pencernaan','lambung','hepatitis','usus','gastritis','ulkus','kolik','appendisitis'],
  L: ['kulit','gatal','ruam','dermatitis','urtikaria','psoriasis','selulitis'],
  M: ['sendi','tulang','otot','artritis','fraktur','nyeri punggung','osteoporosis','reumatik'],
  N: ['ginjal','urin','kandung kemih','batu ginjal','infeksi saluran kemih','prostat'],
  O: ['hamil','persalinan','obstetri','kehamilan','preeklampsia','janin'],
  R: ['demam','nyeri','gejala','mual','pusing','lemas','sinkop'],
  S: ['luka','trauma','cedera','fraktur','patah','keseleo','dislokasi'],
  T: ['keracunan','luka bakar','efek samping','alergi obat'],
  Z: ['pemeriksaan','kontrol','skrining','vaksinasi','imunisasi'],
};

// Chapter coherence map: which secondary chapters make sense with which primary chapter
const COHERENT_CHAPTERS = {
  A: ['A','B','E','R','K','D'], B: ['A','B','E','R','D'],
  C: ['C','D','R','Z'], D: ['D','C','R','E'],
  E: ['E','A','K','N','I','R'], F: ['F','R','G'],
  G: ['G','R','I','M'], H: ['H','R'],
  I: ['I','J','N','E','R'], J: ['J','I','A','R','E'],
  K: ['K','A','E','R','B'], L: ['L','R','A','E'],
  M: ['M','S','R','G'], N: ['N','E','A','R'],
  O: ['O','E','I','R','D'], R: ['R','A','E','I','J','K'],
  S: ['S','T','R','M'], T: ['T','S','R'],
  Z: ['Z','R'],
};

// ================================================================
//  INACBG LINKAGE MAP
// ================================================================
function checkINACBGLinkage(diagCode, inacbg) {
  if (!diagCode || !inacbg) return true;
  const ch = (diagCode.charAt(0) || '').toUpperCase();
  const ic = (inacbg.charAt(0) || '').toUpperCase();
  const map = {
    A:['A','P'], B:['A','P'], C:['C'], D:['D'], E:['E','N'],
    F:['F'], G:['G'], H:['H'], I:['I'], J:['J'], K:['K'],
    L:['L'], M:['M'], N:['N'], O:['O'], P:['P'], Q:['Q'],
    R:['R','P'], S:['S','T'], T:['S','T'], Z:['Z'],
  };
  const allowed = map[ch] || [];
  if (allowed.length === 0) return true;
  return allowed.includes(ic);
}

// ================================================================
//  PROVIDER
// ================================================================
export function ValidationProvider({ children }) {
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [selectedPrimaryDiagnosis, setSelectedPrimaryDiagnosis] = useState(null);
  const [selectedSecondaryDiagnoses, setSelectedSecondaryDiagnoses] = useState([]);
  const [selectedTreatments, setSelectedTreatments] = useState([]);
  const [documentChecklist, setDocumentChecklist] = useState({
    has_medical_resume: false,
    has_lab_results: false,
    has_imaging: false,
    has_specialist_consultation: false,
    has_iv_therapy_proof: false,
    has_daily_care_notes: false,
    has_min_5day_inpatient: false,
    severity_level: null,
  });

  // Load analysis data and initialize selections
  const loadAnalysis = useCallback((analysis) => {
    setCurrentAnalysis(analysis);
    const diagList = analysis?.diagnosis || analysis?.diagnosis_primer?.map(d => ({
      code: d.kode, title: d.nama, is_primary: true, confidence: d.confidence,
      reason: d.alasan, inacbg: d.inacbg, cost: d.cost, inacbg_list: d.inacbgList, fromMaster: true,
    })) || [];

    const secList = analysis?.diagnosis_sekunder?.map(d => ({
      code: d.kode, title: d.nama, is_primary: false, confidence: d.confidence,
      reason: d.alasan, inacbg: d.inacbg, cost: d.cost, fromMaster: true,
    })) || [];

    const allDiag = [...diagList, ...secList];
    const prim = allDiag.find(d => d.is_primary) || allDiag[0];
    if (prim) setSelectedPrimaryDiagnosis({ ...prim, fromMaster: true });
    else setSelectedPrimaryDiagnosis(null);

    setSelectedSecondaryDiagnoses(
      allDiag.filter(d => !d.is_primary).slice(0, 2).map(d => ({ ...d, fromMaster: true }))
    );

    const treats = analysis?.treatment || analysis?.tindakan_medis?.map(t => ({
      code: t.kode, title: t.nama, category: t.kategori, inacbg: t.inacbg,
      cost: t.cost, confidence: t.confidence, reason: t.alasan,
      inacbg_list: t.inacbgList, selected: true,
    })) || [];
    setSelectedTreatments(treats.map(t => ({ ...t, selected: t.selected !== false })));

    const sevLevel = analysis?.severity_level
      || analysis?.severity?.[0]?.level
      || 1;
    setDocumentChecklist({
      has_medical_resume: false, has_lab_results: false, has_imaging: false,
      has_specialist_consultation: false, has_iv_therapy_proof: false,
      has_daily_care_notes: false, has_min_5day_inpatient: false,
      severity_level: sevLevel,
    });
  }, []);

  const resetValidation = useCallback(() => {
    setCurrentAnalysis(null);
    setSelectedPrimaryDiagnosis(null);
    setSelectedSecondaryDiagnoses([]);
    setSelectedTreatments([]);
    setDocumentChecklist({
      has_medical_resume: false, has_lab_results: false, has_imaging: false,
      has_specialist_consultation: false, has_iv_therapy_proof: false,
      has_daily_care_notes: false, has_min_5day_inpatient: false,
      severity_level: null,
    });
  }, []);

  // ================================================================
  //  COHERENCE CHECK
  // ================================================================
  const coherence = useMemo(() => {
    if (!selectedPrimaryDiagnosis || !currentAnalysis) {
      return { score: 0, status: 'unknown', items: [], warnings: [] };
    }
    const soaText = [
      currentAnalysis.subjective || '',
      currentAnalysis.objective || currentAnalysis.objectif || '',
      currentAnalysis.assessment || currentAnalysis.assesment || '',
    ].join(' ').toLowerCase();

    const items = [];
    const warnings = [];
    let score = 100;

    // Check 1: from master
    items.push({
      ok: !!selectedPrimaryDiagnosis.fromMaster,
      msg: selectedPrimaryDiagnosis.fromMaster
        ? 'Diagnosis dari master database' : 'Diagnosis TIDAK dari master database',
    });
    if (!selectedPrimaryDiagnosis.fromMaster) score -= 20;

    // Check 2: SOAP keyword coherence
    const ch = (selectedPrimaryDiagnosis.code || '').charAt(0).toUpperCase();
    const kws = CHAPTER_KEYWORDS[ch] || [];
    if (kws.length > 0) {
      const matches = kws.filter(kw => soaText.includes(kw)).length;
      const coherent = matches >= 1;
      items.push({
        ok: coherent,
        msg: coherent
          ? `Gejala SOAP sesuai chapter ICD-10 "${ch}" (${matches} kata kunci cocok)`
          : `Gejala SOAP tidak cocok chapter ICD-10 "${ch}"`,
      });
      if (!coherent) {
        score -= 30;
        warnings.push(`Diagnosis [${selectedPrimaryDiagnosis.code}] tidak didukung gejala dalam SOAP`);
      }
    } else {
      items.push({ ok: true, msg: 'Chapter ICD-10 tidak perlu validasi kata kunci spesifik' });
    }

    // Check 3: secondary coherence
    if (selectedSecondaryDiagnoses.length > 0) {
      const allowed = COHERENT_CHAPTERS[ch] || [ch, 'R'];
      const incoherent = selectedSecondaryDiagnoses.filter(s => {
        const sc = (s.code || '').charAt(0).toUpperCase();
        return !allowed.includes(sc);
      });
      items.push({
        ok: incoherent.length === 0,
        msg: incoherent.length === 0
          ? 'Diagnosis sekunder koheren dengan primer'
          : `${incoherent.length} diagnosis sekunder tidak koheren dengan primer`,
      });
      if (incoherent.length > 0) {
        score -= 15;
        warnings.push('Diagnosis sekunder tidak mendukung primer (chapter ICD-10 tidak sesuai)');
      }
    }

    score = Math.max(0, Math.min(100, score));
    return {
      score,
      status: score >= 70 ? 'ok' : score >= 50 ? 'warn' : 'error',
      items,
      warnings,
    };
  }, [selectedPrimaryDiagnosis, selectedSecondaryDiagnoses, currentAnalysis]);

  // ================================================================
  //  RULES ENGINE — FULL VALIDATION
  // ================================================================
  const validation = useMemo(() => {
    const errors = [];
    const warnings = [];
    let score = 100;
    const sevLevel = documentChecklist.severity_level || 1;
    const reqDocs = DOC_REQ[sevLevel] || DOC_REQ[1];
    const requiredEntries = Object.entries(reqDocs).filter(([, v]) => v.required);
    const missingDocs = requiredEntries.filter(([k]) => !documentChecklist[k]);

    // RULE 1: Diagnosis must be from master
    if (!selectedPrimaryDiagnosis) {
      errors.push('Diagnosis primer wajib dipilih (minimal 1)');
      score -= 25;
    } else if (!selectedPrimaryDiagnosis.fromMaster) {
      errors.push('Diagnosis harus dipilih dari database master, bukan diketik manual');
      score -= 15;
    }

    // RULE 2: SOAP coherence
    if (selectedPrimaryDiagnosis && coherence.score < 50) {
      errors.push(`Data klinis SOAP tidak mendukung diagnosis (score: ${coherence.score}%)`);
      score -= 20;
    } else if (selectedPrimaryDiagnosis && coherence.score < 70) {
      warnings.push(`Koherensi klinis sedang (${coherence.score}%) — periksa kesesuaian diagnosis`);
      score -= 10;
    }

    // RULE 3: Secondary coherence
    if (selectedSecondaryDiagnoses.length > 0 && selectedPrimaryDiagnosis) {
      const ch = (selectedPrimaryDiagnosis.code || '').charAt(0).toUpperCase();
      const allowed = COHERENT_CHAPTERS[ch] || [ch, 'R'];
      const incoherent = selectedSecondaryDiagnoses.filter(s => {
        const sc = (s.code || '').charAt(0).toUpperCase();
        return !allowed.includes(sc);
      });
      if (incoherent.length > 0) {
        warnings.push(`Diagnosis sekunder tidak koheren dengan primer (${incoherent.length} diagnosis)`);
        score -= 10;
      }
    }

    // RULE 4: INACBG linkage
    const hasLinkIssue = selectedTreatments.some(
      t => t.selected !== false && !checkINACBGLinkage(selectedPrimaryDiagnosis?.code, t.inacbg)
    );
    if (hasLinkIssue && selectedPrimaryDiagnosis) {
      warnings.push('Ada tindakan dengan INA-CBG tidak sesuai diagnosis primer');
      score -= 20;
    }

    // RULE 5: Documents
    missingDocs.forEach(([k]) => {
      errors.push(`Dokumen wajib belum lengkap: ${reqDocs[k].label}`);
      score -= 10;
    });

    // RULE 6: AI deviation
    const aiDiags = currentAnalysis?.diagnosis || currentAnalysis?.diagnosis_primer || [];
    const aiPrim = Array.isArray(aiDiags) ? aiDiags.find(d => d.is_primary || d.rekomendasi_ai) : null;
    const aiCode = aiPrim?.code || aiPrim?.kode;
    if (selectedPrimaryDiagnosis && aiCode && selectedPrimaryDiagnosis.code !== aiCode) {
      warnings.push(`Diagnosis dokter berbeda dari AI (AI: [${aiCode}], Dokter: [${selectedPrimaryDiagnosis.code}])`);
      score -= 15;
    }

    score = Math.max(0, Math.min(100, score));
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore: score,
      riskLevel: score >= 85 ? 'low' : score >= 60 ? 'medium' : 'high',
    };
  }, [selectedPrimaryDiagnosis, selectedSecondaryDiagnoses, selectedTreatments, documentChecklist, coherence, currentAnalysis]);

  const value = useMemo(() => ({
    // State
    currentAnalysis, selectedPrimaryDiagnosis, selectedSecondaryDiagnoses,
    selectedTreatments, documentChecklist, validation, coherence,
    // Setters
    setCurrentAnalysis, setSelectedPrimaryDiagnosis, setSelectedSecondaryDiagnoses,
    setSelectedTreatments, setDocumentChecklist,
    // Actions
    loadAnalysis, resetValidation,
    // Constants
    DOC_REQ, checkINACBGLinkage,
  }), [
    currentAnalysis, selectedPrimaryDiagnosis, selectedSecondaryDiagnoses,
    selectedTreatments, documentChecklist, validation, coherence,
    loadAnalysis, resetValidation,
  ]);

  return (
    <ValidationContext.Provider value={value}>
      {children}
    </ValidationContext.Provider>
  );
}

export function useValidation() {
  const ctx = useContext(ValidationContext);
  if (!ctx) throw new Error('useValidation must be used within ValidationProvider');
  return ctx;
}

export { DOC_REQ, checkINACBGLinkage };

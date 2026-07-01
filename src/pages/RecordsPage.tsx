import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useAppData } from '../context/MedicalDataContext';
import { setAppointmentAutofill } from './AppointmentsPage';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { ConfirmDialog } from '../components/ui/EmptyState';
import { RecordForm } from '../components/forms/RecordForm';
import type { MedicalRecord, RecordType } from '../types';
import { RECORD_TYPE_LABELS } from '../types';
import {
  ACCEPTED_UPLOAD_MIME,
  ACCEPTED_UPLOAD_TYPES,
  extractTextFromFile,
  getFileKind,
  type ExtractionMethod,
} from '../utils/fileExtraction';
import { buildAppointmentNotes, parseAutofillFromText, type AutofillResult } from '../utils/autofillParser';
import { formatDate, sortByDateDesc } from '../utils/format';
import { Checkbox, Input, Select, Textarea } from '../components/ui/FormFields';
import { SpecialtySelect } from '../components/ui/SpecialtySelect';

const METHOD_LABELS: Record<ExtractionMethod, string> = {
  pdf: 'PDF',
  ocr: 'OCR',
  text: 'Text',
  none: 'None',
};

const emptyReview = (fileName = ''): AutofillResult => ({
  providerName: '', specialty: '', visitDate: '', visitTime: '', reasonForVisit: '',
  prescriptions: '', diagnosis: '', treatmentPlan: '', followUpNotes: '',
  dischargeInstructions: '', documents: fileName, extraNotes: '', followUpNeeded: false, clinic: '',
});

export function RecordsPage() {
  const { data, setData } = useAppData();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('id');
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadFormRef = useRef<HTMLDivElement>(null);

  const [showUpload, setShowUpload] = useState(false);
  const [editRecord, setEditRecord] = useState<MedicalRecord | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [extractionMethod, setExtractionMethod] = useState<ExtractionMethod | null>(null);
  const [extractionWarning, setExtractionWarning] = useState('');
  const [useOcr, setUseOcr] = useState(true);
  const [loading, setLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [review, setReview] = useState<AutofillResult>(emptyReview());
  const [recordType, setRecordType] = useState<RecordType>('visit_note');
  const [attachToId, setAttachToId] = useState('');
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    const state = location.state as { openUpload?: boolean } | null;
    if (state?.openUpload) setShowUpload(true);
  }, [location.state]);

  useEffect(() => {
    if (showUpload) {
      requestAnimationFrame(() => {
        uploadFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [showUpload]);

  const sorted = [...data.records].sort((a, b) => sortByDateDesc(a.date || a.uploadDate, b.date || b.uploadDate));

  const resetUpload = () => {
    setFile(null);
    setExtractedText('');
    setExtractionMethod(null);
    setExtractionWarning('');
    setReview(emptyReview());
    setAttachToId('');
    setLoading(false);
    setSaveMsg('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const applyAutofill = (text: string, fileName: string) => {
    setReview(parseAutofillFromText(text, fileName));
  };

  const processFile = async (selected: File) => {
    setFile(selected);
    setLoading(true);
    setReview(emptyReview(selected.name));
    setSaveMsg('');
    try {
      const result = await extractTextFromFile(selected, {
        useOcr: getFileKind(selected) === 'image' && useOcr,
        onOcrProgress: setOcrProgress,
      });
      setExtractedText(result.text);
      setExtractionMethod(result.method);
      setExtractionWarning(result.warning ?? '');
      if (result.text.trim()) {
        applyAutofill(result.text, selected.name);
      } else {
        setReview((r) => ({ ...r, documents: selected.name }));
      }
    } catch (err) {
      setExtractionWarning(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setLoading(false);
      setOcrProgress(0);
      requestAnimationFrame(() => {
        uploadFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const saveRecord = (partial?: Partial<MedicalRecord>) => {
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const record: MedicalRecord = {
      id: uuidv4(),
      recordType,
      date: review.visitDate || today,
      uploadDate: today,
      provider: review.providerName,
      summary: review.reasonForVisit || review.diagnosis || file?.name || 'Uploaded record',
      notes: review.extraNotes,
      fileName: file?.name ?? review.documents,
      extractedText: extractedText.slice(0, 5000),
      createdAt: now,
      updatedAt: now,
      ...partial,
    };
    setData((d) => ({ ...d, records: [...d.records, record] }));
    if (attachToId) {
      setData((d) => ({
        ...d,
        appointments: d.appointments.map((a) =>
          a.id === attachToId ? { ...a, relatedRecordIds: [...(a.relatedRecordIds ?? []), record.id] } : a,
        ),
      }));
    }
    return record;
  };

  const handleSaveAsRecord = () => {
    saveRecord();
    setSaveMsg('Medical record saved.');
    resetUpload();
    setShowUpload(false);
  };

  const handleCreateAppointment = () => {
    const parsed = { ...review };
    if (!parsed.providerName && extractedText) Object.assign(parsed, parseAutofillFromText(extractedText, file?.name));
    parsed.extraNotes = buildAppointmentNotes(parsed, extractedText);
    setAppointmentAutofill(parsed);
    saveRecord();
    navigate('/appointments');
  };

  const handleAttach = () => {
    if (!attachToId) return;
    saveRecord();
    setSaveMsg('Record saved and attached.');
    resetUpload();
    setShowUpload(false);
  };

  const handleClearUpload = () => {
    resetUpload();
    setShowUpload(false);
  };

  const saveEdited = (record: MedicalRecord) => {
    setData((d) => ({
      ...d,
      records: d.records.map((r) => (r.id === record.id ? record : r)),
    }));
    setEditRecord(undefined);
  };

  const showFormActions = showUpload && file && !loading;

  return (
    <div className={`space-y-6 ${showFormActions ? 'pb-28 md:pb-6' : ''}`}>
      <PageHeader
        title="Records"
        subtitle="Document center — upload, review, then save"
        actions={
          <Button onClick={() => { resetUpload(); setShowUpload(true); }}>Upload</Button>
        }
      />

      <p className="text-sm card px-4 py-3 scroll-mt-24" style={{ color: 'var(--color-muted)' }}>
        Files are processed in your browser only. Nothing saves until you confirm below.
      </p>

      {showUpload && (
        <div
          ref={uploadFormRef}
          id="upload-form"
          className="card p-5 space-y-4 scroll-mt-24"
        >
          <h2 className="text-[17px] font-semibold">Upload medical record</h2>
          <input ref={fileRef} type="file" accept={`${ACCEPTED_UPLOAD_TYPES},${ACCEPTED_UPLOAD_MIME}`} className="hidden" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
          {!file ? (
            <button type="button" onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed rounded-2xl p-10 opacity-60 hover:opacity-100 transition-opacity" style={{ borderColor: 'var(--color-border)' }}>
              Choose PDF, image, or text file
            </button>
          ) : (
            <div className="flex justify-between items-center p-3 rounded-xl bg-black/5 dark:bg-white/5">
              <span className="font-medium truncate">{file.name}</span>
              <Button size="sm" variant="ghost" onClick={resetUpload}>Remove file</Button>
            </div>
          )}
          {file && getFileKind(file) === 'image' && (
            <Checkbox label="Use OCR (tesseract.js)" checked={useOcr} onChange={(v) => { setUseOcr(v); processFile(file); }} />
          )}
          {loading && <p className="text-sm">Extracting… {ocrProgress > 0 ? `${ocrProgress}%` : ''}</p>}
          {extractionMethod && <span className="text-xs px-2 py-1 rounded-full badge-scheduled">{METHOD_LABELS[extractionMethod]}</span>}
          {extractionWarning && <p className="text-sm text-amber-700 dark:text-amber-400">{extractionWarning}</p>}

          {file && !loading && (
            <>
              <div>
                <label htmlFor="extracted-text-preview" className="field-label">
                  Extracted text (editable preview)
                </label>
                <textarea
                  id="extracted-text-preview"
                  className="extracted-text-preview"
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  rows={4}
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => file && applyAutofill(extractedText, file.name)}
                disabled={!extractedText.trim()}
              >
                Auto-fill fields from text
              </Button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Provider" value={review.providerName} onChange={(e) => setReview({ ...review, providerName: e.target.value })} />
                <SpecialtySelect
                  label="Specialty"
                  value={review.specialty}
                  onChange={(v) => setReview({ ...review, specialty: v })}
                />
                <Select label="Record type" value={recordType} onChange={(e) => setRecordType(e.target.value as RecordType)}>
                  {Object.entries(RECORD_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
                <Input label="Visit / record date" type="date" value={review.visitDate} onChange={(e) => setReview({ ...review, visitDate: e.target.value })} />
                <Input label="Visit time" value={review.visitTime} onChange={(e) => setReview({ ...review, visitTime: e.target.value })} placeholder="e.g. 10:00 AM – 10:50 AM" />
                <Input label="Original filename" value={review.documents} onChange={(e) => setReview({ ...review, documents: e.target.value })} className="sm:col-span-2" />
              </div>
              <Textarea label="Summary / reason" value={review.reasonForVisit} onChange={(e) => setReview({ ...review, reasonForVisit: e.target.value })} rows={2} />
              <Textarea label="Notes" value={review.extraNotes} onChange={(e) => setReview({ ...review, extraNotes: e.target.value })} rows={3} />
              {data.appointments.length > 0 && (
                <Select label="Attach to appointment (optional)" value={attachToId} onChange={(e) => setAttachToId(e.target.value)}>
                  <option value="">None</option>
                  {data.appointments.map((a) => <option key={a.id} value={a.id}>{a.doctorName} — {a.date}</option>)}
                </Select>
              )}
              {saveMsg && <p className="text-sm text-emerald-600 dark:text-emerald-400">{saveMsg}</p>}
            </>
          )}
        </div>
      )}

      {showFormActions && (
        <div className="upload-action-bar">
          <div className="max-w-4xl mx-auto flex flex-wrap gap-2">
            <Button variant="ghost" onClick={handleClearUpload}>Clear upload</Button>
            <Button onClick={handleSaveAsRecord}>Save as Record</Button>
            <Button variant="secondary" onClick={handleCreateAppointment}>Create Appointment</Button>
            {attachToId && (
              <Button variant="secondary" onClick={handleAttach}>Attach to Existing Appointment</Button>
            )}
          </div>
        </div>
      )}

      {sorted.length === 0 && !showUpload ? (
        <div className="card p-10 text-center opacity-50">No records yet — upload your first document</div>
      ) : (
        <div className="space-y-3">
          {sorted.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setEditRecord(r)}
              className={`card card-hover w-full text-left p-5 ${highlightId === r.id ? 'ring-2 ring-[var(--color-accent)]' : ''}`}
            >
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[17px] font-semibold truncate">{r.summary || r.fileName}</p>
                  <p className="text-sm opacity-50">{RECORD_TYPE_LABELS[r.recordType]} · {r.provider}</p>
                  {r.fileName && <p className="text-xs text-[var(--color-accent)] mt-1">{r.fileName}</p>}
                </div>
                <p className="text-sm opacity-50 shrink-0">{formatDate(r.date || r.uploadDate)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal open={!!editRecord} onClose={() => setEditRecord(undefined)} title="Edit Record" wide>
        {editRecord && <RecordForm initial={editRecord} onSubmit={saveEdited} onCancel={() => setEditRecord(undefined)} />}
      </Modal>
      <ConfirmDialog open={!!deleteId} title="Delete record?" message="Cannot be undone." confirmLabel="Delete" danger onConfirm={() => { if (deleteId) setData((d) => ({ ...d, records: d.records.filter((r) => r.id !== deleteId) })); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />
    </div>
  );
}

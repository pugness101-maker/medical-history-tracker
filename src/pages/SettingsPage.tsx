import { useRef, useState } from 'react';
import { useAppData } from '../context/MedicalDataContext';
import { createSampleData } from '../storage/sampleData';
import { exportAppData, importAppData } from '../storage/storage';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { PRIVACY_WARNING } from '../types/profile';
import { STORAGE_KEY } from '../types';

export function SettingsPage() {
  const { data, setData, replaceAll, reset } = useAppData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmSample, setConfirmSample] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const [importError, setImportError] = useState('');

  const storageSize = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (raw.length / 1024).toFixed(1) : '0';
    } catch {
      return '?';
    }
  })();

  const handleExport = () => {
    const blob = new Blob([exportAppData(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `medical-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        importAppData(ev.target?.result as string);
        setPendingImport(ev.target?.result as string);
        setConfirmImport(true);
        setImportError('');
      } catch {
        setImportError('Invalid backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const toggleTheme = () => {
    setData((d) => ({
      ...d,
      settings: { theme: d.settings.theme === 'light' ? 'dark' : 'light' },
    }));
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Backup, theme & privacy" />

      <section className="card p-5 space-y-4">
        <h2 className="text-[17px] font-semibold">Theme</h2>
        <div className="flex items-center justify-between">
          <span className="text-[15px]">Appearance</span>
          <Button variant="secondary" onClick={toggleTheme}>
            {data.settings.theme === 'light' ? 'Light' : 'Dark'} — tap to switch
          </Button>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="text-[17px] font-semibold">Local storage</h2>
        <p className="text-[15px] opacity-60">
          All data is stored in your browser under <code className="text-sm bg-black/5 dark:bg-white/10 px-1 rounded">{STORAGE_KEY}</code>.
          Current size: ~{storageSize} KB. Nothing is sent to a server.
        </p>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="text-[17px] font-semibold">Backup</h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleExport}>Export JSON backup</Button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>Import JSON backup</Button>
        </div>
        {importError && <p className="text-sm text-red-600">{importError}</p>}
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="text-[17px] font-semibold">Privacy notice</h2>
        <p className="text-[15px] opacity-70 leading-relaxed">
          This app is for personal tracking only and does not replace medical advice.
          Uploaded files and health data stay on this device unless you export a backup.
        </p>
        <p className="text-sm opacity-60">{PRIVACY_WARNING}</p>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="text-[17px] font-semibold">Sample data</h2>
        <p className="text-sm opacity-60">Load demo data to explore the app. Replaces all current data.</p>
        <Button variant="secondary" onClick={() => setConfirmSample(true)}>Load sample data</Button>
      </section>

      <section className="card p-5 space-y-4 border-red-200 dark:border-red-900">
        <h2 className="text-[17px] font-semibold text-red-600">Danger zone</h2>
        <Button variant="danger" onClick={() => setConfirmClear(true)}>Clear all data</Button>
      </section>

      <ConfirmDialog open={confirmSample} title="Load sample data?" message="This replaces all current data." confirmLabel="Load" onConfirm={() => { replaceAll(createSampleData()); setConfirmSample(false); }} onCancel={() => setConfirmSample(false)} />
      <ConfirmDialog open={confirmImport} title="Import backup?" message="This overwrites all current data. Export first if you want to keep it." confirmLabel="Import" danger onConfirm={() => { if (pendingImport) replaceAll(importAppData(pendingImport)); setConfirmImport(false); setPendingImport(null); }} onCancel={() => { setConfirmImport(false); setPendingImport(null); }} />
      <ConfirmDialog open={confirmClear} title="Clear everything?" message="Permanently deletes all data on this device." confirmLabel="Clear" danger onConfirm={() => { reset(); setConfirmClear(false); }} onCancel={() => setConfirmClear(false)} />
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import type { AppData } from '../types';
import { STORAGE_KEY } from '../types';
import { emptyAppData, loadAppData, saveAppData } from '../storage/storage';

export function useMedicalData() {
  const [data, setData] = useState<AppData>(() => loadAppData(STORAGE_KEY));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setData(loadAppData(STORAGE_KEY));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      saveAppData(STORAGE_KEY, data);
    }
  }, [data, loaded]);

  const replaceAll = useCallback((newData: AppData) => {
    setData(newData);
  }, []);

  const reset = useCallback(() => {
    setData(emptyAppData());
  }, []);

  return { data, setData, replaceAll, reset, loaded };
}

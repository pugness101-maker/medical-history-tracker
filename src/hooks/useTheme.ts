import { useEffect } from 'react';
import type { AppSettings } from '../types';

export function applyTheme(theme: AppSettings['theme']) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function useTheme(settings: AppSettings) {
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);
}

import { useCallback, useState } from 'react';
import {
  DEFAULT_HEALTH_SECTIONS_OPEN,
  HEALTH_SECTION_IDS,
  loadHealthSectionState,
  saveHealthSectionState,
  type HealthSectionId,
} from '../utils/healthSectionState';

export function useHealthSectionState() {
  const [openSections, setOpenSections] = useState(loadHealthSectionState);

  const setSectionOpen = useCallback((id: HealthSectionId, open: boolean) => {
    setOpenSections((prev) => {
      const next = { ...prev, [id]: open };
      saveHealthSectionState(next);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const next = HEALTH_SECTION_IDS.reduce(
      (acc, sectionId) => {
        acc[sectionId] = true;
        return acc;
      },
      {} as Record<HealthSectionId, boolean>,
    );
    setOpenSections(next);
    saveHealthSectionState(next);
  }, []);

  const collapseAll = useCallback(() => {
    const next = { ...DEFAULT_HEALTH_SECTIONS_OPEN, preventive: false };
    setOpenSections(next);
    saveHealthSectionState(next);
  }, []);

  return { openSections, setSectionOpen, expandAll, collapseAll };
};

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Repo } from '../db/repo';
import type { Role, Staff } from '../db/types';
import { roleCan, ACTION_FEATURE, type Action } from '../lib/roles';
import { useCan } from '../license/LicenseGate';

interface Ctx {
  staff: Staff | null;
  hasStaff: boolean | null;       // null = still checking
  login: (s: Staff) => void;
  logout: () => void;
  refreshGate: () => Promise<void>;
  /** Role AND license must both allow the action. */
  can: (a: Action) => boolean;
}
const SessionCtx = createContext<Ctx>(null as any);
export const useSession = () => useContext(SessionCtx);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [hasStaff, setHasStaff] = useState<boolean | null>(null);
  const lic = useCan();

  const refreshGate = useCallback(async () => { const any = await Repo.anyStaffExists(); setHasStaff(any); if (!any) setStaff(null); }, []);
  useEffect(() => { refreshGate(); }, [refreshGate]);

  // auto-lock after a minute in the background
  const hiddenAt = useRef(0);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background' || s === 'inactive') { if (!hiddenAt.current) hiddenAt.current = Date.now(); return; }
      if (s === 'active' && hiddenAt.current && Date.now() - hiddenAt.current > 60000) setStaff(null);
      hiddenAt.current = 0;
    });
    return () => sub.remove();
  }, []);

  const can = useCallback((a: Action) => {
    const f = ACTION_FEATURE[a];
    return roleCan(staff?.role as Role | undefined, a) && (!f || lic(f));
  }, [staff, lic]);

  const value = useMemo<Ctx>(() => ({ staff, hasStaff, login: setStaff, logout: () => setStaff(null), refreshGate, can }), [staff, hasStaff, refreshGate, can]);
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

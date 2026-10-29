import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AlertStatus } from '@/core/alerts';

const STORAGE_KEY = 'datavital-demo-showcase';

export type Approval = 'approved' | 'rejected';

export function decisionKey(kpiKey: string, hospital: string, year: number, department: string) {
  return `${kpiKey}|${hospital}|${year}|${department}`;
}

export type ExperienceKind = 'satisfaction' | 'complaint' | 'survey' | 'discharge' | 'followup' | 'recovery';

export type ExperienceCase = {
  id: string;
  kind: ExperienceKind;
  title: string;
  detail: string;
  status: 'open' | 'reviewing' | 'closed';
};

type Persisted = {
  hospital: string;
  year: number;
  department: string;
  lang: 'en' | 'ar';
  country: string;
  facility: string;
  approvalPolicy: 'lead' | 'committee';
  approvals: Record<string, Approval>;
  alertStatus: Record<string, AlertStatus>;
  cases: ExperienceCase[];
  tourStep: number;
};

const INITIAL_CASES: ExperienceCase[] = [
  { id: 'PX-2401', kind: 'satisfaction', title: 'Ward B quiet-hours score', detail: 'Synthetic score dipped after a staffing gap on two evenings.', status: 'open' },
  { id: 'PX-2402', kind: 'complaint', title: 'Discharge instructions unclear', detail: 'Fictional family asked for a clearer medication list.', status: 'open' },
  { id: 'PX-2403', kind: 'survey', title: 'Post-visit survey, clinic 3', detail: 'Synthetic response rate is below the scenario target.', status: 'reviewing' },
  { id: 'PX-2404', kind: 'discharge', title: 'Weekend discharge experience', detail: 'Scenario shows longer pharmacy waits before leaving.', status: 'open' },
  { id: 'PX-2405', kind: 'followup', title: 'Seven-day follow-up calls', detail: 'A fictional cohort missed the day-7 call window.', status: 'reviewing' },
  { id: 'PX-2406', kind: 'recovery', title: 'Service recovery offer', detail: 'Scenario proposes a callback and a revised instruction sheet.', status: 'open' },
];

function fresh(): Persisted {
  return {
    hospital: 'H1',
    year: 2026,
    department: 'All',
    lang: 'en',
    country: 'sa',
    facility: 'General hospital',
    approvalPolicy: 'lead',
    approvals: {},
    alertStatus: {},
    cases: INITIAL_CASES,
    tourStep: 0,
  };
}

const memory = new Map<string, string>();

function storage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  try {
    if (typeof localStorage?.setItem === 'function' && typeof localStorage.getItem === 'function') {
      return localStorage;
    }
  } catch {
    /* Node may expose a localStorage shell without methods. */
  }
  return {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => {
      memory.set(key, value);
    },
    removeItem: (key) => {
      memory.delete(key);
    },
  };
}
function load(): Persisted {
  try {
    const raw = storage().getItem(STORAGE_KEY);
    if (!raw) return fresh();
    const parsed = JSON.parse(raw) as Persisted;
    return { ...fresh(), ...parsed, cases: parsed.cases?.length ? parsed.cases : INITIAL_CASES, alertStatus: parsed.alertStatus ?? {} };
  } catch {
    return fresh();
  }
}

type Store = Persisted & {
  setHospital: (hospital: string) => void;
  setYear: (year: number) => void;
  setDepartment: (department: string) => void;
  setCountry: (country: string) => void;
  setFacility: (facility: string) => void;
  setApprovalPolicy: (approvalPolicy: 'lead' | 'committee') => void;
  toggleLang: () => void;
  decide: (key: string, decision: Approval) => void;
  setAlertStatus: (id: string, status: AlertStatus) => void;
  advanceCase: (id: string) => void;
  setTourStep: (step: number) => void;
  reset: () => void;
};

const Ctx = createContext<Store | null>(null);

export function clearDemoStorage() {
  memory.clear();
  try {
    storage().removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function ShowcaseState({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(fresh);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(load());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    storage().setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready]);

  const api = useMemo<Store>(
    () => ({
      ...state,
      setHospital: (hospital) => setState((s) => ({ ...s, hospital })),
      setYear: (year) => setState((s) => ({ ...s, year })),
      setDepartment: (department) => setState((s) => ({ ...s, department })),
      setCountry: (country) => setState((s) => ({ ...s, country })),
      setFacility: (facility) => setState((s) => ({ ...s, facility })),
      setApprovalPolicy: (approvalPolicy) => setState((s) => ({ ...s, approvalPolicy })),
      toggleLang: () => setState((s) => ({ ...s, lang: s.lang === 'en' ? 'ar' : 'en' })),
      decide: (key, decision) => setState((s) => ({ ...s, approvals: { ...s.approvals, [key]: decision } })),
      setAlertStatus: (id, status) => setState((s) => ({ ...s, alertStatus: { ...s.alertStatus, [id]: status } })),
      advanceCase: (id) =>
        setState((s) => ({
          ...s,
          cases: s.cases.map((item) =>
            item.id === id
              ? { ...item, status: item.status === 'open' ? 'reviewing' : item.status === 'reviewing' ? 'closed' : 'closed' }
              : item,
          ),
        })),
      setTourStep: (tourStep) => setState((s) => ({ ...s, tourStep })),
      reset: () => {
        storage().removeItem(STORAGE_KEY);
        setState(fresh());
      },
    }),
    [state],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useShowcase(): Store {
  const value = useContext(Ctx);
  if (!value) throw new Error('showcase state missing');
  return value;
}

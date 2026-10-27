import { create } from 'zustand';
import type { GlobalFilterState } from '@/types/api';
import { defaultCalendarYear, resolveClientYearWindow } from '@/utils/yearWindow';

const DEFAULT_YEAR = defaultCalendarYear();
const DEFAULT_WINDOW = resolveClientYearWindow(DEFAULT_YEAR);

const FILTER_KEYS: (keyof GlobalFilterState)[] = [
  'year',
  'date_from',
  'date_to',
  'organization_key',
  'hospital_key',
  'facility_key',
  'department_key',
  'specialty_key',
  'provider_key',
  'payer_key',
  'gender',
  'age_group',
  'page',
  'page_size',
  'sort_by',
  'sort_order',
  'search',
];

function parseUrlFilters(search: string): Partial<GlobalFilterState> {
  const params = new URLSearchParams(search);
  const filters: Partial<GlobalFilterState> = {};

  FILTER_KEYS.forEach((key) => {
    const value = params.get(key);
    if (!value) return;

    if (
      [
        'year',
        'organization_key',
        'hospital_key',
        'facility_key',
        'department_key',
        'specialty_key',
        'provider_key',
        'payer_key',
        'page',
        'page_size',
      ].includes(key)
    ) {
      const num = Number(value);
      if (!Number.isNaN(num)) {
        (filters as Record<string, unknown>)[key] = num;
      }
    } else if (key === 'sort_order') {
      if (value === 'asc' || value === 'desc') filters.sort_order = value;
    } else {
      (filters as Record<string, unknown>)[key] = value;
    }
  });

  // Year is authoritative: if year present without dates, derive YTD/full-year window.
  if (filters.year != null && (!filters.date_from || !filters.date_to)) {
    const w = resolveClientYearWindow(filters.year);
    filters.date_from = filters.date_from ?? w.date_from;
    filters.date_to = filters.date_to ?? w.date_to;
  }

  return filters;
}

function filtersToSearchParams(filters: GlobalFilterState): string {
  const params = new URLSearchParams();
  FILTER_KEYS.forEach((key) => {
    const value = filters[key];
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const str = params.toString();
  return str ? `?${str}` : '';
}

export interface FilterState {
  filters: GlobalFilterState;
  lastRefreshAt: string | null;
  setFilter: <K extends keyof GlobalFilterState>(key: K, value: GlobalFilterState[K]) => void;
  setFilters: (partial: Partial<GlobalFilterState>) => void;
  setYear: (year: number) => void;
  resetFilters: () => void;
  syncFromUrl: (search: string) => void;
  syncToUrl: () => void;
  markRefreshed: () => void;
}

const defaultFilters: GlobalFilterState = {
  year: DEFAULT_YEAR,
  date_from: DEFAULT_WINDOW.date_from,
  date_to: DEFAULT_WINDOW.date_to,
  page: 1,
  page_size: 25,
  sort_order: 'desc',
};

export const useFilterStore = create<FilterState>((set, get) => ({
  filters: { ...defaultFilters },
  lastRefreshAt: null,
  setFilter: (key, value) =>
    set((state) => {
      const next = { ...state.filters, [key]: value };
      if (key === 'year' && typeof value === 'number') {
        const w = resolveClientYearWindow(value);
        next.date_from = w.date_from;
        next.date_to = w.date_to;
      }
      return { filters: next };
    }),
  setFilters: (partial) =>
    set((state) => {
      const next = { ...state.filters, ...partial };
      if (partial.year != null && (partial.date_from == null || partial.date_to == null)) {
        const w = resolveClientYearWindow(partial.year);
        next.date_from = partial.date_from ?? w.date_from;
        next.date_to = partial.date_to ?? w.date_to;
      }
      return { filters: next };
    }),
  setYear: (year) => {
    const w = resolveClientYearWindow(year);
    set((state) => ({
      filters: {
        ...state.filters,
        year,
        date_from: w.date_from,
        date_to: w.date_to,
        page: 1,
      },
    }));
  },
  resetFilters: () => {
    const y = defaultCalendarYear();
    const w = resolveClientYearWindow(y);
    set({
      filters: {
        year: y,
        date_from: w.date_from,
        date_to: w.date_to,
        page: 1,
        page_size: 25,
        sort_order: 'desc',
      },
    });
  },
  syncFromUrl: (search) => {
    const parsed = parseUrlFilters(search);
    set((state) => {
      const next = { ...defaultFilters, ...state.filters, ...parsed };
      // Ensure year always present after URL sync
      if (next.year == null) {
        next.year = defaultCalendarYear();
        const w = resolveClientYearWindow(next.year);
        next.date_from = next.date_from ?? w.date_from;
        next.date_to = next.date_to ?? w.date_to;
      }
      const same = FILTER_KEYS.every((key) => state.filters[key] === next[key]);
      return same ? state : { filters: next };
    });
  },
  syncToUrl: () => {
    const { filters } = get();
    const newSearch = filtersToSearchParams(filters);
    const currentPath = window.location.pathname;
    const newUrl = `${currentPath}${newSearch}`;
    if (`${window.location.pathname}${window.location.search}` !== newUrl) {
      window.history.replaceState(null, '', newUrl);
    }
  },
  markRefreshed: () => set({ lastRefreshAt: new Date().toISOString() }),
}));

export function getDefaultFilters(): GlobalFilterState {
  const y = defaultCalendarYear();
  const w = resolveClientYearWindow(y);
  return {
    year: y,
    date_from: w.date_from,
    date_to: w.date_to,
    page: 1,
    page_size: 25,
    sort_order: 'desc',
  };
}
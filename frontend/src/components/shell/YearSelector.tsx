import { FormControl, InputLabel, MenuItem, Select, type SelectChangeEvent } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchAvailableYears } from '@/api/filters';
import { useFilterStore } from '@/store/filterStore';
import { resolveClientYearWindow } from '@/utils/yearWindow';
import { TOUCH_TARGET_MIN } from '@/design-system/breakpoints';

interface YearSelectorProps {
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  /** When true, render a compact control suitable for the context bar. */
  compact?: boolean;
  /** Controlled mode (e.g. GlobalFilters draft state). */
  value?: number;
  onChange?: (year: number) => void;
  /** When false, do not write to filterStore / invalidate queries (controlled draft). */
  commitToStore?: boolean;
}

export default function YearSelector({
  size = 'small',
  fullWidth = false,
  compact = false,
  value: controlledValue,
  onChange,
  commitToStore = true,
}: YearSelectorProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const storeYear = useFilterStore((s) => s.filters.year);
  const hospitalKey = useFilterStore((s) => s.filters.hospital_key);
  const setFilters = useFilterStore((s) => s.setFilters);
  const syncToUrl = useFilterStore((s) => s.syncToUrl);

  const { data } = useQuery({
    queryKey: ['filter-years', hospitalKey],
    queryFn: () => fetchAvailableYears({ hospital_key: hospitalKey }),
    staleTime: 5 * 60 * 1000,
  });

  const options = data?.available_years?.length
    ? data.available_years
    : storeYear
      ? [storeYear]
      : [new Date().getFullYear()];

  const value = controlledValue ?? storeYear ?? data?.default_year ?? options[0];

  const handleChange = (event: SelectChangeEvent<number>) => {
    const nextYear = Number(event.target.value);
    if (!Number.isFinite(nextYear)) return;
    onChange?.(nextYear);
    if (!commitToStore) return;

    const window = resolveClientYearWindow(nextYear);
    setFilters({
      year: nextYear,
      date_from: window.date_from,
      date_to: window.date_to,
      page: 1,
    });
    queueMicrotask(() => {
      syncToUrl();
      void queryClient.invalidateQueries({
        predicate: (q) => {
          const key0 = q.queryKey[0];
          return key0 !== 'filter-years' && key0 !== 'filter-options';
        },
      });
    });
  };

  return (
    <FormControl
      size={size}
      fullWidth={fullWidth}
      variant="outlined"
      sx={{
        minWidth: compact ? 108 : 132,
        flexShrink: 0,
        // Compact shell control must fit the context bar; keep full touch target in drawers.
        '& .MuiInputBase-root': {
          minHeight: compact ? 32 : TOUCH_TARGET_MIN,
          bgcolor: 'background.paper',
        },
        '& .MuiInputLabel-root': compact
          ? { fontSize: 12, transform: 'translate(12px, 7px) scale(1)' }
          : undefined,
        '& .MuiInputLabel-shrink': compact
          ? { transform: 'translate(12px, -6px) scale(0.75)' }
          : undefined,
      }}
    >
      <InputLabel id="global-year-selector-label" shrink>
        {t('app.year', { defaultValue: 'Year' })}
      </InputLabel>
      <Select
        labelId="global-year-selector-label"
        id="global-year-selector"
        data-testid="year-selector"
        value={value}
        label={t('app.year', { defaultValue: 'Year' })}
        onChange={handleChange}
        notched
        displayEmpty
        inputProps={{ 'aria-label': t('app.year', { defaultValue: 'Year' }) }}
      >
        {options.map((y) => (
          <MenuItem key={y} value={y}>
            {y === data?.default_year ? `${y} YTD` : String(y)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

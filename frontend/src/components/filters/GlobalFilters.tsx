import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Chip,
  Collapse,
  Drawer,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CloseIcon from '@mui/icons-material/Close';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { type Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchFilterOptions } from '@/api/filters';
import { useFilterStore } from '@/store/filterStore';
import type { GlobalFilterState } from '@/types/api';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { TOUCH_TARGET_MIN } from '@/design-system/breakpoints';
import { localizeDataLabel } from '@/i18n/localize';
import YearSelector from '@/components/shell/YearSelector';
import { resolveClientYearWindow } from '@/utils/yearWindow';

type ChipKey = 'organization_key' | 'hospital_key' | 'facility_key' | 'department_key' | 'gender' | 'age_group';

const touchSx = { minWidth: TOUCH_TARGET_MIN, minHeight: TOUCH_TARGET_MIN };

function countActiveFilters(f: GlobalFilterState): number {
  let count = 0;
  if (f.organization_key) count++;
  if (f.hospital_key) count++;
  if (f.facility_key) count++;
  if (f.department_key) count++;
  if (f.gender) count++;
  if (f.age_group) count++;
  if (f.date_from || f.date_to) count++;
  return count;
}

function abbreviateDateRange(from?: string, to?: string): string {
  if (!from && !to) return '—';
  if (from && to) {
    const f = dayjs(from);
    const t = dayjs(to);
    if (f.isSame(t, 'day')) return f.format('DD MMM YYYY');
    if (f.isSame(t, 'year')) return `${f.format('DD MMM')} – ${t.format('DD MMM YYYY')}`;
    return `${f.format('DD MMM YYYY')} – ${t.format('DD MMM YYYY')}`;
  }
  return from ? dayjs(from).format('DD MMM YYYY') : dayjs(to!).format('DD MMM YYYY');
}

interface FilterFieldsProps {
  local: GlobalFilterState;
  setLocal: React.Dispatch<React.SetStateAction<GlobalFilterState>>;
  options: Awaited<ReturnType<typeof fetchFilterOptions>> | undefined;
  advancedOpen: boolean;
  onToggleAdvanced: () => void;
}

function FilterFields({ local, setLocal, options, advancedOpen, onToggleAdvanced }: FilterFieldsProps) {
  const { t, i18n } = useTranslation();

  const filteredDepartments = options?.departments.filter(
    (d) => !local.hospital_key || d.hospital_key === local.hospital_key,
  );
  const filteredFacilities = options?.facilities.filter(
    (f) => !local.hospital_key || f.hospital_key === local.hospital_key,
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 1.5,
        }}
      >
        <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
          <YearSelector
            fullWidth
            commitToStore={false}
            value={local.year}
            onChange={(year) => {
              const w = resolveClientYearWindow(year);
              setLocal((s) => ({
                ...s,
                year,
                date_from: w.date_from,
                date_to: w.date_to,
              }));
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {t('app.yearHint', {
              defaultValue: 'Year is authoritative. Date range may narrow within the selected year.',
            })}
          </Typography>
        </Box>
        <DatePicker
          label={t('app.dateFrom')}
          value={local.date_from ? dayjs(local.date_from) : null}
          onChange={(v: Dayjs | null) => {
            const date_from = v?.format('YYYY-MM-DD');
            setLocal((s) => {
              const year = s.year ?? (date_from ? dayjs(date_from).year() : undefined);
              return { ...s, date_from, year };
            });
          }}
          minDate={local.year ? dayjs(`${local.year}-01-01`) : undefined}
          maxDate={local.year ? dayjs(`${local.year}-12-31`) : undefined}
          slotProps={{ textField: { size: 'small', fullWidth: true } }}
        />
        <DatePicker
          label={t('app.dateTo')}
          value={local.date_to ? dayjs(local.date_to) : null}
          onChange={(v: Dayjs | null) => {
            const date_to = v?.format('YYYY-MM-DD');
            setLocal((s) => {
              const year = s.year ?? (date_to ? dayjs(date_to).year() : undefined);
              return { ...s, date_to, year };
            });
          }}
          minDate={local.year ? dayjs(`${local.year}-01-01`) : undefined}
          maxDate={local.year ? dayjs(`${local.year}-12-31`) : undefined}
          slotProps={{ textField: { size: 'small', fullWidth: true } }}
        />
        <TextField
          select
          size="small"
          label={t('app.hospital')}
          value={local.hospital_key ?? ''}
          onChange={(e) =>
            setLocal((s) => ({
              ...s,
              hospital_key: e.target.value ? Number(e.target.value) : undefined,
              department_key: undefined,
              facility_key: undefined,
            }))
          }
        >
          <MenuItem value="">{t('app.all')}</MenuItem>
          {options?.hospitals.map((h) => (
            <MenuItem key={h.hospital_key} value={h.hospital_key}>
              {localizeDataLabel(h.hospital_name, t, i18n.language)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={t('app.facility')}
          value={local.facility_key ?? ''}
          onChange={(e) =>
            setLocal((s) => ({
              ...s,
              facility_key: e.target.value ? Number(e.target.value) : undefined,
            }))
          }
        >
          <MenuItem value="">{t('app.all')}</MenuItem>
          {filteredFacilities?.map((f) => (
            <MenuItem key={f.facility_key} value={f.facility_key}>
              {localizeDataLabel(f.facility_name, t, i18n.language)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={t('app.department')}
          value={local.department_key ?? ''}
          onChange={(e) =>
            setLocal((s) => ({
              ...s,
              department_key: e.target.value ? Number(e.target.value) : undefined,
            }))
          }
        >
          <MenuItem value="">{t('app.all')}</MenuItem>
          {filteredDepartments?.map((d) => (
            <MenuItem key={d.department_key} value={d.department_key}>
              {localizeDataLabel(d.department_name, t, i18n.language)}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            onClick={onToggleAdvanced}
            aria-label={t('filters.advanced')}
            aria-expanded={advancedOpen}
            sx={touchSx}
          >
            {advancedOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
          <Typography variant="caption" color="text.secondary">
            {t('filters.advanced')}
          </Typography>
        </Box>
      </Box>

      <Collapse in={advancedOpen} timeout={280}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
            gap: 1.5,
            pt: 1.5,
          }}
        >
          <TextField
            select
            size="small"
            label={t('app.organization')}
            value={local.organization_key ?? ''}
            onChange={(e) =>
              setLocal((s) => ({
                ...s,
                organization_key: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
          >
            <MenuItem value="">{t('app.all')}</MenuItem>
            {options?.organizations.map((o) => (
              <MenuItem key={o.organization_key} value={o.organization_key}>
                {o.organization_name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={t('app.gender')}
            value={local.gender ?? ''}
            onChange={(e) => setLocal((s) => ({ ...s, gender: e.target.value || undefined }))}
          >
            <MenuItem value="">{t('app.all')}</MenuItem>
            {options?.genders.map((g) => (
              <MenuItem key={g} value={g}>
                {localizeDataLabel(g, t, i18n.language)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={t('app.ageGroup')}
            value={local.age_group ?? ''}
            onChange={(e) => setLocal((s) => ({ ...s, age_group: e.target.value || undefined }))}
          >
            <MenuItem value="">{t('app.all')}</MenuItem>
            {options?.age_groups.map((a) => (
              <MenuItem key={a} value={a}>
                {localizeDataLabel(a, t, i18n.language)}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Collapse>
    </LocalizationProvider>
  );
}

export default function GlobalFilters() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { filters, setFilters, resetFilters, syncToUrl } = useFilterStore();
  const { isMobileSm, isTouch } = useResponsiveLayout();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [local, setLocal] = useState(filters);

  useEffect(() => {
    setLocal(filters);
  }, [filters]);

  const { data: options } = useQuery({
    queryKey: ['filter-options'],
    queryFn: fetchFilterOptions,
    staleTime: 5 * 60 * 1000,
  });

  const activeCount = useMemo(() => countActiveFilters(filters), [filters]);

  const handleApply = () => {
    const yearChanged = local.year !== filters.year;
    setFilters(local);
    syncToUrl();
    setDrawerOpen(false);
    if (yearChanged) {
      void queryClient.invalidateQueries({
        predicate: (q) => {
          const key0 = q.queryKey[0];
          return key0 !== 'filter-years' && key0 !== 'filter-options';
        },
      });
    }
  };

  const handleCancel = () => {
    setLocal(filters);
    setDrawerOpen(false);
  };

  const handleReset = () => {
    resetFilters();
    syncToUrl();
    setDrawerOpen(false);
  };

  const applyPreset = (preset: 'today' | 'last7' | 'last30') => {
    const today = dayjs();
    // Page-local presets may narrow within the selected year, never replace it.
    setLocal((s) => {
      const year = s.year ?? today.year();
      const yearStart = dayjs(`${year}-01-01`);
      const yearEnd = dayjs(`${year}-12-31`);
      const clamp = (d: dayjs.Dayjs) => {
        if (d.isBefore(yearStart, 'day')) return yearStart;
        if (d.isAfter(yearEnd, 'day')) return yearEnd;
        return d;
      };
      let from = today;
      let to = today;
      if (preset === 'last7') from = today.subtract(6, 'day');
      if (preset === 'last30') from = today.subtract(29, 'day');
      from = clamp(from);
      to = clamp(to);
      return {
        ...s,
        year,
        date_from: from.format('YYYY-MM-DD'),
        date_to: to.format('YYYY-MM-DD'),
      };
    });
  };

  const buildActiveChips = (source: GlobalFilterState) => {
    const chips: Array<{ key: ChipKey; label: string }> = [];
    if (source.organization_key) {
      const name = options?.organizations.find((o) => o.organization_key === source.organization_key)?.organization_name;
      if (name) chips.push({ key: 'organization_key', label: localizeDataLabel(name, t, i18n.language) });
    }
    if (source.hospital_key) {
      const name = options?.hospitals.find((h) => h.hospital_key === source.hospital_key)?.hospital_name;
      if (name) chips.push({ key: 'hospital_key', label: localizeDataLabel(name, t, i18n.language) });
    }
    if (source.facility_key) {
      const name = options?.facilities.find((f) => f.facility_key === source.facility_key)?.facility_name;
      if (name) chips.push({ key: 'facility_key', label: localizeDataLabel(name, t, i18n.language) });
    }
    if (source.department_key) {
      const name = options?.departments.find((d) => d.department_key === source.department_key)?.department_name;
      if (name) chips.push({ key: 'department_key', label: localizeDataLabel(name, t, i18n.language) });
    }
    if (source.gender) chips.push({ key: 'gender', label: localizeDataLabel(source.gender, t, i18n.language) });
    if (source.age_group) chips.push({ key: 'age_group', label: localizeDataLabel(source.age_group, t, i18n.language) });
    return chips;
  };

  const clearChip = (key: ChipKey) => {
    const next = { ...filters, [key]: undefined };
    if (key === 'hospital_key') {
      next.facility_key = undefined;
      next.department_key = undefined;
    }
    setFilters(next);
    syncToUrl();
  };

  const activeChips = buildActiveChips(filters);
  const dateAbbrev = abbreviateDateRange(filters.date_from, filters.date_to);
  const touchButtonSx = isTouch ? { minHeight: TOUCH_TARGET_MIN } : undefined;

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5 }}>
        <Typography variant="h6">{t('filters.open')}</Typography>
        <IconButton onClick={handleCancel} aria-label={t('responsive.close')} sx={touchSx}>
          <CloseIcon />
        </IconButton>
      </Stack>

      <Box sx={{ flex: 1, overflow: 'auto', px: 2, pb: 2 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <Chip
            label={t('filters.datePresets.today')}
            onClick={() => applyPreset('today')}
            variant="outlined"
            clickable
            sx={{ minHeight: isTouch ? TOUCH_TARGET_MIN : undefined }}
          />
          <Chip
            label={t('filters.datePresets.last7')}
            onClick={() => applyPreset('last7')}
            variant="outlined"
            clickable
            sx={{ minHeight: isTouch ? TOUCH_TARGET_MIN : undefined }}
          />
          <Chip
            label={t('filters.datePresets.last30')}
            onClick={() => applyPreset('last30')}
            variant="outlined"
            clickable
            sx={{ minHeight: isTouch ? TOUCH_TARGET_MIN : undefined }}
          />
        </Stack>

        <FilterFields
          local={local}
          setLocal={setLocal}
          options={options}
          advancedOpen={advancedOpen}
          onToggleAdvanced={() => setAdvancedOpen((o) => !o)}
        />
      </Box>

      <Stack
        direction="row"
        spacing={1}
        sx={{
          px: 2,
          py: 1.5,
          borderTop: '1px solid var(--hap-border)',
          pb: 'max(12px, env(safe-area-inset-bottom))',
        }}
      >
        <Button variant="contained" onClick={handleApply} sx={{ flex: 1, ...touchButtonSx }}>
          {t('filters.apply')}
        </Button>
        <Button variant="outlined" onClick={handleCancel} sx={touchButtonSx}>
          {t('filters.cancel')}
        </Button>
        <Button variant="text" onClick={handleReset} sx={touchButtonSx}>
          {t('filters.clearAll')}
        </Button>
      </Stack>
    </Box>
  );

  return (
      <Paper
        elevation={0}
        sx={{
          px: { xs: 1.5, md: 2 },
          py: 0.75,
          minHeight: 44,
          borderBottom: '1px solid var(--hap-border)',
          borderRadius: 0,
          bgcolor: 'var(--hap-bg-paper)',
        }}
        data-testid="global-filters"
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          <Badge badgeContent={activeCount} color="primary" max={9}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FilterListIcon />}
              onClick={() => {
                setLocal(filters);
                setDrawerOpen(true);
              }}
              sx={touchButtonSx}
            >
              {t('app.filters')}
            </Button>
          </Badge>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ flexShrink: 0, display: { xs: 'none', sm: 'block' } }}
          >
            {dateAbbrev}
          </Typography>

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              gap: 0.75,
              overflowX: 'auto',
              flexWrap: 'nowrap',
              WebkitOverflowScrolling: 'touch',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            {activeChips.map((chip) => (
              <Chip
                key={chip.key}
                size="small"
                label={chip.label}
                onDelete={() => clearChip(chip.key)}
                sx={{ flexShrink: 0 }}
              />
            ))}
          </Box>
        </Stack>

        <Drawer
          anchor={isMobileSm ? 'bottom' : 'right'}
          open={drawerOpen}
          onClose={handleCancel}
          PaperProps={{
            sx: {
              borderTopLeftRadius: isMobileSm ? 16 : 0,
              borderTopRightRadius: isMobileSm ? 16 : 0,
              width: isMobileSm ? '100%' : 400,
              maxWidth: '100%',
              maxHeight: isMobileSm ? '100%' : '100vh',
              height: isMobileSm ? '100%' : 'auto',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Paper>
  );
}

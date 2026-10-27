import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchWorkforceFilterOptions } from '@/api/workforce';
import type { WorkforceFilters } from '@/types/workforce';
import { brand } from '@/design-system/colors';

interface Props {
  value: WorkforceFilters;
  onChange: (next: WorkforceFilters) => void;
}

export default function WorkforceFilterBar({ value, onChange }: Props) {
  const { t } = useTranslation();
  const optionsQuery = useQuery({
    queryKey: ['workforce-filter-options'],
    queryFn: fetchWorkforceFilterOptions,
    staleTime: 60_000,
  });
  const opts = optionsQuery.data?.data;

  const set = <K extends keyof WorkforceFilters>(key: K, val: WorkforceFilters[K]) => {
    onChange({ ...value, [key]: val || null, page: 1 });
  };

  return (
    <Box
      component="section"
      aria-label={t('workforce.filters')}
      sx={{
        p: { xs: 1.5, md: 2 },
        borderRadius: 3,
        bgcolor: brand.surface,
        border: `1px solid ${brand.border}`,
      }}
    >
      <Stack
        direction="row"
        flexWrap="wrap"
        useFlexGap
        spacing={1.5}
        sx={{ '& > *': { minWidth: { xs: '100%', sm: 160, md: 170 }, flex: { md: '1 1 160px' } } }}
      >
        <FormControl size="small">
          <InputLabel id="wf-region">{t('workforce.region')}</InputLabel>
          <Select
            labelId="wf-region"
            label={t('workforce.region')}
            value={value.region ?? ''}
            onChange={(e) => set('region', e.target.value || null)}
          >
            <MenuItem value="">{t('app.all')}</MenuItem>
            {(opts?.regions ?? []).map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel id="wf-facility">{t('workforce.facility')}</InputLabel>
          <Select
            labelId="wf-facility"
            label={t('workforce.facility')}
            value={value.facility_key ?? ''}
            onChange={(e) => set('facility_key', e.target.value === '' ? null : Number(e.target.value))}
          >
            <MenuItem value="">{t('app.all')}</MenuItem>
            {(opts?.facilities ?? []).map((f) => (
              <MenuItem key={f.facility_key} value={f.facility_key}>
                {f.facility_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel id="wf-dept">{t('workforce.department')}</InputLabel>
          <Select
            labelId="wf-dept"
            label={t('workforce.department')}
            value={value.department_key ?? ''}
            onChange={(e) => set('department_key', e.target.value === '' ? null : Number(e.target.value))}
          >
            <MenuItem value="">{t('app.all')}</MenuItem>
            {(opts?.departments ?? []).map((d) => (
              <MenuItem key={d.department_key} value={d.department_key}>
                {d.department_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel id="wf-specialty">{t('workforce.specialty')}</InputLabel>
          <Select
            labelId="wf-specialty"
            label={t('workforce.specialty')}
            value={value.specialty ?? ''}
            onChange={(e) => set('specialty', e.target.value || null)}
          >
            <MenuItem value="">{t('app.all')}</MenuItem>
            {(opts?.specialties ?? []).map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel id="wf-job">{t('workforce.jobTitle')}</InputLabel>
          <Select
            labelId="wf-job"
            label={t('workforce.jobTitle')}
            value={value.job_title ?? ''}
            onChange={(e) => set('job_title', e.target.value || null)}
          >
            <MenuItem value="">{t('app.all')}</MenuItem>
            {(opts?.job_titles ?? []).map((j) => (
              <MenuItem key={j} value={j}>
                {j}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel id="wf-manager">{t('workforce.manager')}</InputLabel>
          <Select
            labelId="wf-manager"
            label={t('workforce.manager')}
            value={value.manager_id ?? ''}
            onChange={(e) => set('manager_id', e.target.value || null)}
          >
            <MenuItem value="">{t('app.all')}</MenuItem>
            {(opts?.managers ?? []).map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel id="wf-emp">{t('workforce.employmentStatus')}</InputLabel>
          <Select
            labelId="wf-emp"
            label={t('workforce.employmentStatus')}
            value={value.employment_status ?? ''}
            onChange={(e) => set('employment_status', e.target.value || null)}
          >
            <MenuItem value="">{t('app.all')}</MenuItem>
            {(opts?.employment_statuses ?? []).map((s) => (
              <MenuItem key={s} value={s}>
                {t(`workforce.status.${s}`, { defaultValue: s })}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel id="wf-perf">{t('workforce.performanceStatus')}</InputLabel>
          <Select
            labelId="wf-perf"
            label={t('workforce.performanceStatus')}
            value={value.performance_status ?? ''}
            onChange={(e) => set('performance_status', e.target.value || null)}
          >
            <MenuItem value="">{t('app.all')}</MenuItem>
            {(opts?.performance_statuses ?? []).map((s) => (
              <MenuItem key={s} value={s}>
                {t(`workforce.status.${s}`, { defaultValue: s })}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel id="wf-lic">{t('workforce.licenseStatus')}</InputLabel>
          <Select
            labelId="wf-lic"
            label={t('workforce.licenseStatus')}
            value={value.license_status ?? ''}
            onChange={(e) => set('license_status', e.target.value || null)}
          >
            <MenuItem value="">{t('app.all')}</MenuItem>
            {(opts?.license_statuses ?? []).map((s) => (
              <MenuItem key={s} value={s}>
                {t(`workforce.status.${s}`, { defaultValue: s })}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          type="date"
          label={t('app.dateFrom')}
          InputLabelProps={{ shrink: true }}
          value={value.date_from ?? ''}
          onChange={(e) => set('date_from', e.target.value || null)}
        />
        <TextField
          size="small"
          type="date"
          label={t('app.dateTo')}
          InputLabelProps={{ shrink: true }}
          value={value.date_to ?? ''}
          onChange={(e) => set('date_to', e.target.value || null)}
        />
      </Stack>
    </Box>
  );
}

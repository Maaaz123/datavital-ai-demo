import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import EChart from '@/components/charts/EChart';
import type { ChartPayload } from '@/types/api';

interface LaboratoryTrendProps {
  labs: Record<string, unknown>[];
}

export default function LaboratoryTrend({ labs }: LaboratoryTrendProps) {
  const { t } = useTranslation();

  const chart: ChartPayload | undefined = useMemo(() => {
    if (!labs?.length) return undefined;
    const byTest = new Map<string, { times: string[]; values: (number | null)[] }>();
    labs.forEach((l) => {
      const test = String(l.test_name ?? l.loinc_code ?? l.lab_code ?? 'lab');
      const time = String(l.observed_at ?? l.result_date ?? l.timestamp ?? '');
      const value = l.value != null ? Number(l.value) : l.result_value != null ? Number(l.result_value) : null;
      if (!byTest.has(test)) byTest.set(test, { times: [], values: [] });
      const entry = byTest.get(test)!;
      entry.times.push(time.slice(0, 16));
      entry.values.push(value);
    });
    const first = [...byTest.entries()][0];
    if (!first) return undefined;
    const [testName, data] = first;
    return {
      chart_type: 'line',
      title: testName,
      categories: data.times,
      series: [{ name: testName, data: data.values }],
    };
  }, [labs]);

  if (!labs?.length) {
    return <Typography variant="body2" color="text.secondary">{t('app.noData')}</Typography>;
  }

  if (chart) {
    return <EChart payload={chart} height={240} />;
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>{t('clinicalDeterioration.time')}</TableCell>
          <TableCell>{t('clinicalDeterioration.test')}</TableCell>
          <TableCell>{t('clinicalDeterioration.value')}</TableCell>
          <TableCell>{t('clinicalDeterioration.unit')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {labs.slice(0, 12).map((l, idx) => (
          <TableRow key={idx}>
            <TableCell>{String(l.observed_at ?? l.result_date ?? '—')}</TableCell>
            <TableCell>{String(l.test_name ?? l.loinc_code ?? '—')}</TableCell>
            <TableCell>{l.value != null ? Number(l.value) : l.result_value != null ? Number(l.result_value) : '—'}</TableCell>
            <TableCell>{String(l.unit ?? '—')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

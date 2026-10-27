import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import EChart from '@/components/charts/EChart';
import type { ChartPayload } from '@/types/api';

interface PatientVitalTrendProps {
  vitals: Record<string, unknown>[];
}

export default function PatientVitalTrend({ vitals }: PatientVitalTrendProps) {
  const { t } = useTranslation();

  const chart: ChartPayload | undefined = useMemo(() => {
    if (!vitals?.length) return undefined;
    const sorted = [...vitals].sort((a, b) => String(a.observed_at ?? a.timestamp).localeCompare(String(b.observed_at ?? b.timestamp)));
    const categories = sorted.map((v) => String(v.observed_at ?? v.timestamp ?? '').slice(0, 16));
    const hr = sorted.map((v) => (v.heart_rate != null ? Number(v.heart_rate) : null));
    const rr = sorted.map((v) => (v.respiratory_rate != null ? Number(v.respiratory_rate) : null));
    const spo2 = sorted.map((v) => (v.oxygen_saturation != null ? Number(v.oxygen_saturation) : null));
    if (!hr.some((v) => v != null) && !rr.some((v) => v != null)) return undefined;
    return {
      chart_type: 'line',
      title: t('clinicalDeterioration.vitalTrend'),
      categories,
      series: [
        ...(hr.some((v) => v != null) ? [{ name: t('clinicalDeterioration.heartRate'), data: hr }] : []),
        ...(rr.some((v) => v != null) ? [{ name: t('clinicalDeterioration.respiratoryRate'), data: rr }] : []),
        ...(spo2.some((v) => v != null) ? [{ name: t('clinicalDeterioration.spo2'), data: spo2 }] : []),
      ],
    };
  }, [vitals, t]);

  if (!vitals?.length) {
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
          <TableCell>{t('clinicalDeterioration.heartRate')}</TableCell>
          <TableCell>{t('clinicalDeterioration.respiratoryRate')}</TableCell>
          <TableCell>{t('clinicalDeterioration.spo2')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {vitals.slice(0, 12).map((v, idx) => (
          <TableRow key={idx}>
            <TableCell>{String(v.observed_at ?? v.timestamp ?? '—')}</TableCell>
            <TableCell>{v.heart_rate != null ? Number(v.heart_rate) : '—'}</TableCell>
            <TableCell>{v.respiratory_rate != null ? Number(v.respiratory_rate) : '—'}</TableCell>
            <TableCell>{v.oxygen_saturation != null ? Number(v.oxygen_saturation) : '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

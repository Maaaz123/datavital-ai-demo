import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface BiasMonitoringPanelProps {
  rows: Record<string, unknown>[];
}

export default function BiasMonitoringPanel({ rows }: BiasMonitoringPanelProps) {
  const { t } = useTranslation();

  if (!rows?.length) {
    return <Typography variant="body2" color="text.secondary">{t('app.noData')}</Typography>;
  }

  const keys = ['group_dimension', 'group_value', 'sensitivity', 'specificity', 'false_positive_rate', 'false_negative_rate', 'calibration_error', 'sample_size']
    .filter((k) => rows.some((r) => r[k] != null));

  const displayKeys = keys.length ? keys : Object.keys(rows[0]);

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          {displayKeys.map((k) => (
            <TableCell key={k}>{t(`clinicalAi.bias.${k}`, k)}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row, idx) => (
          <TableRow key={idx}>
            {displayKeys.map((k) => (
              <TableCell key={k}>
                {typeof row[k] === 'number' ? Number(row[k]).toFixed(3) : String(row[k] ?? '—')}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

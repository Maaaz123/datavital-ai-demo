import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface ModelPerformancePanelProps {
  rows: Record<string, unknown>[];
  title?: string;
}

export default function ModelPerformancePanel({ rows, title }: ModelPerformancePanelProps) {
  const { t } = useTranslation();

  if (!rows?.length) {
    return <Typography variant="body2" color="text.secondary">{t('app.noData')}</Typography>;
  }

  const keys = Object.keys(rows[0]).filter((k) => !k.startsWith('_'));

  return (
    <>
      {title && (
        <Typography variant="subtitle2" gutterBottom>
          {title}
        </Typography>
      )}
      <Table size="small">
        <TableHead>
          <TableRow>
            {keys.map((k) => (
              <TableCell key={k}>{t(`clinicalAi.metrics.${k}`, k)}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow key={idx}>
              {keys.map((k) => (
                <TableCell key={k}>
                  {typeof row[k] === 'number' ? Number(row[k]).toFixed(3) : String(row[k] ?? '—')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

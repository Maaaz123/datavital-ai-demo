import { useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { CopilotTable } from '@/types/copilot';
import { fallback } from '@/utils/format';

interface ResultTableProps {
  table: CopilotTable;
}

function normalizeRows(table: CopilotTable): Record<string, unknown>[] {
  return table.rows.map((row) => {
    if (Array.isArray(row)) {
      const obj: Record<string, unknown> = {};
      table.columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    }
    return row as Record<string, unknown>;
  });
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return new Intl.NumberFormat().format(value);
  return String(value);
}

export default function ResultTable({ table }: ResultTableProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const rows = useMemo(() => normalizeRows(table), [table]);
  const paginated = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (!table.columns.length || !rows.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        {fallback(null)}
      </Typography>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={1}>
        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {t('copilot.table')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t('copilot.totalRows')}: {new Intl.NumberFormat().format(table.total_rows ?? rows.length)}
        </Typography>
      </Stack>
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 360 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {table.columns.map((col) => (
                <TableCell key={col} sx={{ fontWeight: 700 }}>
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map((row, idx) => (
              <TableRow key={idx} hover>
                {table.columns.map((col) => (
                  <TableCell key={col}>{formatCell(row[col])}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={rows.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(Number(e.target.value));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />
    </Box>
  );
}

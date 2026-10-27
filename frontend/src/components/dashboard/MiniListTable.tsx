/* eslint-disable @typescript-eslint/no-explicit-any -- TanStack ColumnDef value generics */
import type { ReactNode } from 'react';
import { Box, Card, CardHeader, CardContent, Typography, Skeleton, Stack } from '@mui/material';
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';

interface MiniListTableProps<T extends object> {
  title: string;
  rows: T[];
  columns: ColumnDef<T, any>[];
  maxRows?: number;
  emptyMessage?: string;
  action?: ReactNode;
  loading?: boolean;
  maxHeight?: number;
}

export default function MiniListTable<T extends object>({
  title,
  rows,
  columns,
  maxRows = 10,
  emptyMessage,
  action,
  loading,
  maxHeight = 340,
}: MiniListTableProps<T>) {
  const { t } = useTranslation();
  const sourceRows = Array.isArray(rows) ? rows : [];
  const visibleRows = sourceRows.slice(0, maxRows);

  const table = useReactTable({
    data: visibleRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={title}
        subheader={sourceRows.length > maxRows ? `${sourceRows.length} total` : undefined}
        titleTypographyProps={{ variant: 'subtitle1' }}
        action={action}
      />
      <CardContent sx={{ pt: 0 }}>
        {loading ? (
          <Stack spacing={1} aria-busy="true" aria-label={t('common.loading', { defaultValue: 'Loading' })}>
            <Skeleton variant="rounded" height={28} />
            <Skeleton variant="rounded" height={28} />
            <Skeleton variant="rounded" height={28} />
          </Stack>
        ) : visibleRows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {emptyMessage ?? t('app.noData')}
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto', maxHeight, overflowY: 'auto' }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => (
                      <Box
                        component="th"
                        key={header.id}
                        sx={{
                          textAlign: 'left',
                          py: 0.75,
                          px: 1,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          fontWeight: 600,
                          position: 'sticky',
                          top: 0,
                          bgcolor: 'background.paper',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </Box>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <Box
                        component="td"
                        key={cell.id}
                        sx={{ py: 0.75, px: 1, borderBottom: '1px solid', borderColor: 'divider', whiteSpace: 'nowrap' }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Box>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

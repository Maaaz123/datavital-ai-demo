/* eslint-disable @typescript-eslint/no-explicit-any -- TanStack ColumnDef value generics */
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  TextField,
  InputAdornment,
  TablePagination,
  TableSortLabel,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import AdaptiveRecordCards from '@/components/responsive/AdaptiveRecordCards';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { TOUCH_TARGET_MIN } from '@/design-system/breakpoints';

export interface DetailDataTableProps<T extends object> {
  title?: string;
  data: T[];
  columns: ColumnDef<T, any>[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  page?: number;
  pageSize?: number;
  totalRecords?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  emptyMessage?: string;
  maxBodyHeight?: number;
  /** Force cards even on desktop (rare). */
  forceCards?: boolean;
  priorityFieldCount?: number;
  onRowClick?: (row: T) => void;
}

export default function DetailDataTable<T extends object>({
  title,
  data,
  columns,
  loading,
  error,
  onRetry,
  page = 1,
  pageSize = 25,
  totalRecords = 0,
  onPageChange,
  onPageSizeChange,
  search,
  onSearchChange,
  sortBy,
  sortOrder,
  onSortChange,
  emptyMessage,
  maxBodyHeight = 480,
  forceCards,
  priorityFieldCount = 5,
  onRowClick,
}: DetailDataTableProps<T>) {
  const { t } = useTranslation();
  const { useTableCards } = useResponsiveLayout();
  const showCards = forceCards ?? useTableCards;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card sx={{ overflow: 'hidden', minWidth: 0 }}>
      {(title || onSearchChange) && (
        <CardHeader
          title={title}
          titleTypographyProps={{ variant: 'subtitle1' }}
          action={
            onSearchChange && (
              <TextField
                size="small"
                placeholder={t('app.searchPlaceholder')}
                value={search ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ width: { xs: '100%', sm: 220 }, minHeight: TOUCH_TARGET_MIN }}
              />
            )
          }
          sx={{
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 1,
            '& .MuiCardHeader-action': { m: 0, width: { xs: '100%', sm: 'auto' } },
          }}
        />
      )}
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        {loading ? (
          <Box p={2}>
            <LoadingSkeleton variant="table" />
          </Box>
        ) : error ? (
          <ErrorState variant="compact" onRetry={onRetry} />
        ) : data.length === 0 ? (
          <EmptyState
            title={
              emptyMessage ??
              t('app.noRecordsForYear', {
                defaultValue: 'No records for the selected year under the selected hospital and filters.',
              })
            }
          />
        ) : showCards ? (
          <Box p={1.5}>
            <AdaptiveRecordCards
              rows={table.getRowModel().rows}
              priorityCount={priorityFieldCount}
              onRowClick={onRowClick}
              emptyMessage={emptyMessage}
            />
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: maxBodyHeight, overflowX: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const sortable = Boolean(onSortChange) && header.column.columnDef.enableSorting !== false;
                      const isActive = sortBy === header.column.id;
                      return (
                        <TableCell key={header.id} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {sortable ? (
                            <TableSortLabel
                              active={isActive}
                              direction={isActive ? sortOrder ?? 'asc' : 'asc'}
                              onClick={() =>
                                onSortChange?.(header.column.id, isActive && sortOrder === 'asc' ? 'desc' : 'asc')
                              }
                              sx={{ minHeight: TOUCH_TARGET_MIN }}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </TableSortLabel>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHead>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    sx={onRowClick ? { cursor: 'pointer' } : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {onPageChange && totalRecords > 0 && (
          <TablePagination
            component="div"
            count={totalRecords}
            page={page - 1}
            rowsPerPage={pageSize}
            onPageChange={(_, newPage) => onPageChange(newPage + 1)}
            onRowsPerPageChange={onPageSizeChange ? (e) => onPageSizeChange(Number(e.target.value)) : undefined}
            rowsPerPageOptions={[10, 25, 50, 100]}
            sx={{
              '.MuiTablePagination-toolbar': { minHeight: TOUCH_TARGET_MIN + 8, flexWrap: 'wrap' },
              '.MuiIconButton-root': { width: TOUCH_TARGET_MIN, height: TOUCH_TARGET_MIN },
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

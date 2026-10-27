/* eslint-disable @typescript-eslint/no-explicit-any -- TanStack ColumnDef value generics */
import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Collapse,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { flexRender, type ColumnDef, type Row, type Cell } from '@tanstack/react-table';
import { TOUCH_TARGET_MIN } from '@/design-system/breakpoints';
import { cssVar, cssVarNames } from '@/design-system/colors';
import { typographySx } from '@/design-system/typography';
import StatusBadge from '@/components/ux/StatusBadge';

interface AdaptiveRecordCardsProps<T extends object> {
  rows: Row<T>[];
  /** First N columns shown as priority fields; rest expand */
  priorityCount?: number;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

function cellText<T extends object>(cell: Cell<T, unknown>): React.ReactNode {
  return flexRender(cell.column.columnDef.cell, cell.getContext());
}

function headerText<T extends object>(col: ColumnDef<T, any>): string {
  if (typeof col.header === 'string') return col.header;
  return col.id ?? 'Field';
}

/** Mobile/tablet-portrait card list for complex tables. */
export default function AdaptiveRecordCards<T extends object>({
  rows,
  priorityCount = 5,
  onRowClick,
  emptyMessage = 'No records for the selected filters.',
}: AdaptiveRecordCardsProps<T>) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
        {emptyMessage}
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5} data-testid="adaptive-record-cards">
      {rows.map((row) => {
        const cells = row.getVisibleCells();
        const priority = cells.slice(0, priorityCount);
        const rest = cells.slice(priorityCount);
        const open = Boolean(expanded[row.id]);
        const statusCell = cells.find((c) => /status|severity|priority/i.test(c.column.id));

        return (
          <Card
            key={row.id}
            variant="outlined"
            sx={{
              borderColor: cssVar(cssVarNames.border),
              '&:active': { bgcolor: 'action.hover' },
            }}
          >
            <CardContent sx={{ pb: 1 }} onClick={() => onRowClick?.(row.original)}>
              <Stack spacing={1}>
                {statusCell && (
                  <Box>
                    <StatusBadge
                      status={
                        String(statusCell.getValue() ?? '')
                          .toLowerCase()
                          .includes('critical')
                          ? 'critical'
                          : String(statusCell.getValue() ?? '')
                                .toLowerCase()
                                .includes('warn')
                            ? 'warning'
                            : 'info'
                      }
                      label={String(statusCell.getValue() ?? 'Status')}
                    />
                  </Box>
                )}
                {priority.map((cell) => (
                  <Box key={cell.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <Typography sx={{ ...typographySx('metadata'), flexShrink: 0 }}>
                      {headerText(cell.column.columnDef)}
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{ textAlign: 'end', wordBreak: 'break-word' }}
                    >
                      {cellText(cell)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
              <Collapse in={open}>
                <Stack spacing={1} mt={1.5} pt={1.5} borderTop={`1px solid ${cssVar(cssVarNames.border)}`}>
                  {rest.map((cell) => (
                    <Box key={cell.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Typography sx={typographySx('metadata')}>{headerText(cell.column.columnDef)}</Typography>
                      <Typography variant="body2" sx={{ textAlign: 'end' }}>
                        {cellText(cell)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Collapse>
            </CardContent>
            {rest.length > 0 && (
              <CardActions sx={{ justifyContent: 'flex-end', minHeight: TOUCH_TARGET_MIN }}>
                <Button
                  size="small"
                  onClick={() => setExpanded((s) => ({ ...s, [row.id]: !open }))}
                  endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  sx={{ minHeight: TOUCH_TARGET_MIN }}
                >
                  {open ? 'Hide details' : 'Expand details'}
                </Button>
              </CardActions>
            )}
          </Card>
        );
      })}
    </Stack>
  );
}

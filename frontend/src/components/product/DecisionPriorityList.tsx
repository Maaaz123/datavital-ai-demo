import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { brand } from '@/design-system/colors';
import { typographySx } from '@/design-system/typography';
import type { DecisionPriority } from '@/types/product';

export type { DecisionPriority };

interface DecisionPriorityListProps {
  title?: string;
  items: DecisionPriority[];
  onNavigate: (href: string) => void;
  emptyMessage?: string;
}

const severityColor = {
  critical: brand.critical,
  warning: brand.warning,
  info: brand.primaryBlue,
} as const;

/** Prioritized “Attention Required” list for executives. */
export default function DecisionPriorityList({
  title = 'Attention Required',
  items,
  onNavigate,
  emptyMessage = 'No critical priorities for the selected filters.',
}: DecisionPriorityListProps) {
  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 3,
        bgcolor: brand.surface,
        border: `1px solid ${brand.border}`,
        height: '100%',
      }}
    >
      <Typography sx={{ ...typographySx('sectionTitle'), color: brand.deepNavy, mb: 2 }}>{title}</Typography>
      {items.length === 0 ? (
        <Typography sx={{ ...typographySx('supporting'), color: brand.textMuted }}>{emptyMessage}</Typography>
      ) : (
        <Stack spacing={1.5}>
          {items.slice(0, 5).map((item) => (
            <Box
              key={item.id}
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: brand.surfaceMuted,
                borderLeft: `3px solid ${severityColor[item.severity]}`,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" mb={0.75}>
                <Chip
                  size="small"
                  label={item.severity}
                  sx={{
                    height: 22,
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    bgcolor: `${severityColor[item.severity]}18`,
                    color: severityColor[item.severity],
                  }}
                />
                <Typography sx={{ ...typographySx('metadata'), color: brand.textMuted }}>{item.area}</Typography>
              </Stack>
              <Typography sx={{ ...typographySx('cardTitle'), color: brand.textPrimary, mb: 0.5 }}>
                {item.issue}
              </Typography>
              <Typography sx={{ ...typographySx('metadata'), color: brand.textSecondary, mb: 0.75 }}>
                {item.metricLabel}: <strong>{item.metricValue}</strong>
                {item.changeLabel ? ` · ${item.changeLabel}` : ''}
              </Typography>
              <Typography sx={{ ...typographySx('supporting'), color: brand.textMuted, mb: 1 }}>
                {item.investigation}
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
                onClick={() => onNavigate(item.href)}
                sx={{ px: 0, minWidth: 0, fontWeight: 600 }}
              >
                Investigate
              </Button>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}

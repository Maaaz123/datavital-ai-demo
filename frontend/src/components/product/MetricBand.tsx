import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { PrimaryMetric, SupportingMetric } from './PrimaryMetric';
import type { KPICardData } from '@/types/api';

interface MetricBandProps {
  primary: KPICardData;
  supporting: KPICardData[];
  onPrimaryClick?: () => void;
  onSupportingClick?: (kpi: KPICardData) => void;
}

/** One dominant metric + up to four compact supporting KPIs. */
export default function MetricBand({
  primary,
  supporting,
  onPrimaryClick,
  onSupportingClick,
}: MetricBandProps) {
  return (
    <Box
      data-testid="metric-band"
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: '1fr 1fr',
          md: 'minmax(240px, 1.35fr) repeat(4, minmax(0, 1fr))',
        },
        gap: 1.5,
        alignItems: 'stretch',
      }}
    >
      <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1', md: 'auto' } }}>
        <PrimaryMetric kpi={primary} onClick={onPrimaryClick} />
      </Box>
      {supporting.slice(0, 4).map((kpi) => (
        <SupportingMetric key={kpi.key} kpi={kpi} onClick={onSupportingClick ? () => onSupportingClick(kpi) : undefined} />
      ))}
    </Box>
  );
}

interface PilotWorkspaceProps {
  children: ReactNode;
}

export function PilotWorkspace({ children }: PilotWorkspaceProps) {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 2.5, md: 3 },
      }}
    >
      {children}
    </Box>
  );
}

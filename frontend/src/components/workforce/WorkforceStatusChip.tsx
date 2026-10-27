import { Chip } from '@mui/material';
import { brand } from '@/design-system/colors';
import type { CredentialStatus, LicenseStatus, PerformanceStatus } from '@/types/workforce';

type StatusKind = PerformanceStatus | LicenseStatus | CredentialStatus | EmploymentLike;
type EmploymentLike = 'active' | 'on_leave' | 'terminated' | 'contractor';

const colorMap: Record<string, string> = {
  exceeds_target: brand.positive,
  on_target: brand.primaryBlue,
  at_risk: brand.warning,
  below_target: brand.critical,
  unavailable: brand.neutral,
  active: brand.positive,
  expiring_soon: brand.warning,
  expired: brand.critical,
  missing: brand.critical,
  unverified: brand.warning,
  suspended: brand.critical,
  renewal_in_progress: brand.teal,
  complete: brand.positive,
  incomplete: brand.warning,
  action_required: brand.critical,
  on_leave: brand.warning,
  terminated: brand.neutral,
  contractor: brand.teal,
};

function labelize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function WorkforceStatusChip({
  status,
  label,
}: {
  status: StatusKind | string;
  label?: string;
}) {
  const color = colorMap[status] ?? brand.neutral;
  const text = label ?? labelize(String(status));
  return (
    <Chip
      size="small"
      label={text}
      aria-label={`Status: ${text}`}
      sx={{
        height: 24,
        fontWeight: 600,
        textTransform: 'capitalize',
        bgcolor: `${color}18`,
        color,
        border: `1px solid ${color}40`,
      }}
    />
  );
}

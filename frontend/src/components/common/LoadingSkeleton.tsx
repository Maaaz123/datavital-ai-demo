import { Box, Skeleton, Grid } from '@mui/material';

interface LoadingSkeletonProps {
  variant?: 'kpi' | 'chart' | 'table' | 'page';
  count?: number;
}

export default function LoadingSkeleton({ variant = 'page', count = 4 }: LoadingSkeletonProps) {
  if (variant === 'kpi') {
    return (
      <Grid container spacing={2}>
        {Array.from({ length: count }).map((_, i) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
            <Skeleton variant="rounded" height={110} />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (variant === 'chart') {
    return <Skeleton variant="rounded" height={320} />;
  }

  if (variant === 'table') {
    return (
      <Box>
        <Skeleton variant="rounded" height={40} sx={{ mb: 1 }} />
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={36} sx={{ mb: 0.5 }} />
        ))}
      </Box>
    );
  }

  return (
    <Box>
      <Skeleton variant="text" width="40%" height={40} />
      <Skeleton variant="text" width="60%" height={24} sx={{ mb: 2 }} />
      <LoadingSkeleton variant="kpi" count={count} />
      <Box sx={{ mt: 2 }}>
        <LoadingSkeleton variant="chart" />
      </Box>
    </Box>
  );
}

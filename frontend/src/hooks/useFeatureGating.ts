import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchFeatures, type FeatureFlag } from '@/api/integration';

export function useFeatureGating(hospitalId?: number) {
  const query = useQuery({
    queryKey: ['integration-features', hospitalId],
    queryFn: () => fetchFeatures(hospitalId),
    staleTime: 60_000,
  });

  const featureMap = useMemo(() => {
    const map = new Map<string, FeatureFlag>();
    (query.data ?? []).forEach((f) => map.set(f.feature_code, f));
    return map;
  }, [query.data]);

  const isEnabled = (featureCode: string) => featureMap.get(featureCode)?.is_enabled ?? true;

  const disabledReason = (featureCode: string) => featureMap.get(featureCode)?.disabled_reason ?? null;

  return {
    ...query,
    features: query.data ?? [],
    isEnabled,
    disabledReason,
  };
}

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { KPICardData } from '@/types/api';
import { SituationSummary, InsightPanel } from '@/components/ux';
import { buildSituationFromKpis } from '@/utils/situationFromKpis';
import { localizeKpis } from '@/i18n/localize';

/** Shared situation + insight blocks for domain dashboards (live KPIs only). */
export function useDomainSituation(kpis: KPICardData[] | undefined, domain: string) {
  const { t, i18n } = useTranslation();

  return useMemo(() => {
    const localized = localizeKpis(kpis, t);
    const situation = buildSituationFromKpis(localized, { domain, locale: i18n.language });
    if (!situation) {
      return { situationSummary: null, insightPanel: null };
    }
    return {
      situationSummary: (
        <SituationSummary text={situation.text} severity={situation.severity} />
      ),
      insightPanel: (
        <InsightPanel
          title={t('ux.insightTitle')}
          observedFact={situation.observedFact}
          possibleExplanation={situation.possibleExplanation}
          recommendedAction={situation.recommendedAction}
        />
      ),
    };
  }, [kpis, domain, i18n.language, t]);
}

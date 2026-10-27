import { Card, CardContent, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import RiskScoreBadge from './RiskScoreBadge';
import ConfidenceBadge from './ConfidenceBadge';

interface PatientRiskCardProps {
  patient: Record<string, unknown>;
  onSelect?: () => void;
  selected?: boolean;
}

export default function PatientRiskCard({ patient, onSelect, selected }: PatientRiskCardProps) {
  const { t } = useTranslation();
  const riskCategory = String(patient.risk_category ?? patient.risk_level ?? 'low');
  const riskScore = patient.risk_score != null ? Number(patient.risk_score) : undefined;
  const confidence = patient.confidence != null ? Number(patient.confidence) : 0;

  return (
    <Card
      variant="outlined"
      sx={{ cursor: onSelect ? 'pointer' : 'default', borderColor: selected ? 'primary.main' : undefined, borderWidth: selected ? 2 : 1 }}
      onClick={onSelect}
    >
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="subtitle2" fontWeight={600}>
            {String(patient.patient_display ?? patient.patient_key ?? patient.patient_id ?? '—')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {String(patient.department ?? patient.ward_name ?? patient.location ?? '—')}
            {patient.horizon_hours != null ? ` · ${patient.horizon_hours}h` : null}
            {patient.prediction_horizon != null ? ` · ${String(patient.prediction_horizon)}` : null}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <RiskScoreBadge category={riskCategory} score={riskScore} />
            {patient.confidence != null && <ConfidenceBadge confidence={confidence} band={String(patient.confidence_band ?? '')} />}
          </Stack>
          {patient.advisory_message != null && (
            <Typography variant="caption" color="warning.main">
              {String(patient.advisory_message)}
            </Typography>
          )}
          {patient.review_status != null && (
            <Typography variant="caption" color="text.secondary">
              {t('clinicalAi.reviewStatus')}: {String(patient.review_status)}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

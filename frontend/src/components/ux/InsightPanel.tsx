import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography } from '@mui/material';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import { cssVar, cssVarNames } from '@/design-system/colors';
import { layoutDensity } from '@/design-system/layout';

interface InsightSectionProps {
  title: string;
  icon: ReactNode;
  content?: string | null;
}

function InsightSection({ title, icon, content }: InsightSectionProps) {
  if (!content) return null;

  return (
    <Box sx={{ mb: 1, '&:last-child': { mb: 0 } }}>
      <StackRow title={title} icon={icon} />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, pl: 2.75, fontSize: 13, lineHeight: 1.4 }}>
        {content}
      </Typography>
    </Box>
  );
}

function StackRow({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      <Box sx={{ color: cssVar(cssVarNames.primary), display: 'flex', '& svg': { fontSize: 16 } }} aria-hidden>
        {icon}
      </Box>
      <Typography sx={{ fontSize: 13, fontWeight: 650, lineHeight: 1.2 }}>{title}</Typography>
    </Box>
  );
}

interface InsightPanelProps {
  observedFact?: string | null;
  possibleExplanation?: string | null;
  recommendedAction?: string | null;
  title?: string;
}

export default function InsightPanel({
  observedFact,
  possibleExplanation,
  recommendedAction,
  title,
}: InsightPanelProps) {
  const { t } = useTranslation();
  const panelTitle = title ?? t('ux.insightTitle');

  if (!observedFact && !possibleExplanation && !recommendedAction) return null;

  return (
    <Box
      sx={{
        border: `1px solid ${cssVar(cssVarNames.border)}`,
        borderRadius: `${layoutDensity.borderRadius}px`,
        bgcolor: cssVar(cssVarNames.bgPaper),
        p: 1.25,
        mb: 1,
      }}
      role="region"
      aria-label={panelTitle}
      data-testid="insight-panel"
    >
      <Typography sx={{ fontSize: 13, fontWeight: 650, mb: 1 }}>{panelTitle}</Typography>
      <InsightSection
        title={t('ux.observedFact')}
        icon={<LightbulbOutlinedIcon fontSize="small" />}
        content={observedFact}
      />
      <InsightSection
        title={t('ux.possibleExplanation')}
        icon={<PsychologyOutlinedIcon fontSize="small" />}
        content={possibleExplanation}
      />
      <InsightSection
        title={t('ux.recommendedAction')}
        icon={<PlayArrowOutlinedIcon fontSize="small" />}
        content={recommendedAction}
      />
    </Box>
  );
}

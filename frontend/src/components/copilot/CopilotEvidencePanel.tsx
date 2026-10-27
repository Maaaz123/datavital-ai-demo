import { Box, Divider, Stack, Typography, Accordion, AccordionSummary, AccordionDetails, Chip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import type { CopilotChatItem } from '@/types/copilot';
import { cssVar, cssVarNames } from '@/design-system/colors';
import { typographySx } from '@/design-system/typography';

interface CopilotEvidencePanelProps {
  latestAssistant?: CopilotChatItem | null;
}

export default function CopilotEvidencePanel({ latestAssistant }: CopilotEvidencePanelProps) {
  const { t } = useTranslation();
  const response = latestAssistant?.response;

  return (
    <Box
      data-testid="copilot-evidence-panel"
      sx={{
        height: '100%',
        overflow: 'auto',
        p: 2,
        borderLeft: `1px solid ${cssVar(cssVarNames.border)}`,
        bgcolor: cssVar(cssVarNames.bgPaper),
      }}
    >
      <Typography sx={{ ...typographySx('sectionTitle'), mb: 1 }}>{t('copilot.evidenceTitle')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('copilot.evidenceSubtitle')}
      </Typography>

      {!response ? (
        <Typography variant="body2" color="text.secondary">
          {t('copilot.evidenceEmpty')}
        </Typography>
      ) : (
        <Stack spacing={2}>
          <Box>
            <Typography sx={typographySx('metadata')}>{t('copilot.dataFreshness')}</Typography>
            <Typography variant="body2">
              {response.generated_at ? dayjs(response.generated_at).format('YYYY-MM-DD HH:mm') : '—'}
            </Typography>
          </Box>

          {response.warning && (
            <Chip size="small" color="warning" label={response.warning} sx={{ alignSelf: 'flex-start' }} />
          )}

          <Box>
            <Typography sx={typographySx('metadata')}>{t('copilot.domainLabel')}</Typography>
            <Typography variant="body2">{response.query.domain || '—'}</Typography>
          </Box>

          {response.answer.recommended_actions?.length > 0 && (
            <Box>
              <Typography sx={{ ...typographySx('chartTitle'), mb: 0.75 }}>{t('copilot.recommendations')}</Typography>
              <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
                {response.answer.recommended_actions.map((action, idx) => (
                  <Typography component="li" variant="body2" key={idx}>
                    {action}
                  </Typography>
                ))}
              </Stack>
            </Box>
          )}

          <Divider />

          <Box>
            <Typography sx={{ ...typographySx('chartTitle'), mb: 0.75 }}>{t('copilot.sources')}</Typography>
            {response.sources.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                —
              </Typography>
            ) : (
              response.sources.map((source, idx) => (
                <Box key={`${source.model}-${idx}`} sx={{ mb: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {source.model}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {source.freshness_at
                      ? dayjs(source.freshness_at).format('YYYY-MM-DD HH:mm')
                      : t('copilot.freshnessUnknown')}
                  </Typography>
                </Box>
              ))
            )}
          </Box>

          <Accordion disableGutters elevation={0} sx={{ border: `1px solid ${cssVar(cssVarNames.border)}` }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2">{t('copilot.metricDefinition')}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary">
                {(response.query.metrics ?? []).join(', ') || '—'}
              </Typography>
            </AccordionDetails>
          </Accordion>

          {response.query.sql_visible && response.query.sql && (
            <Accordion disableGutters elevation={0} sx={{ border: `1px solid ${cssVar(cssVarNames.border)}` }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2">{t('copilot.sql')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 1,
                    fontSize: 11,
                    overflow: 'auto',
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {response.query.sql}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}

          <Accordion disableGutters elevation={0} sx={{ border: `1px solid ${cssVar(cssVarNames.border)}` }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2">{t('copilot.appliedFilters')}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(response.query.filters ?? {}, null, 2)}
              </Typography>
            </AccordionDetails>
          </Accordion>
        </Stack>
      )}
    </Box>
  );
}

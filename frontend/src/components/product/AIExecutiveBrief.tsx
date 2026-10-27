import { Box, Link as MuiLink, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { brand } from '@/design-system/colors';
import { typographySx } from '@/design-system/typography';

interface AIExecutiveBriefProps {
  title?: string;
  whatChanged: string;
  whyItMatters: string;
  evidence: string[];
  limitation?: string;
  followUp: string;
  relatedHref?: string;
  relatedLabel?: string;
}

/** Editorial AI insight — not a chatbot bubble. */
export default function AIExecutiveBrief({
  title = 'Executive brief',
  whatChanged,
  whyItMatters,
  evidence,
  limitation,
  followUp,
  relatedHref,
  relatedLabel = 'Open related dashboard',
}: AIExecutiveBriefProps) {
  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 3,
        bgcolor: brand.surfaceSoft,
        border: `1px solid ${brand.border}`,
        height: '100%',
      }}
      data-testid="ai-executive-brief"
    >
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 650,
          color: brand.teal,
          mb: 1,
        }}
      >
        {title}
      </Typography>
      <Typography sx={{ ...typographySx('sectionTitle'), color: brand.deepNavy, mb: 1.25 }}>{whatChanged}</Typography>
      <Typography sx={{ ...typographySx('supporting'), color: brand.textSecondary, mb: 1.5 }}>{whyItMatters}</Typography>

      {evidence.length > 0 ? (
        <Box sx={{ mb: 1.5 }}>
          <Typography sx={{ ...typographySx('metadata'), color: brand.textMuted, mb: 0.75 }}>Supporting evidence</Typography>
          <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
            {evidence.map((e) => (
              <Typography component="li" key={e} sx={{ ...typographySx('supporting'), color: brand.textSecondary }}>
                {e}
              </Typography>
            ))}
          </Stack>
        </Box>
      ) : null}

      {limitation ? (
        <Typography sx={{ ...typographySx('metadata'), color: brand.textMuted, mb: 1.25, fontStyle: 'italic' }}>
          Limitation: {limitation}
        </Typography>
      ) : null}

      <Typography sx={{ ...typographySx('supporting'), color: brand.textPrimary, fontWeight: 600, mb: 1 }}>
        Recommended follow-up: {followUp}
      </Typography>

      {relatedHref ? (
        <MuiLink component={RouterLink} to={relatedHref} underline="hover" sx={{ fontWeight: 600, fontSize: 13 }}>
          {relatedLabel}
        </MuiLink>
      ) : null}
    </Box>
  );
}

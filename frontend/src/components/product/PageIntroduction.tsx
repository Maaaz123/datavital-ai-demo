import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { brand } from '@/design-system/colors';
import { typographySx } from '@/design-system/typography';

interface PageIntroductionProps {
  title: string;
  purpose: string;
  context?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
}

/** Opening composition: title + decision purpose + context | meta */
export default function PageIntroduction({
  title,
  purpose,
  context,
  meta,
  actions,
  eyebrow,
}: PageIntroductionProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { md: 'flex-start' },
        justifyContent: 'space-between',
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        {eyebrow ? (
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 600,
              color: brand.teal,
              mb: 0.75,
              letterSpacing: '0.02em',
            }}
          >
            {eyebrow}
          </Typography>
        ) : null}
        <Typography component="h1" sx={{ ...typographySx('pageTitle'), color: brand.deepNavy, mb: 0.75 }}>
          {title}
        </Typography>
        <Typography sx={{ ...typographySx('supporting'), color: brand.textSecondary, maxWidth: 640 }}>
          {purpose}
        </Typography>
        {context ? <Box sx={{ mt: 1.25 }}>{context}</Box> : null}
      </Box>
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
        {meta}
        {actions}
      </Stack>
    </Box>
  );
}

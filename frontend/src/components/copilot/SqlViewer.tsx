import { useState } from 'react';
import { Box, Collapse, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import { useTranslation } from 'react-i18next';

interface SqlViewerProps {
  sql: string;
}

export default function SqlViewer({ sql }: SqlViewerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Box>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <IconButton size="small" onClick={() => setOpen((o) => !o)} aria-label="toggle sql">
          <CodeOutlinedIcon fontSize="small" />
        </IconButton>
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={700}
          sx={{ cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? t('copilot.hideSql') : t('copilot.showSql')}
        </Typography>
        {open ? <ExpandLessIcon fontSize="small" color="action" /> : <ExpandMoreIcon fontSize="small" color="action" />}
      </Stack>
      <Collapse in={open}>
        <Paper
          variant="outlined"
          sx={{
            mt: 1,
            p: 1.5,
            position: 'relative',
            bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
          }}
        >
          <Tooltip title={copied ? t('copilot.copied') : t('copilot.copy')}>
            <IconButton size="small" onClick={handleCopy} sx={{ position: 'absolute', top: 4, right: 4 }}>
              <ContentCopyOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Typography
            component="pre"
            variant="body2"
            sx={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: '0.78rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              m: 0,
              pr: 3,
            }}
          >
            {sql}
          </Typography>
        </Paper>
      </Collapse>
    </Box>
  );
}

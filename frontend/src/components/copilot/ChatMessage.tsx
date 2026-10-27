import { useState } from 'react';
import { Avatar, Divider, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import AnswerSummary from './AnswerSummary';
import ResultChart from './ResultChart';
import ResultTable from './ResultTable';
import DataSourcePanel from './DataSourcePanel';
import SqlViewer from './SqlViewer';
import FeedbackButtons from './FeedbackButtons';
import SuggestedQuestions from './SuggestedQuestions';
import CopilotLoadingState from './CopilotLoadingState';
import CopilotErrorState from './CopilotErrorState';
import type { CopilotChatItem } from '@/types/copilot';

interface ChatMessageProps {
  item: CopilotChatItem;
  onRetry?: () => void;
  onSelectFollowUp?: (question: string) => void;
  onAskAboutChart?: (question: string) => void;
  onExport?: (messageId: string) => void;
}

export default function ChatMessage({ item, onRetry, onSelectFollowUp, onAskAboutChart, onExport }: ChatMessageProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!item.response) return;
    const { answer } = item.response;
    const text = [answer.title, answer.summary, ...(answer.insights ?? []), ...(answer.recommended_actions ?? [])]
      .filter(Boolean)
      .join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (item.role === 'user') {
    return (
      <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ alignSelf: 'flex-end', maxWidth: '85%' }}>
        <Paper
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
          }}
        >
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {item.question}
          </Typography>
        </Paper>
        <Avatar sx={{ bgcolor: 'var(--hap-slate-400)', width: 32, height: 32 }}>
          <PersonOutlineIcon fontSize="small" />
        </Avatar>
      </Stack>
    );
  }

  if (item.status === 'pending') {
    return <CopilotLoadingState />;
  }

  if (item.status === 'error' || !item.response) {
    return <CopilotErrorState message={item.errorMessage} onRetry={onRetry} />;
  }

  const { response } = item;

  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ maxWidth: '85%' }}>
      <Avatar sx={{ bgcolor: 'var(--hap-primary)', width: 32, height: 32 }}>
        <SmartToyOutlinedIcon fontSize="small" />
      </Avatar>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 260 }}>
        <Stack spacing={1.5}>
          <AnswerSummary answer={response.answer} />

          {response.visualization && (
            <ResultChart
              visualization={response.visualization}
              onAskAboutChart={onAskAboutChart ? () => onAskAboutChart(`${t('copilot.askAboutChart')}: ${response.answer.title}`) : undefined}
            />
          )}

          {response.table && response.table.rows.length > 0 && <ResultTable table={response.table} />}

          {response.query.sql_visible && response.query.sql && <SqlViewer sql={response.query.sql} />}

          {response.sources.length > 0 && <DataSourcePanel sources={response.sources} />}

          {response.suggested_questions.length > 0 && onSelectFollowUp && (
            <SuggestedQuestions
              title={t('copilot.followUpQuestions')}
              questions={response.suggested_questions}
              onSelect={onSelectFollowUp}
            />
          )}

          <Divider />

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary">
              {dayjs(response.generated_at).isValid() ? dayjs(response.generated_at).format('MMM D, HH:mm') : ''}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Tooltip title={copied ? t('copilot.copied') : t('copilot.copy')}>
                <IconButton size="small" onClick={handleCopy}>
                  <ContentCopyOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {response.table && response.table.rows.length > 0 && onExport && (
                <Tooltip title={t('copilot.exportCsv')}>
                  <IconButton
                    size="small"
                    onClick={() => onExport(response.query_id || response.message_id)}
                  >
                    <FileDownloadOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <FeedbackButtons messageId={response.message_id} />
            </Stack>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}

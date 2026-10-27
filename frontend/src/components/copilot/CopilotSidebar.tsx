import {
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AddCommentOutlinedIcon from '@mui/icons-material/AddCommentOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import type { CopilotConversation } from '@/types/copilot';

interface CopilotSidebarProps {
  conversations: CopilotConversation[];
  activeConversationId: string | null;
  loading?: boolean;
  onSelect: (conversationId: string) => void;
  onNewChat: () => void;
  onDelete: (conversationId: string) => void;
}

export default function CopilotSidebar({
  conversations,
  activeConversationId,
  loading,
  onSelect,
  onNewChat,
  onDelete,
}: CopilotSidebarProps) {
  const { t } = useTranslation();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 1.5 }}>
        <Button fullWidth variant="contained" startIcon={<AddCommentOutlinedIcon />} onClick={onNewChat}>
          {t('copilot.newChat')}
        </Button>
      </Box>
      <Divider />
      <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {t('copilot.conversations')}
        </Typography>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <Stack spacing={1} sx={{ px: 1.5, pt: 1 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={48} />
            ))}
          </Stack>
        ) : conversations.length === 0 ? (
          <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
            <ChatBubbleOutlineIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {t('copilot.noConversations')}
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding sx={{ px: 1 }}>
            {conversations.map((conv) => {
              const selected = conv.conversation_id === activeConversationId;
              return (
                <ListItemButton
                  key={conv.conversation_id}
                  selected={selected}
                  onClick={() => onSelect(conv.conversation_id)}
                  sx={{
                    borderRadius: 1.5,
                    mb: 0.5,
                    alignItems: 'flex-start',
                    '&.Mui-selected': {
                      bgcolor: 'action.selected',
                    },
                  }}
                >
                  <ListItemText
                    primary={conv.title || t('copilot.newChat')}
                    secondary={dayjs(conv.updated_at).isValid() ? dayjs(conv.updated_at).format('MMM D, HH:mm') : undefined}
                    primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  <Tooltip title={t('copilot.deleteConversation')}>
                    <IconButton
                      size="small"
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(conv.conversation_id);
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Box>
    </Box>
  );
}

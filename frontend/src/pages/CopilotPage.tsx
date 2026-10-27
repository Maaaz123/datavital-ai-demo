import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Chip,
  Drawer,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AddCommentOutlinedIcon from '@mui/icons-material/AddCommentOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import axios from 'axios';
import CopilotSidebar from '@/components/copilot/CopilotSidebar';
import ChatMessage from '@/components/copilot/ChatMessage';
import ChatComposer from '@/components/copilot/ChatComposer';
import CopilotEmptyState from '@/components/copilot/CopilotEmptyState';
import CopilotEvidencePanel from '@/components/copilot/CopilotEvidencePanel';
import {
  deleteConversation,
  exportResults,
  getConversation,
  getConversations,
  getDomains,
  getSuggestions,
  postChat,
} from '@/api/copilot';
import { buildFilterParams } from '@/api/client';
import { useFilterStore } from '@/store/filterStore';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { TOUCH_TARGET_MIN } from '@/design-system/breakpoints';
import type { CopilotChatItem } from '@/types/copilot';

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const touchSx = { minWidth: TOUCH_TARGET_MIN, minHeight: TOUCH_TARGET_MIN };

export default function CopilotPage() {
  const { t, i18n } = useTranslation();
  const { isMobile, isTablet, showEvidenceInline, isTouch } = useResponsiveLayout();
  const queryClient = useQueryClient();
  const filters = useFilterStore((s) => s.filters);
  const [searchParams, setSearchParams] = useSearchParams();

  const [messages, setMessages] = useState<CopilotChatItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const autoSentRef = useRef(false);

  const conversationsQuery = useQuery({ queryKey: ['copilot-conversations'], queryFn: getConversations });
  const domainsQuery = useQuery({ queryKey: ['copilot-domains'], queryFn: getDomains });
  const suggestionsQuery = useQuery({
    queryKey: ['copilot-suggestions', selectedDomain],
    queryFn: () => getSuggestions(selectedDomain ? { domain: selectedDomain } : {}),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset > 50 ? offset : 0);
    };

    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  }, []);

  const runChat = useCallback(
    async (question: string, assistantId: string, conversationId: string | null, domain: string | null) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, status: 'pending' } : m)),
      );

      try {
        const response = await postChat(
          {
            question,
            conversation_id: conversationId ?? undefined,
            filters: buildFilterParams(filters),
            language: i18n.language,
            domain: domain ?? undefined,
          },
          controller.signal,
        );

        setActiveConversationId(response.conversation_id);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, status: 'done', response } : m)),
        );
        queryClient.invalidateQueries({ queryKey: ['copilot-conversations'] });
      } catch (err) {
        const cancelled = axios.isCancel(err);
        const message = axios.isAxiosError(err)
          ? (err.response?.data as { message?: string } | undefined)?.message ?? err.message
          : err instanceof Error
            ? err.message
            : undefined;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, status: cancelled ? 'cancelled' : 'error', errorMessage: cancelled ? undefined : message }
              : m,
          ),
        );
      } finally {
        abortControllerRef.current = null;
      }
    },
    [filters, i18n.language, queryClient],
  );

  const handleSend = useCallback(
    (question: string) => {
      const trimmed = question.trim();
      if (!trimmed) return;

      const now = new Date().toISOString();
      const userItem: CopilotChatItem = { id: genId(), role: 'user', question: trimmed, createdAt: now, status: 'done' };
      const assistantId = genId();
      const assistantItem: CopilotChatItem = { id: assistantId, role: 'assistant', createdAt: now, status: 'pending' };

      setMessages((prev) => [...prev, userItem, assistantItem]);
      setInput('');

      void runChat(trimmed, assistantId, activeConversationId, selectedDomain);
    },
    [activeConversationId, runChat, selectedDomain],
  );

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && !autoSentRef.current) {
      autoSentRef.current = true;
      const domain = searchParams.get('domain');
      if (domain) setSelectedDomain(domain);
      handleSend(q);
      const next = new URLSearchParams(searchParams);
      next.delete('q');
      next.delete('domain');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStop = () => {
    abortControllerRef.current?.abort();
  };

  const handleRetry = (assistantItem: CopilotChatItem) => {
    const idx = messages.findIndex((m) => m.id === assistantItem.id);
    const userItem = idx > 0 ? messages[idx - 1] : null;
    if (!userItem?.question) return;
    void runChat(userItem.question, assistantItem.id, activeConversationId, selectedDomain);
  };

  const handleNewChat = () => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setActiveConversationId(null);
    setInput('');
    setSidebarOpen(false);
  };

  const handleSelectConversation = async (conversationId: string) => {
    setSidebarOpen(false);
    try {
      const detail = await getConversation(conversationId);
      const items: CopilotChatItem[] = detail.messages.map((msg) => ({
        id: msg.message_id,
        role: msg.role,
        question: msg.role === 'user' ? msg.content : undefined,
        response: msg.response ?? undefined,
        createdAt: msg.created_at,
        status: msg.role === 'assistant' && !msg.response ? 'error' : 'done',
        errorMessage: msg.role === 'assistant' && !msg.response ? msg.content : undefined,
      }));
      setMessages(items);
      setActiveConversationId(conversationId);
    } catch {
      setMessages([]);
      setActiveConversationId(conversationId);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (conversationId: string) => deleteConversation(conversationId),
    onSuccess: (_data, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['copilot-conversations'] });
      if (conversationId === activeConversationId) handleNewChat();
    },
  });

  const handleExport = async (messageId: string) => {
    const blob = await exportResults(messageId);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `copilot-export-${messageId}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const isSending = useMemo(() => messages.some((m) => m.status === 'pending'), [messages]);
  const latestAssistant = useMemo(
    () => [...messages].reverse().find((m) => m.role === 'assistant' && m.response),
    [messages],
  );

  const sidebarContent = (
    <CopilotSidebar
      conversations={conversationsQuery.data ?? []}
      activeConversationId={activeConversationId}
      loading={conversationsQuery.isLoading}
      onSelect={handleSelectConversation}
      onNewChat={handleNewChat}
      onDelete={(id) => deleteMutation.mutate(id)}
    />
  );

  const showHistoryDrawer = isMobile || isTablet;
  const showInlineHistory = !showHistoryDrawer;
  const showEvidenceDrawer = isMobile || isTablet;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        gap: { xs: 1.5, lg: 1 },
        height: { xs: 'auto', md: 'calc(100vh - 180px)' },
        minHeight: { xs: 'calc(100vh - 240px)', md: 480 },
        width: '100%',
      }}
    >
      {showInlineHistory && (
        <Paper variant="outlined" sx={{ width: 260, flexShrink: 0, overflow: 'hidden', display: { xs: 'none', lg: 'block' } }}>
          {sidebarContent}
        </Paper>
      )}

      {showHistoryDrawer && (
        <Drawer anchor="left" open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
          <Box sx={{ width: 280, height: '100%' }}>{sidebarContent}</Box>
        </Drawer>
      )}

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1, py: 0.25 }}>
          {showHistoryDrawer && (
            <Tooltip title={t('responsive.history')}>
              <IconButton onClick={() => setSidebarOpen(true)} aria-label={t('responsive.history')} sx={touchSx}>
                <MenuIcon />
              </IconButton>
            </Tooltip>
          )}
          <SmartToyOutlinedIcon sx={{ color: 'var(--hap-primary)', display: { xs: 'none', sm: 'block' } }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: { xs: 16, sm: 18 }, fontWeight: 700, lineHeight: 1.25 }} noWrap>
              {t('copilot.title')}
            </Typography>
            <Typography color="text.secondary" noWrap sx={{ display: { xs: 'none', sm: 'block' }, fontSize: 12 }}>
              {t('copilot.subtitle')}
            </Typography>
          </Box>
          {showEvidenceDrawer && (
            <Tooltip title={t('responsive.evidence')}>
              <IconButton onClick={() => setEvidenceOpen(true)} aria-label={t('responsive.evidence')} sx={touchSx}>
                <FactCheckOutlinedIcon />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={t('copilot.newChat')}>
            <IconButton onClick={handleNewChat} color="primary" sx={touchSx}>
              <AddCommentOutlinedIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        {domainsQuery.data && domainsQuery.data.length > 0 && (
          <Box
            sx={{
              mb: 1,
              display: 'flex',
              gap: 0.75,
              overflowX: isMobile ? 'auto' : 'visible',
              flexWrap: isMobile ? 'nowrap' : 'wrap',
              WebkitOverflowScrolling: 'touch',
              alignItems: 'center',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'flex', alignItems: 'center', mr: 0.5, flexShrink: 0 }}
            >
              {t('copilot.domains')}:
            </Typography>
            <Chip
              size="small"
              label={t('copilot.allDomains')}
              color={selectedDomain === null ? 'primary' : 'default'}
              variant={selectedDomain === null ? 'filled' : 'outlined'}
              onClick={() => setSelectedDomain(null)}
              sx={{ flexShrink: 0, minHeight: isTouch ? TOUCH_TARGET_MIN : undefined }}
            />
            {domainsQuery.data.map((domain) => (
              <Chip
                key={domain.key}
                size="small"
                label={domain.label}
                color={selectedDomain === domain.key ? 'primary' : 'default'}
                variant={selectedDomain === domain.key ? 'filled' : 'outlined'}
                onClick={() => setSelectedDomain(domain.key)}
                sx={{ flexShrink: 0, minHeight: isTouch ? TOUCH_TARGET_MIN : undefined }}
              />
            ))}
          </Box>
        )}

        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            bgcolor: 'background.default',
          }}
        >
          <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {messages.length === 0 ? (
              <CopilotEmptyState
                suggestions={suggestionsQuery.data?.map((s) => s.question) ?? []}
                suggestionsLoading={suggestionsQuery.isLoading}
                onSelectSuggestion={handleSend}
                horizontalScroll={isMobile}
              />
            ) : (
              <>
                {messages.map((item) => (
                  <ChatMessage
                    key={item.id}
                    item={item}
                    onRetry={() => handleRetry(item)}
                    onSelectFollowUp={handleSend}
                    onAskAboutChart={handleSend}
                    onExport={handleExport}
                  />
                ))}
                <div ref={bottomRef} />
              </>
            )}
          </Box>

          <Box
            sx={{
              position: 'sticky',
              bottom: 0,
              p: 1.5,
              pt: 0,
              bgcolor: 'background.default',
              paddingBottom: `max(16px, calc(env(safe-area-inset-bottom) + ${keyboardOffset}px))`,
              zIndex: 2,
            }}
          >
            <ChatComposer
              value={input}
              onChange={setInput}
              onSend={() => handleSend(input)}
              onStop={handleStop}
              isLoading={isSending}
            />
          </Box>
        </Paper>
      </Box>

      {showEvidenceInline && (
        <Paper variant="outlined" sx={{ width: 340, flexShrink: 0, overflow: 'hidden', display: { xs: 'none', lg: 'block' } }}>
          <CopilotEvidencePanel latestAssistant={latestAssistant} />
        </Paper>
      )}

      {showEvidenceDrawer && (
        <Drawer
          anchor="bottom"
          open={evidenceOpen}
          onClose={() => setEvidenceOpen(false)}
          PaperProps={{
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: '80vh',
            },
          }}
        >
          <Box sx={{ height: '100%', overflow: 'hidden' }}>
            <CopilotEvidencePanel latestAssistant={latestAssistant} />
          </Box>
        </Drawer>
      )}
    </Box>
  );
}

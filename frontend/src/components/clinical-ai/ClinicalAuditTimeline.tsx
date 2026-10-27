import { List, ListItem, ListItemText, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface ClinicalAuditTimelineProps {
  events: Record<string, unknown>[];
}

export default function ClinicalAuditTimeline({ events }: ClinicalAuditTimelineProps) {
  const { t } = useTranslation();

  if (!events?.length) {
    return <Typography variant="body2" color="text.secondary">{t('clinicalAi.noAuditEvents')}</Typography>;
  }

  return (
    <List dense>
      {events.map((ev, idx) => (
        <ListItem key={idx} disableGutters sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 0.5 }}>
          <ListItemText
            primary={String(ev.event_type ?? ev.action ?? '—')}
            secondary={`${String(ev.actor ?? ev.user_name ?? '—')} · ${String(ev.timestamp ?? ev.created_at ?? '—')}`}
            primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
          {ev.detail != null && ev.detail !== '' && (
            <Typography variant="caption" color="text.secondary">
              {String(ev.detail)}
            </Typography>
          )}
        </ListItem>
      ))}
    </List>
  );
}

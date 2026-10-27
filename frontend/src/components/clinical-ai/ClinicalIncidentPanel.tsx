import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

const INCIDENT_TYPES = [
  'incorrect_prediction',
  'delayed_alert',
  'missed_alert',
  'excessive_false_alert',
  'wrong_patient_context',
  'stale_data',
  'bias_concern',
  'model_outage',
  'unsafe_recommendation',
];

interface ClinicalIncidentPanelProps {
  incidents: Record<string, unknown>[];
  onCreate?: (body: Record<string, unknown>) => void;
  onUpdate?: (id: string | number, body: Record<string, unknown>) => void;
  creating?: boolean;
}

export default function ClinicalIncidentPanel({ incidents, onCreate, onUpdate, creating }: ClinicalIncidentPanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [incidentType, setIncidentType] = useState(INCIDENT_TYPES[0]);
  const [description, setDescription] = useState('');
  const [modelCode, setModelCode] = useState('');

  const handleCreate = () => {
    if (!description.trim() || !onCreate) return;
    onCreate({ incident_type: incidentType, description: description.trim(), model_code: modelCode || undefined });
    setOpen(false);
    setDescription('');
    setModelCode('');
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'open': return 'error';
      case 'investigating': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box>
      {onCreate && (
        <Button size="small" variant="outlined" onClick={() => setOpen(true)} sx={{ mb: 2 }}>
          {t('clinicalGovernance.createIncident')}
        </Button>
      )}
      {!incidents?.length ? (
        <Typography variant="body2" color="text.secondary">{t('clinicalGovernance.noIncidents')}</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('clinicalGovernance.incidentType')}</TableCell>
              <TableCell>{t('clinicalGovernance.model')}</TableCell>
              <TableCell>{t('clinicalGovernance.status')}</TableCell>
              <TableCell>{t('clinicalGovernance.created')}</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {incidents.map((inc) => (
              <TableRow key={String(inc.incident_id ?? inc.id)}>
                <TableCell>{String(inc.incident_type ?? '—')}</TableCell>
                <TableCell>{String(inc.model_code ?? '—')}</TableCell>
                <TableCell>
                  <Chip size="small" label={String(inc.status ?? 'open')} color={statusColor(String(inc.status ?? 'open')) as 'error' | 'warning' | 'success' | 'default'} />
                </TableCell>
                <TableCell>{String(inc.created_at ?? '—')}</TableCell>
                <TableCell>
                  {onUpdate && inc.status === 'open' && (
                    <Button size="small" onClick={() => onUpdate(String(inc.incident_id ?? inc.id), { status: 'investigating' })}>
                      {t('clinicalGovernance.investigate')}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('clinicalGovernance.createIncident')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select size="small" label={t('clinicalGovernance.incidentType')} value={incidentType} onChange={(e) => setIncidentType(e.target.value)} fullWidth>
              {INCIDENT_TYPES.map((type) => (
                <MenuItem key={type} value={type}>{t(`clinicalGovernance.incidentTypes.${type}`, type)}</MenuItem>
              ))}
            </TextField>
            <TextField size="small" label={t('clinicalGovernance.model')} value={modelCode} onChange={(e) => setModelCode(e.target.value)} fullWidth />
            <TextField size="small" label={t('clinicalGovernance.description')} value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={3} required fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t('app.no')}</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating || !description.trim()}>{t('clinicalGovernance.submitIncident')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

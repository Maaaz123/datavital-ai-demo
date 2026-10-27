import { Button, type ButtonProps } from '@mui/material';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface AskCopilotButtonProps extends Omit<ButtonProps, 'onClick'> {
  question: string;
  domain?: string;
}

/** Deep-links into the Copilot page with a pre-filled question (and optional domain), e.g. from a chart or KPI card. */
export default function AskCopilotButton({ question, domain, children, ...buttonProps }: AskCopilotButtonProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleClick = () => {
    const params = new URLSearchParams();
    params.set('q', question);
    if (domain) params.set('domain', domain);
    navigate(`/copilot?${params.toString()}`);
  };

  return (
    <Button size="small" startIcon={<AutoAwesomeOutlinedIcon />} onClick={handleClick} {...buttonProps}>
      {children ?? t('copilot.askAboutChart')}
    </Button>
  );
}

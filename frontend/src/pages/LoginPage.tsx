import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  Stack,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LocalHospitalOutlinedIcon from '@mui/icons-material/LocalHospitalOutlined';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { login as apiLogin, fetchMe } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: 'demo', password: 'demo' },
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    setLoading(true);
    try {
      const tokens = await apiLogin(data.username, data.password);
      setTokens(tokens.access_token, tokens.refresh_token);
      const profile = await fetchMe();
      setUser(profile);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(status === 401 ? t('login.error') : t('login.errorGeneric', { defaultValue: 'Login failed. Please try again.' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#07111F',
        backgroundImage:
          'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(38,198,247,0.12), transparent), radial-gradient(ellipse 60% 50% at 90% 80%, rgba(52,120,246,0.10), transparent)',
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 420,
          width: '100%',
          bgcolor: '#122B40',
          border: '1px solid rgba(148, 180, 204, 0.18)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Stack alignItems="center" spacing={1} mb={3}>
            <LocalHospitalOutlinedIcon sx={{ fontSize: 48, color: 'primary.main' }} />
            <Typography variant="h5" fontWeight={700}>
              {t('login.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {t('login.subtitle')}
            </Typography>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              {...register('username')}
              label={t('login.username')}
              fullWidth
              margin="normal"
              autoComplete="username"
              error={!!errors.username}
              data-testid="login-username"
            />
            <TextField
              {...register('password')}
              label={t('login.password')}
              type={showPassword ? 'text' : 'password'}
              fullWidth
              margin="normal"
              autoComplete="current-password"
              error={!!errors.password}
              data-testid="login-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((s) => !s)} edge="end" aria-label="toggle password">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              sx={{ mt: 2 }}
              disabled={loading}
              data-testid="login-submit"
            >
              {t('login.submit')}
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={2}>
            {t('login.demoHint')}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

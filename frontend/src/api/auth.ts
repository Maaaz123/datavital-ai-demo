import { apiClient } from './client';
import type { ApiResponse, TokenData, UserProfile } from '@/types/api';

export async function login(username: string, password: string): Promise<TokenData> {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const { data } = await apiClient.post<ApiResponse<TokenData>>('/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data.data;
}

export async function logout(refreshToken?: string): Promise<void> {
  await apiClient.post('/auth/logout', refreshToken ? { refresh_token: refreshToken } : {});
}

export async function fetchMe(): Promise<UserProfile> {
  const { data } = await apiClient.get<ApiResponse<UserProfile>>('/auth/me');
  return data.data;
}

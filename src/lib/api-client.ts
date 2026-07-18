import { useAuthStore } from '@/store/auth-store';

const API_BASE = '/api/v1';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { token } = useAuthStore.getState();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function unwrap(response: any): any {
  // APIs return { success, data, message }
  // Unwrap to return just the data portion
  if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
    return response.data;
  }
  return response;
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, { headers, cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return unwrap(data);
}

export async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return unwrap(data);
}

export async function apiPut<T = any>(path: string, body?: any): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return unwrap(data);
}

export async function apiPatch<T = any>(path: string, body?: any): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return unwrap(data);
}

export async function apiDelete<T = any>(path: string): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return unwrap(data);
}

export async function apiUpload<T = any>(path: string, formData: FormData): Promise<T> {
  const { token } = useAuthStore.getState();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Upload failed');
  return unwrap(data);
}
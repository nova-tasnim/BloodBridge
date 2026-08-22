import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

// Attach the JWT (if present) to every outgoing request, so pages don't
// need to manually pass a token — login once, every api/resources.js
// call is authenticated automatically from here on.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bb_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Unwrap the { success, data } envelope the backend returns,
// and surface backend error messages consistently.
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Token missing/expired/invalid — let AuthContext handle logout
      // in one place rather than every page checking this itself.
      window.dispatchEvent(new Event('bb:unauthorized'));
    }

    const payload = error.response?.data;
    const message =
      payload?.errors?.join(' ') ||
      payload?.message ||
      error.message ||
      'Request failed';
    return Promise.reject(new Error(message));
  }
);

export default api;
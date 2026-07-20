import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

// Unwrap the { success, data } envelope the backend returns,
// and surface backend error messages consistently.
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
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
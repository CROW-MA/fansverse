import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fv_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failQueue = [];

const processQueue = (error, token = null) => {
  failQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token));
  failQueue = [];
};

// Auto refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failQueue.push({ resolve, reject });
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('fv_refresh');
      if (!refreshToken) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/auth/refresh`,
          { refreshToken }
        );
        localStorage.setItem('fv_token', data.accessToken);
        localStorage.setItem('fv_refresh', data.refreshToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
        processQueue(null, data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Show error toast for non-401 errors
    const msg = error.response?.data?.error || 'Ocurrió un error';
    if (error.response?.status !== 401 && error.response?.status !== 404) {
      toast.error(msg);
    }

    return Promise.reject(error);
  }
);

export default api;

// Convenience helpers
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

export const postsApi = {
  feed: (page = 1) => api.get(`/posts/feed?page=${page}`),
  byCreator: (username, page = 1) => api.get(`/posts/creator/${username}?page=${page}`),
  create: (data) => api.post('/posts', data),
  update: (id, data) => api.put(`/posts/${id}`, data),
  delete: (id) => api.delete(`/posts/${id}`),
  like: (id) => api.post(`/posts/${id}/like`),
  comments: (id) => api.get(`/posts/${id}/comments`),
  comment: (id, content) => api.post(`/posts/${id}/comments`, { content }),
};

export const subsApi = {
  my: () => api.get('/subscriptions/my'),
  tiers: (creatorId) => api.get(`/subscriptions/tiers/${creatorId}`),
  subscribe: (data) => api.post('/subscriptions/subscribe', data),
  cancel: (id) => api.delete(`/subscriptions/${id}`),
  createTier: (data) => api.post('/subscriptions/tiers', data),
};

export const messagesApi = {
  conversations: () => api.get('/messages/conversations'),
  get: (userId, page = 1) => api.get(`/messages/${userId}?page=${page}`),
  send: (userId, data) => api.post(`/messages/${userId}`, data),
  purchasePPV: (msgId) => api.post(`/messages/${msgId}/purchase-ppv`),
};

export const payoutsApi = {
  balance: () => api.get('/payouts/balance'),
  request: (data) => api.post('/payouts/request', data),
  history: (page = 1) => api.get(`/payouts/history?page=${page}`),
  transactions: (page = 1) => api.get(`/payouts/transactions?page=${page}`),
};

export const analyticsApi = {
  dashboard: () => api.get('/analytics/dashboard'),
  earnings: (period = 'month') => api.get(`/analytics/earnings?period=${period}`),
  contentPerformance: () => api.get('/analytics/content-performance'),
};

export const uploadApi = {
  image: (file, onProgress) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/uploads/image', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
    });
  },
  video: (file, onProgress) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/uploads/video', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
    });
  },
  avatar: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/uploads/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const creatorsApi = {
  featured: () => api.get('/creators/featured'),
  profile: (username) => api.get(`/creators/${username}/profile`),
};

export const searchApi = {
  search: (q) => api.get(`/search?q=${encodeURIComponent(q)}`),
};

export const notifApi = {
  get: () => api.get('/notifications'),
  markRead: () => api.post('/notifications/mark-read'),
};

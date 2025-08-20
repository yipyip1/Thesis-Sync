import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
};

// Group APIs
export const groupAPI = {
  getGroups: () => api.get('/groups'),
  createGroup: (groupData) => api.post('/groups', groupData),
  getMessages: (groupId, page = 1) => api.get(`/groups/${groupId}/messages?page=${page}`),
  addMember: (groupId, userId) => api.post(`/groups/${groupId}/members`, { userId }),
  addMemberByEmail: (groupId, email) => api.post(`/groups/${groupId}/members/email`, { email }),
};

// Message APIs
export const messageAPI = {
  sendTextMessage: (messageData) => api.post('/messages/text', messageData),
  sendFileMessage: (formData) => api.post('/messages/file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  markAsRead: (messageId) => api.put(`/messages/${messageId}/read`),
};

export default api;

import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
};

// Group API
export const groupAPI = {
  getGroups: () => api.get('/groups'),
  getGroup: (id) => api.get(`/groups/${id}`),
  createGroup: (data) => api.post('/groups', data),
  updateGroup: (id, data) => api.put(`/groups/${id}`, data),
  deleteGroup: (id) => api.delete(`/groups/${id}`),
  addMember: (groupId, userId) => api.post(`/groups/${groupId}/members`, { userId }),
  addMemberByEmail: (groupId, email) => api.post(`/groups/${groupId}/members/email`, { email }),
  removeMember: (groupId, memberId) => api.delete(`/groups/${groupId}/members/${memberId}`),
  updateMemberRole: (groupId, memberId, role) => api.put(`/groups/${groupId}/members/${memberId}/role`, { role }),
  leaveGroup: (groupId) => api.post(`/groups/${groupId}/leave`),
  getMessages: (groupId, page = 1) => api.get(`/groups/${groupId}/messages?page=${page}`),
};

// Message API
export const messageAPI = {
  getMessages: (groupId, page = 1) => api.get(`/messages/${groupId}?page=${page}`),
  sendMessage: (data) => api.post('/messages', data),
  sendTextMessage: (messageData) => api.post('/messages/text', messageData),
  sendFileMessage: (formData) => api.post('/messages/file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  editMessage: (id, content) => api.put(`/messages/${id}`, { content }),
  deleteMessage: (id) => api.delete(`/messages/${id}`),
  markAsRead: (messageId) => api.put(`/messages/${messageId}/read`),
  uploadFile: (formData) => api.post('/messages/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  uploadAvatar: (formData) => api.post('/users/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  uploadDocument: (formData) => api.post('/users/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  searchSupervisors: (params) => api.get('/users/supervisors/search', { params }),
  getAllUsers: (params) => api.get('/users', { params }),
  updateUserRole: (userId, role) => api.put(`/users/role/${userId}`, { role }),
  banUser: (userId, isBanned, banReason) => api.put(`/users/ban/${userId}`, { isBanned, banReason }),
  getUserHistory: () => api.get('/users/history'),
};

// Thesis Ideas API
export const thesisIdeaAPI = {
  getIdeas: (params) => api.get('/thesis-ideas', { params }),
  createIdea: (data) => api.post('/thesis-ideas', data),
  updateIdea: (id, data) => api.put(`/thesis-ideas/${id}`, data),
  deleteIdea: (id) => api.delete(`/thesis-ideas/${id}`),
  likeIdea: (id) => api.post(`/thesis-ideas/${id}/like`),
  addComment: (id, content) => api.post(`/thesis-ideas/${id}/comments`, { content }),
  updateComment: (ideaId, commentId, content) => api.put(`/thesis-ideas/${ideaId}/comments/${commentId}`, { content }),
  deleteComment: (ideaId, commentId) => api.delete(`/thesis-ideas/${ideaId}/comments/${commentId}`),
};

// Team Requests API
export const teamRequestAPI = {
  getTeamRequests: (params) => api.get('/team-requests', { params }),
  getMyTeamRequests: () => api.get('/team-requests/my-requests'),
  createTeamRequest: (data) => api.post('/team-requests', data),
  updateTeamRequest: (id, data) => api.put(`/team-requests/${id}`, data),
  deleteTeamRequest: (id) => api.delete(`/team-requests/${id}`),
  applyToTeam: (id, message) => api.post(`/team-requests/${id}/apply`, { message }),
  manageApplication: (id, applicationId, status) => api.put(`/team-requests/${id}/applications/${applicationId}`, { status }),
  requestSupervisor: (id, supervisorId, message) => api.post(`/team-requests/${id}/request-supervisor`, { supervisorId, message }),
  respondToSupervision: (id, status, responseMessage) => api.put(`/team-requests/${id}/supervisor-response`, { status, responseMessage }),
};

// Thesis Projects API
export const thesisProjectAPI = {
  getProjects: (params) => api.get('/thesis-projects', { params }),
  getMyProjects: () => api.get('/thesis-projects/my-projects'),
  getProject: (id) => api.get(`/thesis-projects/${id}`),
  createProject: (data) => api.post('/thesis-projects', data),
  updateProject: (id, data) => api.put(`/thesis-projects/${id}`, data),
  updatePhase: (id, phaseId, data) => api.put(`/thesis-projects/${id}/phases/${phaseId}`, data),
  uploadDocument: (id, formData) => api.post(`/thesis-projects/${id}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  addMilestone: (id, data) => api.post(`/thesis-projects/${id}/milestones`, data),
  getDashboardStats: () => api.get('/thesis-projects/stats/dashboard'),
  cleanupTestProjects: () => api.delete('/thesis-projects/cleanup/test-projects'),
};

// Notifications API
export const notificationAPI = {
  getNotifications: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/mark-all-read'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
  createNotification: (data) => api.post('/notifications', data),
  sendDeadlineReminders: () => api.post('/notifications/deadline-reminders'),
};

export const activityAPI = {
  getDashboardActivity: (params) => api.get('/activity/dashboard-activity', { params }),
};

export default api;

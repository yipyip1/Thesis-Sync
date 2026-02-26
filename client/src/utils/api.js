import axios from 'axios';

const API_BASE_URL = 'https://thesis-sync.onrender.com/api'; // Update with your actual API base URL

// Create axios instance with timeout and retry configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request retry logic
const retryRequest = async (config, retryCount = 0) => {
  const maxRetries = 3;
  try {
    return await api(config);
  } catch (error) {
    if (retryCount < maxRetries && (
      error.code === 'ECONNABORTED' ||
      error.code === 'NETWORK_ERROR' ||
      (error.response && error.response.status >= 500)
    )) {
      console.log(`Retry attempt ${retryCount + 1} for ${config.url}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return retryRequest(config, retryCount + 1);
    }
    throw error;
  }
};

// Add auth token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors and network issues
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Use a more graceful redirect that doesn't break the app state
      setTimeout(() => {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }, 1000);
      
      return Promise.reject(error);
    }
    
    // Handle network errors with retry
    if (!originalRequest._retry && (
      error.code === 'ECONNABORTED' ||
      error.code === 'NETWORK_ERROR' ||
      !error.response
    )) {
      originalRequest._retry = true;
      try {
        return await retryRequest(originalRequest);
      } catch (retryError) {
        console.error('Request failed after retries:', retryError);
      }
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
  
  // Message Request APIs
  sendMessageRequest: (receiverId, message) => api.post('/messages/request', { receiverId, message }),
  getMessageRequests: () => api.get('/messages/requests'),
  respondToMessageRequest: (requestId, action) => api.put(`/messages/requests/${requestId}`, { action }), // action: 'accept' or 'decline'
  getDirectConversation: (userId) => api.get(`/messages/direct/${userId}`),
  getDirectConversations: () => api.get('/messages/conversations'),
  sendDirectMessage: (receiverId, message) => api.post('/messages/direct', { receiverId, message }),
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
  getTeamsForSupervision: (params) => api.get('/team-requests/for-supervision', { params }),
  getMyTeamRequests: () => api.get('/team-requests/my-requests'),
  getMyTeams: () => api.get('/team-requests/my-teams'),
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
  deleteProject: (id) => api.delete(`/thesis-projects/${id}`),
  updatePhase: (id, phaseId, data) => api.put(`/thesis-projects/${id}/phases/${phaseId}`, data),
  uploadDocument: (id, formData) => api.post(`/thesis-projects/${id}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  addMilestone: (id, data) => api.post(`/thesis-projects/${id}/milestones`, data),
  getDashboardStats: () => api.get('/thesis-projects/stats/dashboard'),
  cleanupTestProjects: () => api.delete('/thesis-projects/cleanup/test-projects'),
  
  // Task management
  getTasks: (projectId) => api.get(`/thesis-projects/${projectId}/tasks`),
  updateTasks: (projectId, tasks) => api.put(`/thesis-projects/${projectId}/tasks`, { tasks }),
  createTask: (projectId, taskData) => api.post(`/thesis-projects/${projectId}/tasks`, taskData),
  updateTask: (projectId, taskId, taskData) => api.put(`/thesis-projects/${projectId}/tasks/${taskId}`, taskData),
  deleteTask: (projectId, taskId) => api.delete(`/thesis-projects/${projectId}/tasks/${taskId}`),
};

// Notifications API
export const notificationAPI = {
  getNotifications: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/mark-all-read'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
  clearAllNotifications: () => api.delete('/notifications/clear-all'),
  createNotification: (data) => api.post('/notifications', data),
  sendDeadlineReminders: () => api.post('/notifications/deadline-reminders'),
};

export const activityAPI = {
  getDashboardActivity: (params) => api.get('/activity/dashboard-activity', { params }),
};

// Thesis Applications API
export const thesisApplicationAPI = {
  applyForProject: (data) => api.post('/thesis-applications', data),
  getProjectApplications: (projectId) => api.get(`/thesis-applications/project/${projectId}`),
  getMyApplications: () => api.get('/thesis-applications/my-applications'),
  updateApplication: (applicationId, data) => api.put(`/thesis-applications/${applicationId}`, data),
};

export default api;

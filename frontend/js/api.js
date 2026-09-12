const API_BASE = 'http://localhost:5000/api';

async function apiRequest(endpoint, { method = 'GET', body = null } = {}) {
  const token = localStorage.getItem('tms_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || 'Request failed');
    error.status = response.status;
    throw error;
  }
  return data;
}

const api = {
  login: (email, password) => apiRequest('/login', { method: 'POST', body: { email, password } }),
  register: (payload) => apiRequest('/register', { method: 'POST', body: payload }),

  getOpenPosts: () => apiRequest('/posts'),
  getMyPosts: () => apiRequest('/posts/mine'),
  createPost: (payload) => apiRequest('/posts', { method: 'POST', body: payload }),

  getApplications: () => apiRequest('/applications'),
  applyToPost: (payload) => apiRequest('/applications', { method: 'POST', body: payload }),

  selectTutor: (post_id, tutor_id) => apiRequest('/select', { method: 'POST', body: { post_id, tutor_id } }),
  getMySelections: () => apiRequest('/selections/mine'),

  getSchedule: () => apiRequest('/schedule'),
  createSchedule: (payload) => apiRequest('/schedule', { method: 'POST', body: payload }),
  getPayments: () => apiRequest('/payments'),
  createPayment: (payload) => apiRequest('/payments', { method: 'POST', body: payload }),

  getFeedback: () => apiRequest('/feedback'),
  submitFeedback: (payload) => apiRequest('/feedback', { method: 'POST', body: payload }),

  getConversations: () => apiRequest('/conversations'),
  startConversation: (payload) => apiRequest('/conversations', { method: 'POST', body: payload }),
  getMessages: (conversationId) => apiRequest(`/messages/${conversationId}`),
  sendMessage: (conversation_id, message) => apiRequest('/messages', { method: 'POST', body: { conversation_id, message } }),
  getNotifications: () => apiRequest('/notifications'),  
  markNotificationRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),


  verifyTutor: (tutor_id) => apiRequest('/admin/verify-tutor', { method: 'POST', body: { tutor_id } }),
  updateUserStatus: (payload) => apiRequest('/admin/update-user-status', { method: 'POST', body: payload }),
  getAdminLog: () => apiRequest('/admin/log'),
};
import axios from 'axios';

const API_URL = '/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    // Convert files array to FormData if dealing with multipart
    if (config.data instanceof FormData) {
      config.headers['Content-Type'] = 'multipart/form-data';
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401s (token expiration)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Do not redirect if the failure was an actual login attempt
      const url = error.config ? error.config.url : '';
      if (!url.includes('/accounts/login/')) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        if (window.location.pathname.startsWith('/superadmin')) {
          window.location.href = '/superadmin';
        } else {
          window.location.href = '/auth?mode=login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// --- Auth Services ---
export const authService = {
  login: (email, password) => apiClient.post('/accounts/login/', { email, password }),
  registerStudent: (data) => apiClient.post('/accounts/register/student/', data),
  registerShop: (data) => apiClient.post('/accounts/register/shop/', data),
  getMe: () => apiClient.get('/accounts/me/'),
};

// --- Shop Services ---
export const shopService = {
  getPublicList: (params) => apiClient.get('/shops/', { params }),
  getPublicDetails: (id) => apiClient.get(`/shops/${id}/`),
  getMyShop: () => apiClient.get('/shops/me'),
  updateMyShop: (data) => apiClient.patch('/shops/me/', data),
  updateStatus: (status) => apiClient.patch('/shops/me/status/', { status }),
  updatePricing: (data) => apiClient.put('/shops/me/price-list/', data),
};

// --- Order Services ---
export const orderService = {
  previewPrice: (data) => apiClient.post('/orders/calculate-price/', data),
  create: (data) => apiClient.post('/orders/', data), // Note: might need to be FormData if files
  getStudentOrders: () => apiClient.get('/orders/student/'),
  getShopOrders: (statusFilter) => apiClient.get('/orders/shop-orders/', { params: { status: statusFilter } }),
  getDetails: (id) => apiClient.get(`/orders/${id}/`),
  
  // Status transitions
  accept: (id) => apiClient.patch(`/orders/${id}/accept/`),
  reject: (id, reason) => apiClient.patch(`/orders/${id}/reject/`, { reason }),
  markReady: (id) => apiClient.patch(`/orders/${id}/mark-ready/`),
  markCollected: (id, verificationCode) => apiClient.patch(`/orders/${id}/mark-collected/`, { verification_code: verificationCode }),
  handleOrderTimeout: (id, action, newShopId) => apiClient.post(`/orders/${id}/handle-timeout/`, { action, new_shop_id: newShopId }),
  getReceipt: (id) => apiClient.get(`/orders/${id}/receipt/`),
};

// --- Payment Services ---
export const paymentService = {
  createRazorpayOrder: (orderId) => apiClient.post('/payments/create-razorpay-order/', { order_id: orderId }),
  verifyPayment: (data) => apiClient.post('/payments/verify/', data),
};

// --- Super Admin Services ---
export const adminService = {
  getAnalytics: () => apiClient.get('/superadmin/analytics/'),
  getPendingShops: () => apiClient.get('/superadmin/shops/pending/'),
  approveShop: (id) => apiClient.patch(`/superadmin/shops/${id}/approve/`),
  getAllOrders: () => apiClient.get('/superadmin/orders/'),
  
  // Broadcasts / Notices
  createNotice: (data) => apiClient.post('/superadmin/notices/', data),
  getNotices: () => apiClient.get('/superadmin/notices/'),
  getNoticeFeed: () => apiClient.get('/superadmin/notices/feed/'),

  // Users
  getUsers: () => apiClient.get('/superadmin/users/'),

  // Shops List for admin
  getShopsList: () => apiClient.get('/superadmin/shops/all/'),

  // Shop status & active controls
  getShopStatusHistory: (id) => apiClient.get(`/superadmin/shops/${id}/status-history/`),
  toggleShopActive: (id) => apiClient.patch(`/superadmin/shops/${id}/toggle-active/`),

  // Support
  createSupportTicket: (formData) => apiClient.post('/superadmin/support-ticket/', formData),
};

export default apiClient;

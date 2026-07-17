import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Auto-attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-redirect on 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// AUTH
export const login = (data) => api.post('/v1/user/login', data);

// ENCOUNTERS
export const getEncounters = (params) => api.get('/v1/service/encounters', { params });
export const getEncounterByNumber = (number) => api.get(`/v1/service/encounters/${number}`);

// RECOMMENDATION
export const getRecommendation = (id) => api.get(`/recommendation/${id}`);
export const saveRecommendation = (data) => api.post('/recommendation/log', data);

// AI RECOMMENDATION V1
export const generateAIRecommendation = (data) => api.post('/v1/recomendation', data);

// DIAGNOSIS
export const getDiagnosis = (params) => api.get('/diagnosis', { params });

// TRANSACTIONS
export const getTransactions = (params) => api.get('/transactions', { params });
export const getTransactionById = (id) => api.get(`/transactions/${id}`);
export const createTransaction = (data) => api.post('/transactions', data);

// MRCONSO
export const getMrconso = (params) => api.get('/v1/mrconso', { params });
export const getMrconsoIndo = (params) => api.get('/v1/mrconso_indo', { params });

export default api;

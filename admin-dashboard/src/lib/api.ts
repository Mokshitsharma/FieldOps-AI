import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://movigoinnovations.com/fieldops-api/api/v1';

const api = axios.create({ baseURL: API_URL, timeout: 30000 });

// ─── Auth interceptor ─────────────────────────────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err.response?.status === 401 && err.config && !err.config._retry) {
      err.config._retry = true;
      try {
        const refresh = localStorage.getItem('refreshToken');
        if (!refresh) throw new Error('No refresh token');
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: refresh, userType: 'admin' });
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        err.config.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(err.config);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// ─── Services ─────────────────────────────────────────────────
export const dashboardApi = { getStats: () => api.get('/dashboard/stats').then(r => r.data.data) };

export const employeesApi = {
  getAll: (p?: any) => api.get('/employees', { params: p }).then(r => r.data),
  getById: (id: string) => api.get(`/employees/${id}`).then(r => r.data.data),
  create: (d: any) => api.post('/employees', d).then(r => r.data),
  update: (id: string, d: any) => api.put(`/employees/${id}`, d).then(r => r.data),
  toggleStatus: (id: string) => api.patch(`/employees/${id}/status`).then(r => r.data),
  salaryHike: (id: string, d: any) => api.post(`/employees/${id}/salary-hike`, d).then(r => r.data),
  giveBonus: (id: string, d: any) => api.post(`/employees/${id}/bonus`, d).then(r => r.data),
  assignZones: (id: string, zoneIds: number[]) => api.put(`/employees/${id}/zones`, { zoneIds }).then(r => r.data),
};

export const zonesApi = {
  getAll: () => api.get('/zones').then(r => r.data.data),
  create: (d: any) => api.post('/zones', d).then(r => r.data),
  update: (id: number, d: any) => api.put(`/zones/${id}`, d).then(r => r.data),
  delete: (id: number) => api.delete(`/zones/${id}`).then(r => r.data),
};

export const attendanceApi = {
  getAll: (p?: any) => api.get('/attendance', { params: p }).then(r => r.data),
  getLive: () => api.get('/location/live').then(r => r.data.data),
  getRoute: (empId: string, date: string) => api.get(`/location/route/${empId}/${date}`).then(r => r.data.data),
};

export const driversApi = {
  getAll: (p?: any) => api.get('/drivers', { params: p }).then(r => r.data),
  getStats: (p?: any) => api.get('/drivers/stats', { params: p }).then(r => r.data.data),
  passToCalling: (id: number, callingEmployeeId?: number) => api.patch(`/drivers/${id}/pass-to-calling`, { callingEmployeeId }).then(r => r.data),
};

export const retailersApi = {
  getAll: (p?: any) => api.get('/retailers', { params: p }).then(r => r.data),
  getStats: (p?: any) => api.get('/retailers/stats', { params: p }).then(r => r.data.data),
};

export const callsApi = {
  getAll: (p?: any) => api.get('/calls', { params: p }).then(r => r.data),
  getStats: (p?: any) => api.get('/calls/stats', { params: p }).then(r => r.data.data),
};

export const paymentsApi = {
  getAll: (p?: any) => api.get('/payments', { params: p }).then(r => r.data),
  verify: (id: number) => api.patch(`/payments/${id}/verify`).then(r => r.data),
};

export const reportsApi = {
  getDailyReports: (p?: any) => api.get('/daily-reports', { params: p }).then(r => r.data),
  addRemark: (id: number, remarks: string) => api.patch(`/daily-reports/${id}/remark`, { remarks }).then(r => r.data),
};

export const leaderboardApi = {
  get: (p?: any) => api.get('/leaderboard', { params: p }).then(r => r.data.data),
  getRecommendation: (month: number, year: number) => api.get('/employee-of-month/recommend', { params: { month, year } }).then(r => r.data.data),
  confirmWinner: (d: any) => api.post('/employee-of-month/confirm', d).then(r => r.data),
  getHistory: (year?: number) => api.get('/employee-of-month/history', { params: { year } }).then(r => r.data.data),
  reviewTeamworkBonus: (id: number, d: any) => api.patch(`/leaderboard/teamwork-bonus/${id}`, d).then(r => r.data),
};

export const noticesApi = {
  getAll: (p?: any) => api.get('/notices', { params: p }).then(r => r.data),
  create: (d: any) => api.post('/notices', d).then(r => r.data),
  delete: (id: number) => api.delete(`/notices/${id}`).then(r => r.data),
};

export const notesApi = {
  getAll: (p?: any) => api.get('/notes', { params: p }).then(r => r.data),
  send: (d: any) => api.post('/notes', d).then(r => r.data),
  reply: (id: number, content: string) => api.post(`/notes/${id}/reply`, { content }).then(r => r.data),
};

export const warningsApi = {
  getAll: (p?: any) => api.get('/warnings', { params: p }).then(r => r.data.data),
  issue: (d: any) => api.post('/warnings', d).then(r => r.data),
};

export const salaryApi = {
  getAll: (p?: any) => api.get('/salary', { params: p }).then(r => r.data.data),
  generate: (d: any) => api.post('/salary/generate', d).then(r => r.data),
  generateBulk: (d: any) => api.post('/salary/generate-bulk', d).then(r => r.data),
  approve: (id: number) => api.patch(`/salary/${id}/approve`).then(r => r.data),
  markPaid: (id: number) => api.patch(`/salary/${id}/paid`).then(r => r.data),
  adjust: (id: number, d: any) => api.patch(`/salary/${id}/adjust`, d).then(r => r.data),
  getHistory: (empId: string) => api.get(`/salary/history/${empId}`).then(r => r.data.data),
};

export const targetsApi = {
  getAll: (p?: any) => api.get('/targets', { params: p }).then(r => r.data.data),
  create: (d: any) => api.post('/targets', d).then(r => r.data),
};

export const leavesApi = {
  getAll: (p?: any) => api.get('/leaves', { params: p }).then(r => r.data.data),
  review: (id: number, d: any) => api.patch(`/leaves/${id}/review`, d).then(r => r.data),
};

export const expensesApi = {
  getAll: (p?: any) => api.get('/expenses', { params: p }).then(r => r.data.data),
  review: (id: number, d: any) => api.patch(`/expenses/${id}/review`, d).then(r => r.data),
};

export const configApi = {
  get: () => api.get('/app-config').then(r => r.data.data),
  update: (key: string, value: any) => api.post('/app-config', { key, value }).then(r => r.data),
};

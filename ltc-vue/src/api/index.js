import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Response interceptor: redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me')
}

export const bookingsApi = {
  list: (params) => api.get('/bookings', { params }),
  get: (id) => api.get(`/bookings/${id}`),
  create: (data) => api.post('/bookings', data),
  update: (id, data) => api.patch(`/bookings/${id}`, data),
  delete: (id) => api.delete(`/bookings/${id}`)
}

export const passengersApi = {
  list: (params) => api.get('/passengers', { params }),
  get: (id) => api.get(`/passengers/${id}`),
  create: (data) => api.post('/passengers', data),
  update: (id, data) => api.patch(`/passengers/${id}`, data),
  delete: (id) => api.delete(`/passengers/${id}`)
}

export const driversApi = {
  list: (params) => api.get('/drivers', { params }),
  get: (id) => api.get(`/drivers/${id}`),
  create: (data) => api.post('/drivers', data),
  update: (id, data) => api.patch(`/drivers/${id}`, data),
  delete: (id) => api.delete(`/drivers/${id}`)
}

export const vehiclesApi = {
  list: (params) => api.get('/vehicles', { params }),
  get: (id) => api.get(`/vehicles/${id}`),
  create: (data) => api.post('/vehicles', data),
  update: (id, data) => api.patch(`/vehicles/${id}`, data),
  delete: (id) => api.delete(`/vehicles/${id}`)
}

export const assignmentsApi = {
  list: (params) => api.get('/assignments', { params }),
  create: (data) => api.post('/assignments', data),
  update: (id, data) => api.patch(`/assignments/${id}`, data)
}

export const tasksApi = {
  today: () => api.get('/tasks/today'),
  updateStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status })
}

export const serviceRecordsApi = {
  list: (params) => api.get('/service-records', { params }),
  create: (data) => api.post('/service-records', data)
}

export const careUnitsApi = {
  list: () => api.get('/care-units'),
  create: (data) => api.post('/care-units', data),
  update: (id, data) => api.patch(`/care-units/${id}`, data),
  delete: (id) => api.delete(`/care-units/${id}`)
}

export const companiesApi = {
  list: () => api.get('/companies'),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.patch(`/companies/${id}`, data),
  delete: (id) => api.delete(`/companies/${id}`)
}

export const usersApi = {
  list: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`)
}

export const recurringTemplatesApi = {
  list: (params) => api.get('/recurring-templates', { params }),
  create: (data) => api.post('/recurring-templates', data),
  update: (id, data) => api.patch(`/recurring-templates/${id}`, data),
  delete: (id) => api.delete(`/recurring-templates/${id}`),
  generate: (data) => api.post('/recurring-templates/generate', data)
}

export default api

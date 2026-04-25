import axios from 'axios'
const api = axios.create({ baseURL: 'http://localhost:8000/api', timeout: 10000 })
api.interceptors.response.use(res => res.data, err => Promise.reject(err))
export default api

import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '' })

export const getCars           = ()       => api.get('/api/cars')
export const getPrediction     = (params) => api.get('/api/predict', { params })
export const getMarketOverview = ()       => api.get('/api/market-overview')
export const getShapImportance = ()       => api.get('/api/shap-importance')
export const clearCache        = ()       => api.delete('/api/clear-cache')
export const seedMarket        = ()       => api.post('/api/seed-market')

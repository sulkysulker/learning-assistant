import axiosInstance from '../utils/axiosInstance'
import { API_PATHS } from '../utils/apiPaths'

export const getDashboardStats = async () => {
  const response = await axiosInstance.get(API_PATHS.DASHBOARD.STATS)
  return response.data
}

export const getDashboardActivities = async () => {
  const response = await axiosInstance.get(API_PATHS.DASHBOARD.ACTIVITIES)
  return response.data
}

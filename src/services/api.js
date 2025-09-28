import axios from "axios";
import { ENV_CONFIG } from "../config/environment";

const api = axios.create({
  baseURL: ENV_CONFIG.FULL_API_URL,
});

api.interceptors.request.use(config => {
  try {
    const user = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
    if (user?.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    // Add ngrok skip warning header to bypass ngrok warning page
    config.headers['ngrok-skip-browser-warning'] = 'true';
    // Enable credentials to match backend CORS configuration
    config.withCredentials = true;
  } catch (error) {
    // Silent error handling
  }
  return config;
});

// Response interceptor to handle authentication errors
api.interceptors.response.use(
  response => response,
  error => {
    // Only logout on specific authentication errors, not on user not found errors
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || "";
      const errorMessage = error.response?.data?.message || "";
      
      // Don't logout for user search operations - these should return 404, not 401
      const isUserSearchOperation = requestUrl.includes('/users/') && 
                                   !requestUrl.includes('/users/details') && 
                                   !requestUrl.includes('/users/password') &&
                                   !requestUrl.includes('/users/logout');
      
      // Don't logout for group operations that might return 401 for user not found
      const isGroupUserOperation = requestUrl.includes('/groups/') && requestUrl.includes('/users/');
      
      // Only logout for actual authentication errors (token issues, login, etc.)
      const isAuthEndpoint = requestUrl.includes('/users/login') || 
                            requestUrl.includes('/users/logout') ||
                            requestUrl.includes('/users/details') ||
                            requestUrl.includes('/users/password') ||
                            requestUrl.includes('/friends') ||
                            requestUrl.includes('/groups') && !requestUrl.includes('/users/');
      
      // Check if error message indicates authentication failure
      const isAuthError = errorMessage.toLowerCase().includes('token') || 
                         errorMessage.toLowerCase().includes('unauthorized') ||
                         errorMessage.toLowerCase().includes('authentication') ||
                         errorMessage.toLowerCase().includes('invalid credentials');
      
      // Only logout if it's an authentication endpoint with auth error, not user search
      if (isAuthEndpoint && isAuthError && !isUserSearchOperation && !isGroupUserOperation) {
        sessionStorage.removeItem("currentUser");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

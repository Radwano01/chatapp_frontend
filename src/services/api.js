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

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Clear invalid token and redirect to login
      sessionStorage.removeItem("currentUser");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

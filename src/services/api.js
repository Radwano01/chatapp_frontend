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
      console.log("API Request with auth:", {
        url: config.url,
        method: config.method,
        hasToken: !!user.token,
        tokenLength: user.token?.length
      });
    } else {
      console.warn("API Request without auth:", {
        url: config.url,
        method: config.method,
        hasUser: !!user,
        userKeys: Object.keys(user)
      });
    }
    // Add ngrok skip warning header to bypass ngrok warning page
    config.headers['ngrok-skip-browser-warning'] = 'true';
    // Enable credentials to match backend CORS configuration
    config.withCredentials = true;
  } catch (error) {
    console.error("API interceptor error:", error);
  }
  return config;
});

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      console.error("401 Unauthorized error:", {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
      
      // Clear invalid token and redirect to login
      sessionStorage.removeItem("currentUser");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

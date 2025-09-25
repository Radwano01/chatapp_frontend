import axios from "axios";
import { ENV_CONFIG } from "../config/environment";

const api = axios.create({
  baseURL: ENV_CONFIG.FULL_API_URL,
});

api.interceptors.request.use(config => {
  try {
    const user = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
    if (user?.token) config.headers.Authorization = `Bearer ${user.token}`;
    // Add ngrok skip warning header to bypass ngrok warning page
    config.headers['ngrok-skip-browser-warning'] = 'true';
    // Enable credentials to match backend CORS configuration
    config.withCredentials = true;
    console.log("API Request:", config.method?.toUpperCase(), config.baseURL + config.url);
    console.log("Headers:", config.headers);
  } catch (error) {
    console.warn("Failed to parse currentUser from sessionStorage:", error);
  }
  return config;
});

export default api;

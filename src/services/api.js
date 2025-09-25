import axios from "axios";

console.log("Environment variables:", {
  REACT_APP_API_URL: process.env.REACT_APP_API_URL,
  REACT_APP_API_PATH: process.env.REACT_APP_API_PATH,
  REACT_APP_WS_PATH: process.env.REACT_APP_WS_PATH
});

const api = axios.create({
  baseURL: `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PATH}`,
  withCredentials: true,
});

api.interceptors.request.use(config => {
  try {
    const user = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
    if (user?.token) config.headers.Authorization = `Bearer ${user.token}`;
    // Add ngrok skip warning header to bypass ngrok warning page
    config.headers['ngrok-skip-browser-warning'] = 'true';
    console.log("API Request:", config.method?.toUpperCase(), config.baseURL + config.url);
    console.log("Headers:", config.headers);
  } catch (error) {
    console.warn("Failed to parse currentUser from sessionStorage:", error);
  }
  return config;
});

export default api;

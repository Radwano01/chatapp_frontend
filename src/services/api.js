import axios from "axios";

const api = axios.create({
  baseURL: `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PATH}`,
});

api.interceptors.request.use(config => {
  try {
    const user = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
    if (user?.token) config.headers.Authorization = `Bearer ${user.token}`;
    console.log("API Request:", config.method?.toUpperCase(), config.baseURL + config.url);
    console.log("Headers:", config.headers);
  } catch (error) {
    console.warn("Failed to parse currentUser from sessionStorage:", error);
  }
  return config;
});

export default api;

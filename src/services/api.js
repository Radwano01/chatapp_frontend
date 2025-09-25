import axios from "axios";

const api = axios.create({
  baseURL: `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PATH}`,
});

api.interceptors.request.use(config => {
  const user = JSON.parse(sessionStorage.getItem("currentUser"));
  if (user?.token) config.headers.Authorization = `Bearer ${user.token}`;
  return config;
});

export default api;

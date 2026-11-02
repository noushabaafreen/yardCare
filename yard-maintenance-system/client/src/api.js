import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000" });
api.interceptors.request.use(config => {
  const token = localStorage.getItem("yard_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 && !String(error.config?.url).includes("/auth/login")) {
      localStorage.removeItem("yard_token");
      localStorage.removeItem("yard_admin");
      window.dispatchEvent(new Event("yard-session-expired"));
    }
    return Promise.reject(error);
  }
);
export default api;

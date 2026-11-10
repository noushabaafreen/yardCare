import axios from "axios";

const api = axios.create({
  // Change the port below to the one your Express server prints on startup.
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000"
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("yard_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    // A 401 on the login call just means wrong credentials, not an expired session.
    if (error.response?.status === 401 && !url.includes("/api/auth/login")) {
      localStorage.removeItem("yard_token");
      localStorage.removeItem("yard_admin");
      localStorage.removeItem("yard_role");
      localStorage.removeItem("yard_permissions");
      window.dispatchEvent(new Event("yard-session-expired"));
    }
    return Promise.reject(error);
  }
);

export default api;
import axios from "axios";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const client = axios.create({ baseURL: API_BASE });
client.interceptors.request.use((config) => {
    const token = localStorage.getItem("landsync_token");
    if (token)
        config.headers.Authorization = `Bearer ${token}`;
    return config;
});
client.interceptors.response.use((res) => res, (err) => {
    if (err.response?.status === 401) {
        localStorage.removeItem("landsync_token");
        localStorage.removeItem("landsync_user");
        if (!location.pathname.includes("/login"))
            location.href = "/login";
    }
    return Promise.reject(err);
});
export default client;
export { API_BASE };

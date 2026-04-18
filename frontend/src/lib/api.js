import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

// Attach admin token if present
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("tierra_admin_token");
    if (token && config.url && config.url.startsWith("/admin")) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

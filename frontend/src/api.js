import axios from "axios";

const DEFAULT_API_BASE_URL = "https://rent-breaker-ms.onrender.com/api";
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
const API_BASE_URL = configuredApiBaseUrl.replace(/\/+$/, "");

export function setToken(token) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

export function getToken() {
  return localStorage.getItem("token");
}

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

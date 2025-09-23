// src/api/client.js
import axios from "axios";

/**
 * 统一的 axios 实例（全项目只此一个）
 * - 默认 baseURL 走 "/api"（Vite 代理到 Django）
 * - 若你不想配代理，可在 .env 里设置 VITE_API_BASE="http://127.0.0.1:8000/api"
 */
const BASE_URL = import.meta?.env?.VITE_API_BASE || "/api";

/**
 * 如果后端用 SessionAuth + CSRF：设为 true，并配置 csrftoken 名称
 * 如果后端用 JWT/Token：设为 false（通常更简单）
 */
const USE_SESSION = false; // ← 按你的后端实际情况改：true=Session/CSRF，false=JWT/Token

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: USE_SESSION, // Session/CSRF 需要携带 Cookie
  ...(USE_SESSION
    ? {
        xsrfCookieName: "csrftoken",
        xsrfHeaderName: "X-CSRFToken",
      }
    : {}),
});

/**
 * （可选）统一请求拦截器
 * - 如果用 JWT，把本地 token 挂到 Authorization
 * - 如果用 Session，可以在这里做 traceId、语言等头部
 */
api.interceptors.request.use((config) => {
  if (!USE_SESSION) {
    const token = localStorage.getItem("token");
    if (token && !config.headers?.Authorization) {
      config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
    }
  }
  return config;
});

/**
 * （可选）统一响应错误处理
 * 你可以在这里做 401 统一跳转登录、刷新 token、消息提示等
 */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // 例如：未登录处理
    // if (err?.response?.status === 401) { window.location.href = "/login"; }
    return Promise.reject(err);
  }
);

/** 便捷方法：保持你原来两个项目的调用习惯 */
export const get   = (url, cfg)           => api.get(url, cfg).then((r) => r.data);
export const post  = (url, data, cfg)     => api.post(url, data, cfg).then((r) => r.data);
export const patch = (url, data, cfg)     => api.patch(url, data, cfg).then((r) => r.data);
export const del   = (url, cfg)           => api.delete(url, cfg).then((r) => r.data);

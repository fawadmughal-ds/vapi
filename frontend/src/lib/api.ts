"use client";

// Default to a relative base so the browser calls whatever origin served the
// app (localhost:3000, an ngrok URL, a real domain…). Next.js rewrites proxy
// /api/v1/* to the backend, so one origin covers UI + API everywhere.
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
const PREFIX = "/api/v1";

const ACCESS_KEY = "voxa_access_token";
const REFRESH_KEY = "voxa_refresh_token";
// While impersonating, the admin's own tokens are parked under these keys.
const ADMIN_ACCESS_KEY = "voxa_admin_access_token";
const ADMIN_REFRESH_KEY = "voxa_admin_refresh_token";
const IMPERSONATE_NAME_KEY = "voxa_impersonating_name";

export const tokenStore = {
  get access() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(ADMIN_ACCESS_KEY);
    localStorage.removeItem(ADMIN_REFRESH_KEY);
    localStorage.removeItem(IMPERSONATE_NAME_KEY);
  },
  get isImpersonating() {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem(ADMIN_ACCESS_KEY);
  },
  get impersonatedName() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(IMPERSONATE_NAME_KEY);
  },
  beginImpersonation(access: string, refresh: string, name: string) {
    // Park the current (admin) session, then switch to the customer session.
    const curAccess = localStorage.getItem(ACCESS_KEY);
    const curRefresh = localStorage.getItem(REFRESH_KEY);
    if (curAccess && curRefresh) {
      localStorage.setItem(ADMIN_ACCESS_KEY, curAccess);
      localStorage.setItem(ADMIN_REFRESH_KEY, curRefresh);
    }
    localStorage.setItem(IMPERSONATE_NAME_KEY, name);
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  endImpersonation(): boolean {
    const adminAccess = localStorage.getItem(ADMIN_ACCESS_KEY);
    const adminRefresh = localStorage.getItem(ADMIN_REFRESH_KEY);
    if (!adminAccess || !adminRefresh) return false;
    localStorage.setItem(ACCESS_KEY, adminAccess);
    localStorage.setItem(REFRESH_KEY, adminRefresh);
    localStorage.removeItem(ADMIN_ACCESS_KEY);
    localStorage.removeItem(ADMIN_REFRESH_KEY);
    localStorage.removeItem(IMPERSONATE_NAME_KEY);
    return true;
  },
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
  isForm?: boolean;
}

async function refreshTokens(): Promise<boolean> {
  const refresh = tokenStore.refresh;
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_URL}${PREFIX}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    tokenStore.set(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
  retry = true
): Promise<T> {
  const { body, auth = true, isForm = false, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = { ...(headers as object) };
  if (!isForm) finalHeaders["Content-Type"] = "application/json";
  if (auth && tokenStore.access) {
    finalHeaders["Authorization"] = `Bearer ${tokenStore.access}`;
  }

  const res = await fetch(`${API_URL}${PREFIX}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: isForm
      ? (body as BodyInit)
      : body !== undefined
        ? JSON.stringify(body)
        : undefined,
  });

  if (res.status === 401 && auth && retry) {
    const refreshed = await refreshTokens();
    if (refreshed) return request<T>(path, options, false);
    tokenStore.clear();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new ApiError("Session expired", 401);
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data.detail === "string") {
        detail = data.detail;
      } else if (Array.isArray(data.detail)) {
        // FastAPI validation errors (422) come back as a list of field errors.
        detail = data.detail
          .map((e: { loc?: (string | number)[]; msg?: string }) => {
            const field = e.loc?.filter((p) => p !== "body").join(".");
            return field ? `${field}: ${e.msg}` : e.msg;
          })
          .filter(Boolean)
          .join("; ");
      }
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "POST", body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "DELETE" }),
  upload: <T>(path: string, form: FormData) =>
    request<T>(path, { method: "POST", body: form, isForm: true }),
  getBlob: async (path: string, retry = true): Promise<Blob> => {
    const headers: Record<string, string> = {};
    if (tokenStore.access) headers["Authorization"] = `Bearer ${tokenStore.access}`;
    const res = await fetch(`${API_URL}${PREFIX}${path}`, { headers });
    if (res.status === 401 && retry) {
      if (await refreshTokens()) return api.getBlob(path, false);
      tokenStore.clear();
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new ApiError("Session expired", 401);
    }
    if (!res.ok) throw new ApiError(`Request failed (${res.status})`, res.status);
    return res.blob();
  },
};

export { API_URL };

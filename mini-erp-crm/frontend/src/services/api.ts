const API_BASE = import.meta.env.VITE_API_URL || "/api";

function getToken() {
  return localStorage.getItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || data.error || "Request failed");
  }

  return data;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ success: boolean; data: { token: string; user: import("../types").User } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ success: boolean; data: import("../types").User }>("/auth/me"),

  getDashboard: () =>
    request<{ success: boolean; data: import("../types").DashboardStats }>("/dashboard/stats"),

  getCustomers: (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ success: boolean; data: import("../types").Customer[]; pagination: import("../types").Pagination }>(
      `/customers?${qs}`
    );
  },

  getCustomer: (id: string) =>
    request<{ success: boolean; data: import("../types").Customer }>(`/customers/${id}`),

  createCustomer: (body: object) =>
    request<{ success: boolean; data: import("../types").Customer }>("/customers", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateCustomer: (id: string, body: object) =>
    request<{ success: boolean; data: import("../types").Customer }>(`/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  addFollowUp: (id: string, body: object) =>
    request<{ success: boolean; data: import("../types").CustomerFollowUp }>(`/customers/${id}/followups`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getProducts: (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ success: boolean; data: import("../types").Product[]; pagination: import("../types").Pagination }>(
      `/products?${qs}`
    );
  },

  getProduct: (id: string) =>
    request<{ success: boolean; data: import("../types").Product }>(`/products/${id}`),

  createProduct: (body: object) =>
    request<{ success: boolean; data: import("../types").Product }>("/products", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateProduct: (id: string, body: object) =>
    request<{ success: boolean; data: import("../types").Product }>(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  getInventory: (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ success: boolean; data: import("../types").Product[]; pagination: import("../types").Pagination }>(
      `/inventory?${qs}`
    );
  },

  getMovements: (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ success: boolean; data: import("../types").StockMovement[]; pagination: import("../types").Pagination }>(
      `/inventory/movements?${qs}`
    );
  },

  updateStock: (productId: string, body: object) =>
    request<{ success: boolean; data: unknown }>(`/inventory/${productId}/stock`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getChallans: (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ success: boolean; data: import("../types").Challan[]; pagination: import("../types").Pagination }>(
      `/challans?${qs}`
    );
  },

  getChallan: (id: string) =>
    request<{ success: boolean; data: import("../types").Challan }>(`/challans/${id}`),

  getNextChallanNumber: () =>
    request<{ success: boolean; data: { challanNumber: string } }>("/challans/next-number"),

  createChallan: (body: object) =>
    request<{ success: boolean; data: import("../types").Challan }>("/challans", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateChallan: (id: string, body: object) =>
    request<{ success: boolean; data: import("../types").Challan }>(`/challans/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  confirmChallan: (id: string) =>
    request<{ success: boolean; data: import("../types").Challan }>(`/challans/${id}/confirm`, {
      method: "POST",
    }),

  cancelChallan: (id: string) =>
    request<{ success: boolean; data: import("../types").Challan }>(`/challans/${id}/cancel`, {
      method: "POST",
    }),

  getUsers: () =>
    request<{ success: boolean; data: import("../types").User[] }>("/users"),

  createUser: (body: object) =>
    request<{ success: boolean; data: import("../types").User }>("/users", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export function formatCurrency(value: string | number) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
}

export function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}


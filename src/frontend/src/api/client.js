const BASE_URL = import.meta.env.VITE_API_URL || "";

function getKey() {
  return localStorage.getItem("payday_api_key") || "";
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${getKey()}`,
      ...options.headers,
    },
    ...options,
  });

  if (res.status === 401) {
    localStorage.removeItem("payday_api_key");
    window.location.reload();
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function fetchTransactions(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await request(`/api/v1/transactions${qs ? `?${qs}` : ""}`);
  return data.data;
}

export async function fetchTransaction(id) {
  const data = await request(`/api/v1/transactions/${id}`);
  return data.transaction;
}

export async function createTransaction(payload) {
  const data = await request("/api/v1/transactions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.transaction;
}

export async function refundTransaction(id) {
  const data = await request(`/api/v1/transactions/${id}/refund`, { method: "POST" });
  return data.transaction;
}

export async function fetchSummary() {
  const data = await request("/api/v1/analytics/summary");
  return data.summary;
}

export async function fetchTimeseries() {
  const data = await request("/api/v1/analytics/timeseries");
  return data.timeseries;
}

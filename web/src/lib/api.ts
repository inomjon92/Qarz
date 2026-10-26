import { t } from "./i18n";

const KEY_TOKEN = "qd_token";
const KEY_API = "qd_api";

export const getApiBase = () => localStorage.getItem(KEY_API) || import.meta.env.VITE_API_URL || "";
export const setApiBase = (url: string) => (url ? localStorage.setItem(KEY_API, url.replace(/\/+$/, "")) : localStorage.removeItem(KEY_API));
export const getToken = () => localStorage.getItem(KEY_TOKEN);
export const setToken = (t: string | null) => (t ? localStorage.setItem(KEY_TOKEN, t) : localStorage.removeItem(KEY_TOKEN));

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(getApiBase() + "/api" + path, {
      method: opts.method || (opts.body ? "POST" : "GET"),
      headers: { "Content-Type": "application/json", ...(getToken() && { Authorization: `Bearer ${getToken()}` }) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(t("Internet yoki server bilan aloqa yo'q"), 0);
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && getToken()) {
    setToken(null);
    location.href = "/login";
  }
  if (!res.ok) throw new ApiError(t(data.error || "Xatolik yuz berdi"), res.status);
  return data as T;
}

export async function download(path: string, filename: string) {
  // Android WebView cannot save blob downloads, so hand a short-lived link to the phone's browser.
  if ((window as any).Capacitor?.isNativePlatform?.()) {
    const full = "/api" + path.split("?")[0];
    const { token } = await api<{ token: string }>("/auth/download-token", { body: { path: full } });
    const sep = path.includes("?") ? "&" : "?";
    location.href = `${getApiBase()}/api${path}${sep}dl=${encodeURIComponent(token)}`;
    return;
  }
  const res = await fetch(getApiBase() + "/api" + path, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new ApiError(t("Yuklab bo'lmadi"), res.status);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface Shop {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  currency: string;
  smsEnabled: boolean;
  smsTemplate: string;
  remindDaysBefore: number;
  remindEveryDays: number;
  receiptSms: boolean;
  receiptTemplate: string;
  role: "OWNER" | "SELLER";
}

export interface Me {
  id: string;
  name: string;
  phone: string;
  telegramLinked: boolean;
  shops: Shop[];
}

export interface Debtor {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  creditLimit: number | null;
  balance: number;
  dueDate: string | null;
  lastSmsAt: string | null;
  publicToken: string;
  deletedAt: string | null;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
}

export interface TxItem {
  productId?: string | null;
  name: string;
  qty: number;
  price: number;
  unit?: string | null;
  total?: number;
}

export interface Tx {
  id: string;
  type: "DEBT" | "PAYMENT";
  amount: number;
  note: string | null;
  dueDate: string | null;
  items?: TxItem[] | null;
  createdAt: string;
  createdBy?: { name: string } | null;
  debtor?: { id: string; name: string };
}

export interface Sms {
  id: string;
  phone: string;
  text: string;
  auto: boolean;
  status: "PENDING" | "SENDING" | "SENT" | "FAILED";
  error: string | null;
  createdAt: string;
  sentAt: string | null;
  debtor?: { name: string } | null;
}

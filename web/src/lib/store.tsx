import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken, type Me, type Shop } from "./api";
import { clearPin } from "./pin";

interface Ctx {
  me: Me | null;
  loading: boolean;
  shop: Shop | null;
  setShopId: (id: string) => void;
  refresh: () => Promise<void>;
  login: (token: string) => Promise<void>;
  logout: () => void;
  isOwner: boolean;
}

const AppCtx = createContext<Ctx>(null!);
export const useApp = () => useContext(AppCtx);

export function AppProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(!!getToken());
  const [shopId, setShopIdState] = useState(localStorage.getItem("qd_shop") || "");

  const refresh = useCallback(async () => {
    if (!getToken()) return setLoading(false);
    try {
      setMe(await api<Me>("/auth/me"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setShopId = (id: string) => {
    localStorage.setItem("qd_shop", id);
    setShopIdState(id);
  };

  const shop = me?.shops.find((s) => s.id === shopId) || me?.shops[0] || null;

  return (
    <AppCtx.Provider
      value={{
        me,
        loading,
        shop,
        setShopId,
        refresh,
        isOwner: shop?.role === "OWNER",
        login: async (token) => {
          clearPin();
          setToken(token);
          setLoading(true);
          await refresh();
        },
        logout: () => {
          clearPin();
          setToken(null);
          setMe(null);
        },
      }}
    >
      {children}
    </AppCtx.Provider>
  );
}

// Simple toast notifications.
type Toast = { id: number; text: string; kind: "ok" | "err" };
let push: (t: Omit<Toast, "id">) => void = () => {};
export const toast = (text: string, kind: Toast["kind"] = "ok") => push({ text, kind });

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    push = (t) => {
      const id = Date.now() + Math.random();
      setItems((x) => [...x, { ...t, id }]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3500);
    };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div key={t.id} className={`pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${t.kind === "ok" ? "bg-slate-900 dark:bg-slate-700" : "bg-rose-600"}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

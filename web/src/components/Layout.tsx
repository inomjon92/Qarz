import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BookOpen, ChevronDown, History, LayoutDashboard, LogOut, MessageSquare, Package, Plus, Settings, Store, Users } from "lucide-react";
import { useApp } from "../lib/store";
import { NewShopModal } from "./NewShopModal";
import { t } from "../lib/i18n";

const nav = [
  { to: "/", label: t("Bosh sahifa"), short: t("Asosiy"), icon: LayoutDashboard },
  { to: "/debtors", label: t("Qarzdorlar"), short: t("Qarzdorlar"), icon: Users },
  { to: "/history", label: t("Tarix"), short: t("Tarix"), icon: History },
  { to: "/sms", label: t("SMS xabarlar"), short: "SMS", icon: MessageSquare },
  { to: "/products", label: t("Mahsulotlar"), short: t("Mahsulot"), icon: Package, desktopOnly: true },
  { to: "/shops", label: t("Do'konlar"), short: t("Do'konlar"), icon: Store, desktopOnly: true },
  { to: "/settings", label: t("Sozlamalar"), short: t("Sozlama"), icon: Settings },
];

function ShopSwitcher() {
  const { me, shop, setShopId } = useApp();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex max-w-[220px] items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
        <Store size={18} className="shrink-0 text-brand-600" />
        <span className="truncate font-semibold">{shop?.name}</span>
        <ChevronDown size={16} className="shrink-0 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="card absolute left-0 z-40 mt-1 w-64 p-1.5 shadow-lg">
            {me?.shops.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setShopId(s.id);
                  setOpen(false);
                  navigate("/");
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800 ${s.id === shop?.id ? "font-semibold text-brand-700 dark:text-brand-500" : ""}`}
              >
                <span className="truncate">{s.name}</span>
                <span className="text-xs text-slate-400">{s.role === "OWNER" ? t("egasi") : t("sotuvchi")}</span>
              </button>
            ))}
            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
            <button
              onClick={() => {
                setOpen(false);
                setCreating(true);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-500 dark:hover:bg-slate-800"
            >
              <Plus size={16} /> {t("Yangi do'kon qo'shish")}
            </button>
          </div>
        </>
      )}
      <NewShopModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

export function Layout() {
  const { me, logout } = useApp();
  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="rounded-xl bg-brand-600 p-2 text-white">
            <BookOpen size={20} />
          </div>
          <span className="text-lg font-bold">{t("Qarz daftari")}</span>
        </div>
        <nav className="flex-1 space-y-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-500" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`
              }
            >
              <n.icon size={19} /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{me?.name}</div>
            <div className="truncate text-xs text-slate-500">{me?.phone}</div>
          </div>
          <button onClick={logout} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-rose-600 dark:hover:bg-slate-700" title={t("Chiqish")}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:px-6" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <ShopSwitcher />
      </header>

      <main className="mx-auto max-w-6xl px-3 pb-28 pt-4 sm:px-6 lg:pb-10">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {nav
          .filter((n) => !n.desktopOnly)
          .map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? "text-brand-600" : "text-slate-500"}`}>
              <n.icon size={22} />
              {n.short}
            </NavLink>
          ))}
      </nav>
    </div>
  );
}

import { useEffect, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { groupDigits } from "../lib/format";

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="card max-h-[92vh] w-full overflow-y-auto rounded-b-none p-5 sm:max-w-md sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Yopish">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function AmountInput({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <input
      className="input text-lg font-semibold"
      inputMode="numeric"
      placeholder="0"
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(groupDigits(e.target.value))}
    />
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} size={20} />;
}

export function PageLoader() {
  return (
    <div className="flex justify-center py-20 text-brand-600">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 rounded-2xl bg-brand-50 p-4 text-brand-600 dark:bg-brand-900/30">{icon}</div>
      <p className="font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone = "slate", icon }: { label: string; value: string; sub?: string; tone?: "slate" | "brand" | "rose" | "amber"; icon?: ReactNode }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    brand: "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-500",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  };
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        {icon && <span className={`rounded-lg p-1.5 ${tones[tone]}`}>{icon}</span>}
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <div className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export function DueBadge({ days }: { days: number | null }) {
  if (days == null) return null;
  const [cls, text] =
    days < 0
      ? ["bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", `${-days} kun o'tdi`]
      : days === 0
        ? ["bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", "Bugun"]
        : days <= 3
          ? ["bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", `${days} kun qoldi`]
          : ["bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", `${days} kun qoldi`];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{text}</span>;
}

export function Avatar({ name }: { name: string }) {
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  const hues = ["bg-emerald-500", "bg-sky-500", "bg-violet-500", "bg-amber-500", "bg-rose-500", "bg-teal-500", "bg-indigo-500"];
  const h = hues[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % hues.length];
  return <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${h}`}>{initials}</div>;
}

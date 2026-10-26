import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Download, Plus, Search, Users } from "lucide-react";
import { api, download, type Debtor } from "../lib/api";
import { toast, useApp } from "../lib/store";
import { daysLeft, money, phone } from "../lib/format";
import { DebtorForm } from "../components/DebtorForm";
import { Avatar, DueBadge, Empty, PageLoader } from "../components/ui";
import { t } from "../lib/i18n";

const filters = [
  { k: "debt", label: t("Qarzdorlar") },
  { k: "overdue", label: t("Muddati o'tgan") },
  { k: "soon", label: t("Muddati yaqin") },
  { k: "paid", label: t("To'laganlar") },
  { k: "all", label: t("Hammasi") },
];

export function DebtorsPage() {
  const { shop, isOwner } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("debt");
  const [sort, setSort] = useState("recent");
  const [data, setData] = useState<{ items: Debtor[]; total: number; withDebt: number } | null>(null);
  const creating = params.get("new") === "1";

  useEffect(() => {
    if (!shop) return;
    const t = setTimeout(() => {
      api(`/shops/${shop.id}/debtors?` + new URLSearchParams({ q, filter, sort })).then(setData);
    }, 250);
    return () => clearTimeout(t);
  }, [shop, q, filter, sort]);

  if (!shop) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("Qarzdorlar")}</h1>
          {data && (
            <p className="text-sm text-slate-500">
              {t("{n} kishi · jami", { n: data.withDebt })} <b className="text-slate-900 dark:text-slate-100">{money(data.total, shop.currency)}</b>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => download(`/shops/${shop.id}/debtors/export.xlsx`, `qarzdorlar-${shop.name}.xlsx`).catch((e) => toast(e.message, "err"))}>
            <Download size={18} /> <span className="hidden sm:inline">Excel</span>
          </button>
          <button className="btn-primary" onClick={() => setParams({ new: "1" })}>
            <Plus size={18} /> {t("Qo'shish")}
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input className="input pl-10" placeholder={t("Ism, telefon yoki manzil bo'yicha qidirish")} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
        {[...filters, ...(isOwner ? [{ k: "deleted", label: t("O'chirilganlar") }] : [])].map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            className={`chip ${filter === f.k ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}
          >
            {f.label}
          </button>
        ))}
        <select className="input ml-auto w-auto min-w-[150px] py-1.5" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">{t("Oxirgi o'zgarish")}</option>
          <option value="balance">{t("Qarz miqdori")}</option>
          <option value="due">{t("Muddat")}</option>
          <option value="name">{t("Ism (A-Z)")}</option>
        </select>
      </div>

      {!data ? (
        <PageLoader />
      ) : data.items.length === 0 ? (
        <div className="card">
          <Empty
            icon={<Users size={28} />}
            title={q ? t("Hech narsa topilmadi") : t("Bu ro'yxat bo'sh")}
            text={q ? t("Boshqa so'z bilan qidirib ko'ring") : t("Yangi qarzdor qo'shish uchun “Qo'shish” tugmasini bosing")}
          />
        </div>
      ) : (
        <div className="card divide-y divide-slate-100 dark:divide-slate-800">
          {data.items.map((d) => (
            <Link key={d.id} to={`/debtors/${d.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <Avatar name={d.name} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{d.name}</div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-500">
                  {d.phone && <span>{phone(d.phone)}</span>}
                  {d.balance > 0 && <DueBadge days={daysLeft(d.dueDate)} />}
                </div>
              </div>
              <div className={`text-right font-semibold ${d.balance > 0 ? "text-rose-600 dark:text-rose-400" : "text-brand-600"}`}>
                {d.balance > 0 ? money(d.balance, shop.currency) : d.balance < 0 ? `+${money(-d.balance, shop.currency)}` : t("To'langan")}
              </div>
            </Link>
          ))}
        </div>
      )}

      <DebtorForm open={creating} onClose={() => setParams({})} onSaved={(d) => navigate(`/debtors/${d.id}`)} />
    </div>
  );
}

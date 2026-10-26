import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Store } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../lib/store";
import { money } from "../lib/format";
import { NewShopModal } from "../components/NewShopModal";
import { PageLoader } from "../components/ui";
import { t } from "../lib/i18n";

interface Summary {
  shops: { id: string; name: string; currency: string; total: number; debtors: number }[];
  total: number;
}

export function ShopsPage() {
  const { me, setShopId } = useApp();
  const navigate = useNavigate();
  const [s, setS] = useState<Summary | null>(null);
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    api<Summary>("/shops/summary").then(setS);
  }, [me]);
  if (!s) return <PageLoader />;
  const multiCurrency = new Set(s.shops.map((x) => x.currency)).size > 1;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("Do'konlarim")}</h1>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus size={18} /> {t("Yangi do'kon")}
        </button>
      </div>
      {!multiCurrency && s.shops.length > 1 && (
        <div className="card p-5">
          <div className="text-sm text-slate-500">{t("Barcha do'konlar bo'yicha jami qarz")}</div>
          <div className="text-3xl font-bold">{money(s.total, s.shops[0]?.currency)}</div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {s.shops.map((x) => (
          <button
            key={x.id}
            onClick={() => {
              setShopId(x.id);
              navigate("/");
            }}
            className="card p-5 text-left transition hover:border-brand-500"
          >
            <div className="flex items-center gap-2">
              <Store className="text-brand-600" size={20} />
              <span className="font-semibold">{x.name}</span>
            </div>
            <div className="mt-3 text-2xl font-bold">{money(x.total, x.currency)}</div>
            <div className="text-sm text-slate-500">{t("{n} ta qarzdor", { n: x.debtors })}</div>
          </button>
        ))}
      </div>
      <NewShopModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

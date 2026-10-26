import { useCallback, useEffect, useState } from "react";
import { Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api, type Product } from "../lib/api";
import { toast, useApp } from "../lib/store";
import { groupDigits, money, parseAmount } from "../lib/format";
import { AmountInput, Empty, Field, Modal, PageLoader } from "../components/ui";
import { t } from "../lib/i18n";

const UNITS = ["dona", "kg", "qop", "litr", "metr", "quti", "blok", "pachka"];

function ProductForm({ product, open, onClose, onSaved }: { product: Product | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const { shop } = useApp();
  const [f, setF] = useState({ name: "", price: "", unit: "dona" });
  useEffect(() => {
    if (open) setF(product ? { name: product.name, price: groupDigits(String(product.price)), unit: product.unit } : { name: "", price: "", unit: "dona" });
  }, [open, product]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = { name: f.name.trim(), price: parseAmount(f.price), unit: f.unit };
      await api(`/shops/${shop!.id}/products${product ? "/" + product.id : ""}`, { method: product ? "PUT" : "POST", body });
      toast(t("Saqlandi"));
      onSaved();
      onClose();
    } catch (err: any) {
      toast(err.message, "err");
    }
  };
  return (
    <Modal open={open} onClose={onClose} title={product ? t("Mahsulotni tahrirlash") : t("Yangi mahsulot")}>
      <form onSubmit={submit} className="space-y-3">
        <Field label={t("Nomi")}>
          <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required autoFocus placeholder={t("Masalan: Un 50 kg")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Narxi")}>
            <AmountInput value={f.price} onChange={(v) => setF({ ...f, price: v })} />
          </Field>
          <Field label={t("O'lchov")}>
            <select className="input" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
        </div>
        <button className="btn-primary w-full py-3">{t("Saqlash")}</button>
      </form>
    </Modal>
  );
}

export function ProductsPage() {
  const { shop, isOwner } = useApp();
  const [items, setItems] = useState<Product[] | null>(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const load = useCallback(() => {
    if (shop) api<Product[]>(`/shops/${shop.id}/products`).then(setItems);
  }, [shop]);
  useEffect(load, [load]);
  if (!shop || !items) return <PageLoader />;
  const shown = items.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("Mahsulotlar")}</h1>
          <p className="text-sm text-slate-500">{t("Qarz yozishda tez tanlash uchun")}</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus size={18} /> {t("Qo'shish")}
        </button>
      </div>
      {items.length > 5 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input className="input pl-10" placeholder={t("Mahsulot qidirish")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}
      <div className="card divide-y divide-slate-100 dark:divide-slate-800">
        {shown.length === 0 && <Empty icon={<Package size={28} />} title={t("Mahsulot yo'q")} text={t("Mahsulot qo'shsangiz, qarz yozishda nomi va narxi avtomatik chiqadi")} />}
        {shown.map((p) => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-3">
            <div className="rounded-xl bg-brand-50 p-2 text-brand-600 dark:bg-brand-900/30">
              <Package size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{p.name}</div>
              <div className="text-sm text-slate-500">
                {money(p.price, shop.currency)} / {p.unit}
              </div>
            </div>
            <button
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => {
                setEditing(p);
                setOpen(true);
              }}
            >
              <Pencil size={16} />
            </button>
            {isOwner && (
              <button
                className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                onClick={() => confirm(t("{name} o'chirilsinmi?", { name: p.name })) && api(`/shops/${shop.id}/products/${p.id}`, { method: "DELETE" }).then(load)}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      <ProductForm product={editing} open={open} onClose={() => setOpen(false)} onSaved={load} />
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, LogOut, Moon, Package, Send, Store, Trash2, UserPlus, Users } from "lucide-react";
import { api } from "../lib/api";
import { toast, useApp } from "../lib/store";
import { applyTheme, getTheme, type Theme } from "../lib/theme";
import { dateTime, phone } from "../lib/format";
import { Field, Modal } from "../components/ui";
import { GatewayCard } from "../components/GatewayCard";
import { PinSetup } from "../components/PinScreen";
import { isNative } from "../lib/native";
import { lang, setLang, t, type Lang } from "../lib/i18n";

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <span className="text-brand-600">{icon}</span> {title}
      </h2>
      {children}
    </section>
  );
}

function ShopSettings() {
  const { shop, refresh, isOwner } = useApp();
  const [f, setF] = useState(shop!);
  useEffect(() => setF(shop!), [shop]);
  if (!isOwner) return null;
  const save = async () => {
    try {
      await api(`/shops/${shop!.id}`, {
        method: "PUT",
        body: { name: f.name, address: f.address, phone: f.phone, currency: f.currency, smsEnabled: f.smsEnabled, smsTemplate: f.smsTemplate, remindDaysBefore: Number(f.remindDaysBefore), remindEveryDays: Number(f.remindEveryDays), receiptSms: f.receiptSms, receiptTemplate: f.receiptTemplate },
      });
      await refresh();
      toast(t("Saqlandi"));
    } catch (e: any) {
      toast(e.message, "err");
    }
  };
  return (
    <Section title={t("Do'kon sozlamalari")} icon={<Store size={18} />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("Nomi")}>
          <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label={t("Telefon")}>
          <input className="input" value={f.phone || ""} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </Field>
        <Field label={t("Manzil")}>
          <input className="input" value={f.address || ""} onChange={(e) => setF({ ...f, address: e.target.value })} />
        </Field>
        <Field label={t("Valyuta")}>
          <select className="input" value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>
            <option value="UZS">{t("So'm (UZS)")}</option>
            <option value="USD">{t("Dollar (USD)")}</option>
          </select>
        </Field>
      </div>
      <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
        <label className="flex items-center gap-3">
          <input type="checkbox" className="h-5 w-5 accent-brand-600" checked={f.smsEnabled} onChange={(e) => setF({ ...f, smsEnabled: e.target.checked })} />
          <span className="font-medium">{t("Muddati kelganda avtomatik SMS yuborish")}</span>
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label={t("Muddatdan necha kun oldin")}>
            <input type="number" min={0} max={30} className="input" value={f.remindDaysBefore} onChange={(e) => setF({ ...f, remindDaysBefore: Number(e.target.value) })} />
          </Field>
          <Field label={t("Qayta eslatish (har N kunda)")}>
            <input type="number" min={1} max={30} className="input" value={f.remindEveryDays} onChange={(e) => setF({ ...f, remindEveryDays: Number(e.target.value) })} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label={t("SMS matni")} hint={t("O'zgaruvchilar: {ism} {summa} {muddat} {dokon}")}>
            <textarea className="input" rows={3} value={f.smsTemplate} onChange={(e) => setF({ ...f, smsTemplate: e.target.value })} />
          </Field>
        </div>
      </div>
      <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
        <label className="flex items-center gap-3">
          <input type="checkbox" className="h-5 w-5 accent-brand-600" checked={f.receiptSms} onChange={(e) => setF({ ...f, receiptSms: e.target.checked })} />
          <span className="font-medium">{t("Har qarz va to'lovdan keyin mijozga SMS chek")}</span>
        </label>
        <div className="mt-3">
          <Field label={t("Chek matni")} hint={t("O'zgaruvchilar: {dokon} {ism} {amal} {summa} {qarz} {muddat}")}>
            <textarea className="input" rows={2} value={f.receiptTemplate} onChange={(e) => setF({ ...f, receiptTemplate: e.target.value })} />
          </Field>
        </div>
      </div>
      <button className="btn-primary mt-4" onClick={save}>
        {t("Saqlash")}
      </button>
    </Section>
  );
}

interface Member {
  id: string;
  role: "OWNER" | "SELLER";
  userId: string;
  name: string;
  phone: string;
}

function Staff() {
  const { shop, me, isOwner } = useApp();
  const [list, setList] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", password: "", role: "SELLER" });
  const load = () => api<Member[]>(`/shops/${shop!.id}/members`).then(setList);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop]);
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api(`/shops/${shop!.id}/members`, { body: { ...f, password: f.password || undefined } });
      toast(t("Xodim qo'shildi"));
      setOpen(false);
      setF({ name: "", phone: "", password: "", role: "SELLER" });
      load();
    } catch (err: any) {
      toast(err.message, "err");
    }
  };
  return (
    <Section title={t("Xodimlar")} icon={<Users size={18} />}>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {list.map((m) => (
          <div key={m.id} className="flex items-center justify-between py-2.5">
            <div>
              <div className="font-medium">{m.name}</div>
              <div className="text-xs text-slate-500">
                {phone(m.phone)} · {m.role === "OWNER" ? t("Egasi") : t("Sotuvchi")}
              </div>
            </div>
            {isOwner && m.userId !== me?.id && (
              <button
                className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                onClick={() => confirm(t("{name} do'kondan chiqarilsinmi?", { name: m.name })) && api(`/shops/${shop!.id}/members/${m.id}`, { method: "DELETE" }).then(load)}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      {isOwner && (
        <button className="btn-ghost mt-3" onClick={() => setOpen(true)}>
          <UserPlus size={16} /> {t("Xodim qo'shish")}
        </button>
      )}
      <p className="mt-3 text-xs text-slate-500">{t("Sotuvchi qarz va to'lov yoza oladi, lekin o'chira olmaydi va sozlamalarni o'zgartira olmaydi.")}</p>
      <Modal open={open} onClose={() => setOpen(false)} title={t("Yangi xodim")}>
        <form onSubmit={add} className="space-y-3">
          <Field label={t("Ism")}>
            <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          </Field>
          <Field label={t("Telefon (login)")}>
            <input className="input" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} required />
          </Field>
          <Field label={t("Parol")} hint={t("Xodim shu telefon va parol bilan kiradi")}>
            <input className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} minLength={6} />
          </Field>
          <Field label={t("Roli")}>
            <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
              <option value="SELLER">{t("Sotuvchi")}</option>
              <option value="OWNER">{t("Egasi (to'liq huquq)")}</option>
            </select>
          </Field>
          <button className="btn-primary w-full">{t("Qo'shish")}</button>
        </form>
      </Modal>
    </Section>
  );
}

function Telegram() {
  const { me, refresh } = useApp();
  const [code, setCode] = useState<{ code: string; bot: string | null } | null>(null);
  return (
    <Section title={t("Telegram hisobot")} icon={<Send size={18} />}>
      {me?.telegramLinked ? (
        <p className="text-sm">{t("✅ Telegram ulangan. Har kuni soat 9:00 da hisobot keladi. Botga /hisobot yozib istalgan vaqtda ko'rishingiz mumkin.")}</p>
      ) : code ? (
        <div className="space-y-2 text-sm">
          <p>{t("Telegram botga quyidagi buyruqni yuboring:")}</p>
          <code className="block rounded-xl bg-slate-100 p-3 font-mono dark:bg-slate-800">/start {code.code}</code>
          {code.bot && (
            <a className="btn-primary" href={`https://t.me/${code.bot}?start=${code.code}`} target="_blank" rel="noreferrer">
              {t("Botni ochish")}
            </a>
          )}
          <button className="btn-ghost ml-2" onClick={refresh}>
            {t("Tekshirish")}
          </button>
        </div>
      ) : (
        <div className="text-sm">
          <p className="mb-3 text-slate-500">{t("Har kuni ertalab jami qarz, bugun muddati kelganlar va muddati o'tganlar ro'yxatini Telegramga oling.")}</p>
          <button className="btn-primary" onClick={() => api("/auth/telegram-code", { method: "POST" }).then(setCode)}>
            {t("Telegramni ulash")}
          </button>
        </div>
      )}
    </Section>
  );
}

function Profile() {
  const { me, logout } = useApp();
  const [f, setF] = useState({ oldPassword: "", newPassword: "" });
  const [theme, setTheme] = useState<Theme>(getTheme());
  const [changingPin, setChangingPin] = useState(false);
  return (
    <Section title={t("Profil")} icon={<Moon size={18} />}>
      <div className="text-sm">
        <b>{me?.name}</b> · {phone(me?.phone)}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <input className="input" type="password" placeholder={t("Eski parol")} value={f.oldPassword} onChange={(e) => setF({ ...f, oldPassword: e.target.value })} />
        <input className="input" type="password" placeholder={t("Yangi parol")} value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} />
        <button
          className="btn-ghost"
          onClick={() =>
            api("/auth/me", { method: "PUT", body: f })
              .then(() => (toast(t("Parol o'zgartirildi")), setF({ oldPassword: "", newPassword: "" })))
              .catch((e) => toast(e.message, "err"))
          }
        >
          {t("Parolni o'zgartirish")}
        </button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">{t("Mavzu:")}</span>
        {(["light", "dark", "system"] as Theme[]).map((th) => (
          <button
            key={th}
            className={`chip ${theme === th ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 dark:border-slate-700"}`}
            onClick={() => {
              applyTheme(th);
              setTheme(th);
            }}
          >
            {{ light: t("Yorug'"), dark: t("Qorong'i"), system: t("Avtomatik") }[th]}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">{t("Til:")}</span>
        {(["uz", "ru"] as Lang[]).map((l) => (
          <button
            key={l}
            className={`chip ${lang === l ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 dark:border-slate-700"}`}
            onClick={() => lang !== l && setLang(l)}
          >
            {l === "uz" ? "O'zbekcha" : "Русский"}
          </button>
        ))}
      </div>
      {isNative() && (
        <button className="btn-ghost mt-4 mr-2" onClick={() => setChangingPin(true)}>
          {t("PIN kodni o'zgartirish")}
        </button>
      )}
      {changingPin && <PinSetup onDone={() => (setChangingPin(false), toast(t("PIN kod o'zgartirildi")))} />}
      <button className="btn-ghost mt-4 text-rose-600" onClick={logout}>
        <LogOut size={16} /> {t("Chiqish")}
      </button>
    </Section>
  );
}

function ActivityLog() {
  const { shop, isOwner } = useApp();
  const [items, setItems] = useState<any[] | null>(null);
  if (!isOwner) return null;
  return (
    <Section title={t("Faoliyat jurnali")} icon={<Activity size={18} />}>
      {!items ? (
        <button className="btn-ghost" onClick={() => api(`/shops/${shop!.id}/activity`).then(setItems)}>
          {t("Ko'rsatish")}
        </button>
      ) : (
        <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto text-sm dark:divide-slate-800">
          {items.map((a) => (
            <div key={a.id} className="py-2">
              <b>{a.action}</b> {a.details && <span className="text-slate-500">— {a.details}</span>}
              <div className="text-xs text-slate-500">
                {dateTime(a.createdAt)} · {a.user?.name || t("tizim")}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

export function SettingsPage() {
  const { shop } = useApp();
  if (!shop) return null;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("Sozlamalar")}</h1>
      <div className="grid gap-3 lg:hidden">
        <Link to="/shops" className="card flex items-center gap-3 p-4">
          <Store className="text-brand-600" size={20} /> <span className="font-medium">{t("Do'konlarim va yangi do'kon qo'shish")}</span>
        </Link>
        <Link to="/products" className="card flex items-center gap-3 p-4">
          <Package className="text-brand-600" size={20} /> <span className="font-medium">{t("Mahsulotlar ro'yxati")}</span>
        </Link>
      </div>
      <GatewayCard />
      <ShopSettings />
      <Staff />
      <Telegram />
      <Profile />
      <ActivityLog />
    </div>
  );
}

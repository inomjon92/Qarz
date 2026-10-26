import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, LogOut, Moon, Send, Store, Trash2, UserPlus, Users } from "lucide-react";
import { api } from "../lib/api";
import { toast, useApp } from "../lib/store";
import { applyTheme, getTheme, type Theme } from "../lib/theme";
import { dateTime, phone } from "../lib/format";
import { Field, Modal } from "../components/ui";
import { GatewayCard } from "../components/GatewayCard";
import { PinSetup } from "../components/PinScreen";
import { isNative } from "../lib/native";

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
        body: { name: f.name, address: f.address, phone: f.phone, currency: f.currency, smsEnabled: f.smsEnabled, smsTemplate: f.smsTemplate, remindDaysBefore: Number(f.remindDaysBefore), remindEveryDays: Number(f.remindEveryDays) },
      });
      await refresh();
      toast("Saqlandi");
    } catch (e: any) {
      toast(e.message, "err");
    }
  };
  return (
    <Section title="Do'kon sozlamalari" icon={<Store size={18} />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nomi">
          <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="Telefon">
          <input className="input" value={f.phone || ""} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </Field>
        <Field label="Manzil">
          <input className="input" value={f.address || ""} onChange={(e) => setF({ ...f, address: e.target.value })} />
        </Field>
        <Field label="Valyuta">
          <select className="input" value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>
            <option value="UZS">So'm (UZS)</option>
            <option value="USD">Dollar (USD)</option>
          </select>
        </Field>
      </div>
      <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
        <label className="flex items-center gap-3">
          <input type="checkbox" className="h-5 w-5 accent-brand-600" checked={f.smsEnabled} onChange={(e) => setF({ ...f, smsEnabled: e.target.checked })} />
          <span className="font-medium">Muddati kelganda avtomatik SMS yuborish</span>
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Muddatdan necha kun oldin">
            <input type="number" min={0} max={30} className="input" value={f.remindDaysBefore} onChange={(e) => setF({ ...f, remindDaysBefore: Number(e.target.value) })} />
          </Field>
          <Field label="Qayta eslatish (har N kunda)">
            <input type="number" min={1} max={30} className="input" value={f.remindEveryDays} onChange={(e) => setF({ ...f, remindEveryDays: Number(e.target.value) })} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="SMS matni" hint="O'zgaruvchilar: {ism} {summa} {muddat} {dokon}">
            <textarea className="input" rows={3} value={f.smsTemplate} onChange={(e) => setF({ ...f, smsTemplate: e.target.value })} />
          </Field>
        </div>
      </div>
      <button className="btn-primary mt-4" onClick={save}>
        Saqlash
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
      toast("Xodim qo'shildi");
      setOpen(false);
      setF({ name: "", phone: "", password: "", role: "SELLER" });
      load();
    } catch (err: any) {
      toast(err.message, "err");
    }
  };
  return (
    <Section title="Xodimlar" icon={<Users size={18} />}>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {list.map((m) => (
          <div key={m.id} className="flex items-center justify-between py-2.5">
            <div>
              <div className="font-medium">{m.name}</div>
              <div className="text-xs text-slate-500">
                {phone(m.phone)} · {m.role === "OWNER" ? "Egasi" : "Sotuvchi"}
              </div>
            </div>
            {isOwner && m.userId !== me?.id && (
              <button
                className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                onClick={() => confirm(`${m.name} do'kondan chiqarilsinmi?`) && api(`/shops/${shop!.id}/members/${m.id}`, { method: "DELETE" }).then(load)}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      {isOwner && (
        <button className="btn-ghost mt-3" onClick={() => setOpen(true)}>
          <UserPlus size={16} /> Xodim qo'shish
        </button>
      )}
      <p className="mt-3 text-xs text-slate-500">Sotuvchi qarz va to'lov yoza oladi, lekin o'chira olmaydi va sozlamalarni o'zgartira olmaydi.</p>
      <Modal open={open} onClose={() => setOpen(false)} title="Yangi xodim">
        <form onSubmit={add} className="space-y-3">
          <Field label="Ism">
            <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          </Field>
          <Field label="Telefon (login)">
            <input className="input" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} required />
          </Field>
          <Field label="Parol" hint="Xodim shu telefon va parol bilan kiradi">
            <input className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} minLength={6} />
          </Field>
          <Field label="Roli">
            <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
              <option value="SELLER">Sotuvchi</option>
              <option value="OWNER">Egasi (to'liq huquq)</option>
            </select>
          </Field>
          <button className="btn-primary w-full">Qo'shish</button>
        </form>
      </Modal>
    </Section>
  );
}

function Telegram() {
  const { me, refresh } = useApp();
  const [code, setCode] = useState<{ code: string; bot: string | null } | null>(null);
  return (
    <Section title="Telegram hisobot" icon={<Send size={18} />}>
      {me?.telegramLinked ? (
        <p className="text-sm">✅ Telegram ulangan. Har kuni soat 9:00 da hisobot keladi. Botga /hisobot yozib istalgan vaqtda ko'rishingiz mumkin.</p>
      ) : code ? (
        <div className="space-y-2 text-sm">
          <p>Telegram botga quyidagi buyruqni yuboring:</p>
          <code className="block rounded-xl bg-slate-100 p-3 font-mono dark:bg-slate-800">/start {code.code}</code>
          {code.bot && (
            <a className="btn-primary" href={`https://t.me/${code.bot}?start=${code.code}`} target="_blank" rel="noreferrer">
              Botni ochish
            </a>
          )}
          <button className="btn-ghost ml-2" onClick={refresh}>
            Tekshirish
          </button>
        </div>
      ) : (
        <div className="text-sm">
          <p className="mb-3 text-slate-500">Har kuni ertalab jami qarz, bugun muddati kelganlar va muddati o'tganlar ro'yxatini Telegramga oling.</p>
          <button className="btn-primary" onClick={() => api("/auth/telegram-code", { method: "POST" }).then(setCode)}>
            Telegramni ulash
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
    <Section title="Profil" icon={<Moon size={18} />}>
      <div className="text-sm">
        <b>{me?.name}</b> · {phone(me?.phone)}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <input className="input" type="password" placeholder="Eski parol" value={f.oldPassword} onChange={(e) => setF({ ...f, oldPassword: e.target.value })} />
        <input className="input" type="password" placeholder="Yangi parol" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} />
        <button
          className="btn-ghost"
          onClick={() =>
            api("/auth/me", { method: "PUT", body: f })
              .then(() => (toast("Parol o'zgartirildi"), setF({ oldPassword: "", newPassword: "" })))
              .catch((e) => toast(e.message, "err"))
          }
        >
          Parolni o'zgartirish
        </button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">Mavzu:</span>
        {(["light", "dark", "system"] as Theme[]).map((t) => (
          <button
            key={t}
            className={`chip ${theme === t ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 dark:border-slate-700"}`}
            onClick={() => {
              applyTheme(t);
              setTheme(t);
            }}
          >
            {{ light: "Yorug'", dark: "Qorong'i", system: "Avtomatik" }[t]}
          </button>
        ))}
      </div>
      {isNative() && (
        <button className="btn-ghost mt-4 mr-2" onClick={() => setChangingPin(true)}>
          PIN kodni o'zgartirish
        </button>
      )}
      {changingPin && <PinSetup onDone={() => (setChangingPin(false), toast("PIN kod o'zgartirildi"))} />}
      <button className="btn-ghost mt-4 text-rose-600" onClick={logout}>
        <LogOut size={16} /> Chiqish
      </button>
    </Section>
  );
}

function ActivityLog() {
  const { shop, isOwner } = useApp();
  const [items, setItems] = useState<any[] | null>(null);
  if (!isOwner) return null;
  return (
    <Section title="Faoliyat jurnali" icon={<Activity size={18} />}>
      {!items ? (
        <button className="btn-ghost" onClick={() => api(`/shops/${shop!.id}/activity`).then(setItems)}>
          Ko'rsatish
        </button>
      ) : (
        <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto text-sm dark:divide-slate-800">
          {items.map((a) => (
            <div key={a.id} className="py-2">
              <b>{a.action}</b> {a.details && <span className="text-slate-500">— {a.details}</span>}
              <div className="text-xs text-slate-500">
                {dateTime(a.createdAt)} · {a.user?.name || "tizim"}
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
      <h1 className="text-2xl font-bold">Sozlamalar</h1>
      <Link to="/shops" className="card flex items-center gap-3 p-4 lg:hidden">
        <Store className="text-brand-600" size={20} /> <span className="font-medium">Do'konlarim va yangi do'kon qo'shish</span>
      </Link>
      <GatewayCard />
      <ShopSettings />
      <Staff />
      <Telegram />
      <Profile />
      <ActivityLog />
    </div>
  );
}

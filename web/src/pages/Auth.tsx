import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Server } from "lucide-react";
import { api, getApiBase, setApiBase } from "../lib/api";
import { toast, useApp } from "../lib/store";
import { isNative } from "../lib/native";
import { Field, Spinner } from "../components/ui";

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const [srv, setSrv] = useState(getApiBase());
  const [showSrv, setShowSrv] = useState(false);
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 rounded-2xl bg-brand-600 p-3 text-white shadow-lg shadow-brand-600/30">
            <BookOpen size={28} />
          </div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="card p-6">{children}</div>
        {isNative() && (
          <div className="mt-4 text-center">
            <button onClick={() => setShowSrv(!showSrv)} className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Server size={14} /> Server manzili
            </button>
            {showSrv && (
              <div className="mt-2 flex gap-2">
                <input className="input" placeholder="https://qarz.example.uz" value={srv} onChange={(e) => setSrv(e.target.value)} />
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setApiBase(srv.trim());
                    toast("Saqlandi");
                  }}
                >
                  OK
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function LoginPage() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { token } = await api("/auth/login", { body: { phone, password } });
      await login(token);
      navigate("/");
    } catch (err: any) {
      toast(err.message, "err");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell title="Qarz daftari" subtitle="Do'koningiz qarzlarini oson boshqaring">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Telefon raqam">
          <input className="input" inputMode="tel" placeholder="+998 90 123 45 67" value={phone} onChange={(e) => setPhone(e.target.value)} required autoFocus />
        </Field>
        <Field label="Parol">
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <button className="btn-primary w-full py-3" disabled={busy}>
          {busy ? <Spinner /> : "Kirish"}
        </button>
        <p className="text-center text-sm text-slate-500">
          Hisobingiz yo'qmi?{" "}
          <Link to="/register" className="font-semibold text-brand-600">
            Ro'yxatdan o'tish
          </Link>
        </p>
      </form>
    </Shell>
  );
}

export function RegisterPage() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: "", phone: "", password: "", shopName: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { token } = await api("/auth/register", { body: f });
      await login(token);
      navigate("/");
    } catch (err: any) {
      toast(err.message, "err");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell title="Ro'yxatdan o'tish" subtitle="Bir daqiqada do'koningizni qo'shing">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Ismingiz">
          <input className="input" value={f.name} onChange={set("name")} required autoFocus />
        </Field>
        <Field label="Telefon raqam">
          <input className="input" inputMode="tel" placeholder="+998 90 123 45 67" value={f.phone} onChange={set("phone")} required />
        </Field>
        <Field label="Parol" hint="Kamida 6 ta belgi">
          <input className="input" type="password" value={f.password} onChange={set("password")} required minLength={6} />
        </Field>
        <Field label="Do'kon nomi">
          <input className="input" placeholder="Masalan: Baraka market" value={f.shopName} onChange={set("shopName")} required />
        </Field>
        <button className="btn-primary w-full py-3" disabled={busy}>
          {busy ? <Spinner /> : "Ro'yxatdan o'tish"}
        </button>
        <p className="text-center text-sm text-slate-500">
          Hisobingiz bormi?{" "}
          <Link to="/login" className="font-semibold text-brand-600">
            Kirish
          </Link>
        </p>
      </form>
    </Shell>
  );
}

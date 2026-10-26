import { useEffect, useState } from "react";
import { BookOpen, Delete } from "lucide-react";
import { checkPin, savePin } from "../lib/pin";
import { useApp } from "../lib/store";

const MAX_TRIES = 5;

function Pad({ title, subtitle, error, value, onDigit, onBack, footer }: { title: string; subtitle?: string; error?: string; value: string; onDigit: (d: string) => void; onBack: () => void; footer?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-between bg-gradient-to-b from-brand-600 to-emerald-800 px-6 py-10 text-white" style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))" }}>
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 rounded-2xl bg-white/15 p-3">
          <BookOpen size={28} />
        </div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-white/80">{subtitle}</p>}
        <div className={`mt-8 flex gap-4 ${error ? "animate-[shake_.3s]" : ""}`}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-4 w-4 rounded-full border-2 border-white ${i < value.length ? "bg-white" : ""}`} />
          ))}
        </div>
        <p className="mt-4 h-5 text-sm font-medium text-rose-200">{error}</p>
      </div>
      <div className="grid w-full max-w-xs grid-cols-3 gap-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0"].map((d, i) =>
          d ? (
            <button key={i} onClick={() => onDigit(d)} className="h-16 rounded-full bg-white/10 text-2xl font-semibold transition active:bg-white/30">
              {d}
            </button>
          ) : (
            <span key={i} />
          )
        )}
        <button onClick={onBack} className="flex h-16 items-center justify-center rounded-full transition active:bg-white/20" aria-label="O'chirish">
          <Delete size={26} />
        </button>
      </div>
      <div className="h-6 text-sm">{footer}</div>
    </div>
  );
}

// First time after password login: choose a PIN and confirm it.
export function PinSetup({ onDone }: { onDone: () => void }) {
  const [first, setFirst] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (value.length < 4) return;
    if (!first) {
      setFirst(value);
      setValue("");
      setError("");
    } else if (first === value) {
      savePin(value).then(onDone);
    } else {
      setError("PIN kodlar mos kelmadi, qaytadan");
      setFirst("");
      setValue("");
    }
  }, [value, first, onDone]);
  return (
    <Pad
      title={first ? "PIN kodni takrorlang" : "4 xonali PIN kod o'rnating"}
      subtitle="Keyingi safar ilovaga shu kod bilan kirasiz"
      error={error}
      value={value}
      onDigit={(d) => setValue((v) => (v + d).slice(0, 4))}
      onBack={() => setValue((v) => v.slice(0, -1))}
    />
  );
}

export function PinLock({ onUnlock }: { onUnlock: () => void }) {
  const { me, logout } = useApp();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (value.length < 4) return;
    checkPin(value).then((ok) => {
      if (ok) return onUnlock();
      const n = tries + 1;
      if (n >= MAX_TRIES) return logout();
      setTries(n);
      setError(`Noto'g'ri PIN. ${MAX_TRIES - n} ta urinish qoldi`);
      setValue("");
    });
  }, [value, tries, onUnlock, logout]);
  return (
    <Pad
      title={`Salom, ${me?.name || ""}`}
      subtitle="PIN kodni kiriting"
      error={error}
      value={value}
      onDigit={(d) => setValue((v) => (v + d).slice(0, 4))}
      onBack={() => setValue((v) => v.slice(0, -1))}
      footer={
        <button className="text-white/80 underline" onClick={() => confirm("Login va parol bilan qaytadan kirasiz. Davom etamizmi?") && logout()}>
          PIN kodni unutdim
        </button>
      }
    />
  );
}

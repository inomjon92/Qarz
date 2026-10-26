export function money(v: number, currency = "UZS") {
  const s = Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return currency === "UZS" ? `${s} so'm` : currency === "USD" ? `$${s}` : `${s} ${currency}`;
}

export function date(d?: string | Date | null) {
  if (!d) return "—";
  const x = new Date(d);
  return `${String(x.getDate()).padStart(2, "0")}.${String(x.getMonth() + 1).padStart(2, "0")}.${x.getFullYear()}`;
}

export function dateTime(d: string | Date) {
  const x = new Date(d);
  return `${date(x)} ${String(x.getHours()).padStart(2, "0")}:${String(x.getMinutes()).padStart(2, "0")}`;
}

export function toInputDate(d?: string | Date | null) {
  if (!d) return "";
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

export function addDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toInputDate(d);
}

export function parseAmount(s: string) {
  return Number(s.replace(/[^\d.]/g, "")) || 0;
}

export function groupDigits(s: string) {
  const digits = s.replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function phone(p?: string | null) {
  if (!p) return "";
  const m = p.match(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : p;
}

// Days until due date (negative = overdue).
export function daysLeft(d?: string | null) {
  if (!d) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return Math.round((x.getTime() - t.getTime()) / 86400000);
}

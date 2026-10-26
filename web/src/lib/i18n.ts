import ru from "./ru";

export type Lang = "uz" | "ru";

function readLang(): Lang {
  try {
    return localStorage.getItem("qd_lang") === "ru" ? "ru" : "uz";
  } catch {
    return "uz";
  }
}

export const lang: Lang = readLang();

// Uzbek text is the key; Russian comes from the dictionary, falling back to Uzbek.
export function t(s: string, vars?: Record<string, string | number>) {
  let r = lang === "ru" ? ru[s] ?? s : s;
  if (vars) r = r.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return r;
}

export function setLang(l: Lang) {
  localStorage.setItem("qd_lang", l);
  location.reload();
}

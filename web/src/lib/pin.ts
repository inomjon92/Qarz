// Device-local 4-digit PIN that guards the app after the first password login.
const KEY = "qd_pin";
const LOCK_AFTER_MS = 30000;

async function hash(pin: string) {
  const salt = localStorage.getItem("qd_token")?.slice(-16) || "";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`qarz:${salt}:${pin}`));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const hasPin = () => !!localStorage.getItem(KEY);
export const clearPin = () => localStorage.removeItem(KEY);
export const savePin = async (pin: string) => localStorage.setItem(KEY, await hash(pin));
export const checkPin = async (pin: string) => localStorage.getItem(KEY) === (await hash(pin));

// Locks again when the app comes back after being in the background for a while.
export function watchBackground(onLock: () => void) {
  let hiddenAt = 0;
  const h = () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt > LOCK_AFTER_MS) onLock();
  };
  document.addEventListener("visibilitychange", h);
  return () => document.removeEventListener("visibilitychange", h);
}

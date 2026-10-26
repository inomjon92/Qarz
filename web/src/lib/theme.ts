export type Theme = "light" | "dark" | "system";

export function getTheme(): Theme {
  return (localStorage.getItem("qd_theme") as Theme) || "system";
}

export function applyTheme(t: Theme = getTheme()) {
  localStorage.setItem("qd_theme", t);
  const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

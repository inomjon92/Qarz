import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";

export const asyncH =
  (fn: (req: any, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.issues[0]?.message || "Noto'g'ri ma'lumot" });
  }
  console.error(err);
  res.status(500).json({ error: "Serverda xatolik" });
}

export const num = (d: Prisma.Decimal | number | null | undefined) => (d == null ? 0 : Number(d));

export function normalizePhone(p?: string | null) {
  if (!p) return null;
  let d = p.replace(/\D/g, "");
  if (d.length === 9) d = "998" + d;
  return d ? "+" + d : null;
}

export async function logActivity(shopId: string, userId: string | undefined, action: string, details?: string) {
  await prisma.activity.create({ data: { shopId, userId, action, details } });
}

// Recomputes a debtor's balance from its live transactions; clears the due date once paid off.
export async function recalcDebtor(debtorId: string) {
  const rows = await prisma.transaction.groupBy({
    by: ["type"],
    where: { debtorId, deletedAt: null },
    _sum: { amount: true },
  });
  const debt = num(rows.find((r) => r.type === "DEBT")?._sum.amount);
  const paid = num(rows.find((r) => r.type === "PAYMENT")?._sum.amount);
  const balance = debt - paid;
  const data: Prisma.DebtorUpdateInput = { balance };
  if (balance <= 0) data.dueDate = null;
  return prisma.debtor.update({ where: { id: debtorId }, data });
}

export function formatMoney(v: number, currency = "UZS") {
  const s = Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return currency === "UZS" ? `${s} so'm` : `${s} ${currency}`;
}

// Uzbekistan is UTC+5 with no DST; all "day" logic uses Tashkent time regardless of server TZ.
const TZ_OFFSET = 5 * 3600000;
const DAY = 86400000;

// Shifts a timestamp so its UTC fields read as Tashkent wall-clock time.
export const tashkent = (d: Date | number = Date.now()) => new Date(new Date(d).getTime() + TZ_OFFSET);

export function startOfToday() {
  return new Date(Math.floor((Date.now() + TZ_OFFSET) / DAY) * DAY - TZ_OFFSET);
}

export function startOfMonth() {
  const t = tashkent();
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1) - TZ_OFFSET);
}

export const dayKey = (d: Date) => tashkent(d).toISOString().slice(0, 10);

export function formatDate(d: Date | null | undefined) {
  if (!d) return "-";
  const x = tashkent(d);
  return `${String(x.getUTCDate()).padStart(2, "0")}.${String(x.getUTCMonth() + 1).padStart(2, "0")}.${x.getUTCFullYear()}`;
}

export function formatDateTime(d: Date) {
  const x = tashkent(d);
  return `${formatDate(d)} ${String(x.getUTCHours()).padStart(2, "0")}:${String(x.getUTCMinutes()).padStart(2, "0")}`;
}

export function renderTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

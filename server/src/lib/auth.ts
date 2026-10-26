import type { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { prisma } from "./db";

// Without an explicit JWT_SECRET (e.g. one-click Vercel deploy) derive one from the
// database URL, which is already a secret only the server knows.
const SECRET =
  process.env.JWT_SECRET ||
  (process.env.DATABASE_URL ? crypto.createHash("sha256").update(`jwt:${process.env.DATABASE_URL}`).digest("hex") : "dev-secret-change-me");

export interface AuthedRequest extends Request {
  userId?: string;
  shopId?: string;
  role?: Role;
}

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: "90d" });
}

// Short-lived token that only works for one GET path, so the Android app can open
// a file download in the phone's browser without exposing the login token.
export function signDownloadToken(userId: string, path: string) {
  return jwt.sign({ sub: userId, dl: path }, SECRET, { expiresIn: "5m" });
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const dl = typeof req.query.dl === "string" ? req.query.dl : null;
  if (!token && !dl) return res.status(401).json({ error: "Tizimga kiring" });
  try {
    if (!token) {
      const p = jwt.verify(dl!, SECRET) as { sub: string; dl?: string };
      if (req.method !== "GET" || p.dl !== req.originalUrl.split("?")[0]) throw new Error("bad download token");
      req.userId = p.sub;
      return next();
    }
    const payload = jwt.verify(token, SECRET) as { sub: string; dl?: string };
    if (payload.dl) throw new Error("download token used as login");
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: "Sessiya tugagan, qayta kiring" });
  }
}

// Checks the user belongs to :shopId and optionally has one of the given roles.
export function requireShop(...roles: Role[]) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const shopId = req.params.shopId;
    const m = await prisma.membership.findUnique({
      where: { userId_shopId: { userId: req.userId!, shopId } },
    });
    if (!m) return res.status(404).json({ error: "Do'kon topilmadi" });
    if (roles.length && !roles.includes(m.role)) {
      return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q" });
    }
    req.shopId = shopId;
    req.role = m.role;
    next();
  };
}

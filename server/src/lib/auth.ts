import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { prisma } from "./db";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export interface AuthedRequest extends Request {
  userId?: string;
  shopId?: string;
  role?: Role;
}

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: "90d" });
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Tizimga kiring" });
  try {
    const payload = jwt.verify(token, SECRET) as { sub: string };
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

import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../lib/db";
import { requireAuth, signDownloadToken, signToken, type AuthedRequest } from "../lib/auth";
import { asyncH, normalizePhone } from "../lib/util";
import { setWebhook, telegramEnabled } from "../jobs/telegram";

export const authRouter = Router();

const phoneSchema = z.string().min(9, "Telefon raqam noto'g'ri");
const passSchema = z.string().min(6, "Parol kamida 6 belgidan iborat bo'lsin");

authRouter.post(
  "/register",
  asyncH(async (req, res) => {
    const body = z
      .object({ name: z.string().min(2, "Ismingizni kiriting"), phone: phoneSchema, password: passSchema, shopName: z.string().min(2, "Do'kon nomini kiriting") })
      .parse(req.body);
    const phone = normalizePhone(body.phone)!;
    if (await prisma.user.findUnique({ where: { phone } })) {
      return res.status(409).json({ error: "Bu raqam bilan ro'yxatdan o'tilgan" });
    }
    const user = await prisma.user.create({
      data: {
        name: body.name,
        phone,
        passwordHash: await bcrypt.hash(body.password, 10),
        memberships: { create: { role: "OWNER", shop: { create: { name: body.shopName } } } },
      },
    });
    res.json({ token: signToken(user.id) });
  })
);

authRouter.post(
  "/login",
  asyncH(async (req, res) => {
    const body = z.object({ phone: phoneSchema, password: z.string().min(1) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { phone: normalizePhone(body.phone)! } });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return res.status(401).json({ error: "Telefon yoki parol noto'g'ri" });
    }
    res.json({ token: signToken(user.id) });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncH(async (req: AuthedRequest, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { memberships: { include: { shop: true }, orderBy: { createdAt: "asc" } } },
    });
    if (!user) return res.status(401).json({ error: "Foydalanuvchi topilmadi" });
    res.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      telegramLinked: !!user.telegramChatId,
      shops: user.memberships.map((m) => ({ ...m.shop, role: m.role })),
    });
  })
);

authRouter.put(
  "/me",
  requireAuth,
  asyncH(async (req: AuthedRequest, res) => {
    const body = z.object({ name: z.string().min(2).optional(), oldPassword: z.string().optional(), newPassword: passSchema.optional() }).parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
    const data: { name?: string; passwordHash?: string } = {};
    if (body.name) data.name = body.name;
    if (body.newPassword) {
      if (!body.oldPassword || !(await bcrypt.compare(body.oldPassword, user.passwordHash))) {
        return res.status(400).json({ error: "Eski parol noto'g'ri" });
      }
      data.passwordHash = await bcrypt.hash(body.newPassword, 10);
    }
    await prisma.user.update({ where: { id: user.id }, data });
    res.json({ ok: true });
  })
);

authRouter.post(
  "/download-token",
  requireAuth,
  asyncH(async (req: AuthedRequest, res) => {
    const { path } = z.object({ path: z.string().startsWith("/api/") }).parse(req.body);
    res.json({ token: signDownloadToken(req.userId!, path) });
  })
);

// Returns a one-time code the user sends to the Telegram bot as "/start CODE".
authRouter.post(
  "/telegram-code",
  requireAuth,
  asyncH(async (req: AuthedRequest, res) => {
    const code = crypto.randomBytes(4).toString("hex");
    await prisma.user.update({ where: { id: req.userId }, data: { telegramCode: code } });
    // Serverless hosts have no polling loop; make sure Telegram knows where to deliver updates.
    if (process.env.VERCEL && telegramEnabled()) await setWebhook(`https://${req.get("host")}`).catch(console.error);
    res.json({ code, bot: process.env.TELEGRAM_BOT_USERNAME || null });
  })
);

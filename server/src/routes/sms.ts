import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import type { AuthedRequest } from "../lib/auth";
import { asyncH } from "../lib/util";

// SMS gateway API used by the Android app: it pulls queued messages and reports results.
export const smsRouter = Router();

smsRouter.get(
  "/pending",
  asyncH(async (req: AuthedRequest, res) => {
    const owned = await prisma.membership.findMany({ where: { userId: req.userId, role: "OWNER", shop: { smsEnabled: true } }, select: { shopId: true } });
    const shopIds = owned.map((m) => m.shopId);
    // Messages stuck in SENDING (phone died mid-batch) go back into the queue.
    await prisma.smsMessage.updateMany({
      where: { shopId: { in: shopIds }, status: "SENDING", createdAt: { lt: new Date(Date.now() - 30 * 60000) } },
      data: { status: "PENDING" },
    });
    const items = await prisma.smsMessage.findMany({
      where: { shopId: { in: shopIds }, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: { id: true, phone: true, text: true },
    });
    if (items.length) await prisma.smsMessage.updateMany({ where: { id: { in: items.map((i) => i.id) } }, data: { status: "SENDING" } });
    res.json(items);
  })
);

smsRouter.post(
  "/:id/result",
  asyncH(async (req: AuthedRequest, res) => {
    const body = z.object({ ok: z.boolean(), error: z.string().nullish() }).parse(req.body);
    const sms = await prisma.smsMessage.findUnique({ where: { id: req.params.id } });
    if (!sms) return res.status(404).json({ error: "Topilmadi" });
    const m = await prisma.membership.findUnique({ where: { userId_shopId: { userId: req.userId!, shopId: sms.shopId } } });
    if (!m) return res.status(404).json({ error: "Topilmadi" });
    await prisma.smsMessage.update({
      where: { id: sms.id },
      data: body.ok ? { status: "SENT", sentAt: new Date(), error: null } : { status: "FAILED", error: body.error || "Xatolik" },
    });
    res.json({ ok: true });
  })
);

smsRouter.post(
  "/:id/retry",
  asyncH(async (req: AuthedRequest, res) => {
    const sms = await prisma.smsMessage.findUnique({ where: { id: req.params.id } });
    const m = sms && (await prisma.membership.findUnique({ where: { userId_shopId: { userId: req.userId!, shopId: sms.shopId } } }));
    if (!sms || !m) return res.status(404).json({ error: "Topilmadi" });
    await prisma.smsMessage.update({ where: { id: sms.id }, data: { status: "PENDING", error: null } });
    res.json({ ok: true });
  })
);

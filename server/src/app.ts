import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import fs from "fs";
import rateLimit from "express-rate-limit";
import { requireAuth, requireShop } from "./lib/auth";
import { errorHandler } from "./lib/util";
import { authRouter } from "./routes/auth";
import { shopsRouter } from "./routes/shops";
import { debtorsRouter } from "./routes/debtors";
import { reportsRouter } from "./routes/reports";
import { smsRouter } from "./routes/sms";
import { publicRouter } from "./routes/public";
import { nudgeDailyJobs, runDailyJobsIfDue } from "./jobs/lazy";
import { queueDueReminders } from "./jobs/reminders";
import { handleUpdate, sendDailyReports, setWebhook, telegramEnabled, webhookSecret } from "./jobs/telegram";

export function createApp({ serveWeb = true, nudge = false } = {}) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  if (nudge) app.use("/api", (_req, _res, next) => (nudgeDailyJobs(), next()));

  app.get("/api/health", async (_req, res) => {
    await runDailyJobsIfDue();
    res.json({ ok: true, time: new Date() });
  });

  // Daily job entry point for platform schedulers (Vercel Cron). Jobs are idempotent.
  app.get("/api/cron/daily", async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers.authorization !== `Bearer ${secret}`) return res.status(401).end();
    const queued = await queueDueReminders();
    await sendDailyReports();
    res.json({ ok: true, queued });
  });

  app.post("/api/telegram/webhook/:secret", async (req, res) => {
    if (!telegramEnabled() || req.params.secret !== webhookSecret()) return res.status(404).end();
    await handleUpdate(req.body).catch(console.error);
    res.json({ ok: true });
  });
  app.post("/api/telegram/setup", requireAuth, async (req, res) => {
    if (!telegramEnabled()) return res.status(400).json({ error: "TELEGRAM_BOT_TOKEN kiritilmagan" });
    res.json(await setWebhook(`${req.protocol}://${req.get("host")}`));
  });

  app.use("/api/auth", rateLimit({ windowMs: 15 * 60000, limit: 50 }), authRouter);
  app.use("/api/public", publicRouter);
  app.use("/api/shops", requireAuth, shopsRouter);
  app.use("/api/shops/:shopId/debtors", requireAuth, requireShop(), debtorsRouter);
  app.use("/api/shops/:shopId/reports", requireAuth, requireShop(), reportsRouter);
  app.use("/api/sms", requireAuth, smsRouter);
  app.use("/api", (_req, res) => res.status(404).json({ error: "Topilmadi" }));
  app.use(errorHandler);

  // Serve the built web app from the same server (Docker / Render).
  const webDir = path.resolve(process.env.WEB_DIR || path.join(__dirname, "../../web/dist"));
  if (serveWeb && fs.existsSync(webDir)) {
    app.use(express.static(webDir, { index: false }));
    app.get("*", (_req, res) => res.sendFile(path.join(webDir, "index.html")));
  }
  return app;
}

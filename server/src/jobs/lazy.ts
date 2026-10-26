import { queueDueReminders } from "./reminders";
import { sendDailyReports } from "./telegram";

// Free hosting tiers put the server to sleep, so cron may miss 9:00. Every incoming
// request (the Android app polls every 15 min) also nudges the daily jobs; both are
// idempotent (lastSmsAt / lastReportAt), so running them repeatedly is safe.
let lastRun = 0;

function tashkentHour() {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Tashkent" }).format(new Date()));
}

export function nudgeDailyJobs() {
  if (Date.now() - lastRun < 10 * 60000) return;
  lastRun = Date.now();
  const h = tashkentHour();
  if (h < 9 || h >= 21) return;
  setImmediate(() => {
    queueDueReminders().catch(console.error);
    sendDailyReports().catch(console.error);
  });
}

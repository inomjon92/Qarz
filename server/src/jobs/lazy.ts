import { queueDueReminders } from "./reminders";
import { sendDailyReports } from "./telegram";

// Free hosting may sleep (Render) or have no long-running process at all (Vercel), so
// cron can miss 9:00. Requests from the Android app (every 15 min) also run the daily
// jobs; both are idempotent (lastSmsAt / lastReportAt), so repeating them is safe.
let lastRun = 0;

function tashkentHour() {
  return (new Date().getUTCHours() + 5) % 24;
}

export async function runDailyJobsIfDue() {
  if (Date.now() - lastRun < 10 * 60000) return;
  lastRun = Date.now();
  const h = tashkentHour();
  if (h < 9 || h >= 21) return;
  await Promise.all([queueDueReminders(), sendDailyReports()]).catch(console.error);
}

export function nudgeDailyJobs() {
  setImmediate(() => runDailyJobsIfDue());
}

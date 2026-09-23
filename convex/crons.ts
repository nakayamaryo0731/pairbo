import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 5:07 JST に当日実行分の定期支出を生成（毎時0分はインフラ混雑のためずらす）
crons.daily(
  "generate recurring expenses",
  { hourUTC: 20, minuteUTC: 7 },
  internal.recurringExpenses.generateDue,
  {},
);

export default crons;

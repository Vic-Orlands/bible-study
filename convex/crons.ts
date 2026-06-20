import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

crons.cron("daily study reminder", "0 8 * * *", api.push.sendDaily, { body: "Set aside a few moments for today’s reading plan.", title: "Time to study", type: "dailyReminder", url: "/reading-plan" });
crons.cron("verse of the day", "0 9 * * *", api.push.sendDaily, { body: "Open Bible Study for today’s verse and reflection.", title: "Verse of the day", type: "verseOfDay", url: "/study" });

export default crons;

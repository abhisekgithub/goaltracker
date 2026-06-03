import { RoutineTracker } from "@/components/RoutineTracker";

export const metadata = {
  title: "Daily Routine — Tracker",
  description: "Plan your day in time blocks and see your current activity.",
};

export default function RoutinePage() {
  return <RoutineTracker />;
}

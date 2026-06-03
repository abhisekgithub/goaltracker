import type { RoutineBlock } from "./types";

export function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (hours < 0 || hours > 23 || mins < 0 || mins > 59) return null;
  return hours * 60 + mins;
}

export function minutesToTimeInput(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatRoutineTime(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatRoutineRange(block: RoutineBlock): string {
  return `${formatRoutineTime(block.startMinutes)} – ${formatRoutineTime(block.endMinutes)}`;
}

export function sortRoutineBlocks(blocks: RoutineBlock[]): RoutineBlock[] {
  return [...blocks].sort((a, b) => a.startMinutes - b.startMinutes);
}

export type RoutineNowStatus =
  | { kind: "current"; block: RoutineBlock }
  | { kind: "upcoming"; block: RoutineBlock }
  | { kind: "ended" }
  | { kind: "empty" };

export function getRoutineNow(
  blocks: RoutineBlock[],
  now = new Date(),
): RoutineNowStatus {
  if (blocks.length === 0) return { kind: "empty" };

  const sorted = sortRoutineBlocks(blocks);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const current = sorted.find(
    (b) => nowMinutes >= b.startMinutes && nowMinutes < b.endMinutes,
  );
  if (current) return { kind: "current", block: current };

  const upcoming = sorted.find((b) => b.startMinutes > nowMinutes);
  if (upcoming) return { kind: "upcoming", block: upcoming };

  return { kind: "ended" };
}

export function routineNowMessage(status: RoutineNowStatus): {
  label: string;
  detail: string;
} {
  switch (status.kind) {
    case "current":
      return {
        label: "Right now",
        detail: status.block.title,
      };
    case "upcoming":
      return {
        label: "Up next",
        detail: `${status.block.title} at ${formatRoutineTime(status.block.startMinutes)}`,
      };
    case "ended":
      return {
        label: "Routine",
        detail: "All blocks finished for today",
      };
    case "empty":
      return {
        label: "Routine",
        detail: "Set up your daily schedule",
      };
  }
}

export function validateRoutineBlock(
  title: string,
  startMinutes: number,
  endMinutes: number,
): string | null {
  if (!title.trim()) return "Enter an activity name.";
  if (endMinutes <= startMinutes) return "End time must be after start time.";
  return null;
}

import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
} from "date-fns";

export function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseMonthKey(key: string) {
  const [y, m] = key.split("-").map(Number);
  return { year: y, month: m };
}

export function previousMonth(year: number, month: number) {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

export function daysInMonth(year: number, month: number) {
  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(start);
  return eachDayOfInterval({ start, end });
}

export function formatDate(d: Date | string) {
  const date = typeof d === "string" ? parseISO(d) : d;
  return format(date, "yyyy-MM-dd");
}

export function formatDisplayDate(d: string) {
  return format(parseISO(d), "MMM d, yyyy");
}

export function isDateInRange(date: string, start: string, end: string) {
  const d = parseISO(date);
  return isWithinInterval(d, {
    start: parseISO(start),
    end: parseISO(end),
  });
}

export function daysBetweenInclusive(start: string, end: string) {
  return daysInRange(start, end).length;
}

export function daysInRange(start: string, end: string) {
  return eachDayOfInterval({
    start: parseISO(start),
    end: parseISO(end),
  });
}

export function shortDayLabel(date: string) {
  return format(parseISO(date), "MMM d");
}

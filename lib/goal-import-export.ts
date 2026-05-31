import type { ActionCompletion, Goal, GoalActionItem } from "./types";

export const GOAL_EXPORT_VERSION = 1;

export type GoalExportPayload = {
  version: typeof GOAL_EXPORT_VERSION;
  exportedAt: string;
  goals: Goal[];
  actionCompletions: ActionCompletion[];
};

export type GoalImportMode = "merge" | "replace";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isDateString(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function parseActionItem(v: unknown): GoalActionItem | null {
  if (!isRecord(v) || !isNonEmptyString(v.id) || !isNonEmptyString(v.title)) {
    return null;
  }
  return { id: v.id.trim(), title: v.title.trim() };
}

function parseGoal(v: unknown): Goal | null {
  if (!isRecord(v) || !isNonEmptyString(v.id) || !isNonEmptyString(v.title)) {
    return null;
  }
  if (!isDateString(v.startDate) || !isDateString(v.endDate)) return null;
  if (!Array.isArray(v.actionItems)) return null;

  const actionItems: GoalActionItem[] = [];
  for (const item of v.actionItems) {
    const parsed = parseActionItem(item);
    if (!parsed) return null;
    actionItems.push(parsed);
  }

  return {
    id: v.id.trim(),
    title: v.title.trim(),
    startDate: v.startDate,
    endDate: v.endDate,
    actionItems,
  };
}

function parseCompletion(v: unknown): ActionCompletion | null {
  if (
    !isRecord(v) ||
    !isNonEmptyString(v.goalId) ||
    !isNonEmptyString(v.actionItemId) ||
    !isDateString(v.date)
  ) {
    return null;
  }
  return {
    goalId: v.goalId.trim(),
    actionItemId: v.actionItemId.trim(),
    date: v.date,
  };
}

export function buildGoalExportPayload(
  goals: Goal[],
  actionCompletions: ActionCompletion[],
  goalIds?: string[],
): GoalExportPayload {
  const idSet = goalIds ? new Set(goalIds) : null;
  const exportedGoals = idSet
    ? goals.filter((g) => idSet.has(g.id))
    : [...goals];

  const exportedGoalIds = new Set(exportedGoals.map((g) => g.id));
  const actionIdsByGoal = new Map<string, Set<string>>();
  for (const goal of exportedGoals) {
    actionIdsByGoal.set(
      goal.id,
      new Set(goal.actionItems.map((a) => a.id)),
    );
  }

  const exportedCompletions = actionCompletions.filter((c) => {
    if (!exportedGoalIds.has(c.goalId)) return false;
    const actionIds = actionIdsByGoal.get(c.goalId);
    return actionIds?.has(c.actionItemId) ?? false;
  });

  return {
    version: GOAL_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    goals: exportedGoals,
    actionCompletions: exportedCompletions,
  };
}

export function parseGoalExportJson(text: string):
  | { ok: true; payload: GoalExportPayload }
  | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "Invalid JSON file." };
  }

  if (!isRecord(raw)) {
    return { ok: false, error: "Export file must be a JSON object." };
  }

  if (raw.version !== GOAL_EXPORT_VERSION) {
    return {
      ok: false,
      error: `Unsupported export version (expected ${GOAL_EXPORT_VERSION}).`,
    };
  }

  if (!Array.isArray(raw.goals)) {
    return { ok: false, error: "Missing or invalid goals array." };
  }

  const goals: Goal[] = [];
  for (const item of raw.goals) {
    const goal = parseGoal(item);
    if (!goal) {
      return { ok: false, error: "Invalid goal entry in file." };
    }
    goals.push(goal);
  }

  const actionCompletions: ActionCompletion[] = [];
  if (raw.actionCompletions !== undefined) {
    if (!Array.isArray(raw.actionCompletions)) {
      return { ok: false, error: "Invalid actionCompletions array." };
    }
    for (const item of raw.actionCompletions) {
      const completion = parseCompletion(item);
      if (!completion) {
        return { ok: false, error: "Invalid completion entry in file." };
      }
      actionCompletions.push(completion);
    }
  }

  return {
    ok: true,
    payload: {
      version: GOAL_EXPORT_VERSION,
      exportedAt:
        typeof raw.exportedAt === "string"
          ? raw.exportedAt
          : new Date().toISOString(),
      goals,
      actionCompletions,
    },
  };
}

function completionKey(c: ActionCompletion) {
  return `${c.goalId}:${c.actionItemId}:${c.date}`;
}

function remapGoalsWithCompletions(
  goals: Goal[],
  completions: ActionCompletion[],
  createId: () => string,
): { goals: Goal[]; actionCompletions: ActionCompletion[] } {
  const goalIdMap = new Map<string, string>();
  const actionIdMap = new Map<string, string>();

  const remappedGoals = goals.map((goal) => {
    const newGoalId = createId();
    goalIdMap.set(goal.id, newGoalId);
    const actionItems = goal.actionItems.map((item) => {
      const newActionId = createId();
      actionIdMap.set(item.id, newActionId);
      return { ...item, id: newActionId };
    });
    return { ...goal, id: newGoalId, actionItems };
  });

  const validGoalIds = new Set(goals.map((g) => g.id));
  const validActionIds = new Set(
    goals.flatMap((g) => g.actionItems.map((a) => a.id)),
  );

  const seen = new Set<string>();
  const actionCompletions: ActionCompletion[] = [];

  for (const c of completions) {
    if (!validGoalIds.has(c.goalId) || !validActionIds.has(c.actionItemId)) {
      continue;
    }
    const goalId = goalIdMap.get(c.goalId);
    const actionItemId = actionIdMap.get(c.actionItemId);
    if (!goalId || !actionItemId) continue;

    const remapped: ActionCompletion = {
      goalId,
      actionItemId,
      date: c.date,
    };
    const key = completionKey(remapped);
    if (seen.has(key)) continue;
    seen.add(key);
    actionCompletions.push(remapped);
  }

  return { goals: remappedGoals, actionCompletions };
}

function filterValidCompletions(
  goals: Goal[],
  completions: ActionCompletion[],
): ActionCompletion[] {
  const actionIdsByGoal = new Map<string, Set<string>>();
  for (const goal of goals) {
    actionIdsByGoal.set(
      goal.id,
      new Set(goal.actionItems.map((a) => a.id)),
    );
  }

  const seen = new Set<string>();
  const result: ActionCompletion[] = [];
  for (const c of completions) {
    const actionIds = actionIdsByGoal.get(c.goalId);
    if (!actionIds?.has(c.actionItemId)) continue;
    const key = completionKey(c);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(c);
  }
  return result;
}

export function applyGoalImport(
  payload: GoalExportPayload,
  mode: GoalImportMode,
  createId: () => string,
): { goals: Goal[]; actionCompletions: ActionCompletion[] } {
  if (mode === "merge") {
    return remapGoalsWithCompletions(
      payload.goals,
      payload.actionCompletions,
      createId,
    );
  }

  return {
    goals: payload.goals,
    actionCompletions: filterValidCompletions(
      payload.goals,
      payload.actionCompletions,
    ),
  };
}

export function downloadGoalExport(
  payload: GoalExportPayload,
  filename: string,
) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function goalExportFilename(title?: string) {
  const date = new Date().toISOString().slice(0, 10);
  if (!title) return `goal-tracker-${date}.json`;
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `goal-${slug || "export"}-${date}.json`;
}

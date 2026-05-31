"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "./Card";
import { SyncStatus } from "./SyncStatus";
import { createId, useAppData } from "@/lib/storage";
import {
  daysBetweenInclusive,
  daysInRange,
  formatDate,
  formatDisplayDate,
  isDateInRange,
  shortDayLabel,
} from "@/lib/dates";
import {
  applyGoalImport,
  buildGoalExportPayload,
  downloadGoalExport,
  goalExportFilename,
  parseGoalExportJson,
  type GoalImportMode,
} from "@/lib/goal-import-export";
import type { ActionCompletion, Goal } from "@/lib/types";

function isActionCompleted(
  completions: ActionCompletion[],
  goalId: string,
  actionItemId: string,
  date: string,
) {
  return completions.some(
    (c) =>
      c.goalId === goalId &&
      c.actionItemId === actionItemId &&
      c.date === date,
  );
}

function goalCompletions(
  completions: ActionCompletion[],
  goal: Goal,
) {
  const actionIds = new Set(goal.actionItems.map((a) => a.id));
  return completions.filter(
    (c) =>
      c.goalId === goal.id &&
      actionIds.has(c.actionItemId) &&
      isDateInRange(c.date, goal.startDate, goal.endDate),
  );
}

function dailyCompletionPct(
  goal: Goal,
  completions: ActionCompletion[],
  date: string,
) {
  const total = goal.actionItems.length;
  if (total === 0) return 0;
  const completed = goal.actionItems.filter((item) =>
    isActionCompleted(completions, goal.id, item.id, date),
  ).length;
  return Math.round((completed / total) * 100);
}

export function GoalTracker() {
  const { data, update, hydrated, saving, error } = useAppData();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(formatDate(new Date()));
  const [endDate, setEndDate] = useState("");
  const [actionInput, setActionInput] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(formatDate(new Date()));
  const [importMode, setImportMode] = useState<GoalImportMode>("merge");
  const [importMessage, setImportMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedGoal =
    data.goals.find((g) => g.id === selectedGoalId) ?? data.goals[0] ?? null;

  useEffect(() => {
    if (!hydrated || data.goals.length === 0) return;
    if (selectedGoalId && data.goals.some((g) => g.id === selectedGoalId)) return;
    setSelectedGoalId(data.goals[0].id);
  }, [hydrated, data.goals, selectedGoalId]);

  function addGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !endDate) return;
    const goal: Goal = {
      id: createId(),
      title: title.trim(),
      startDate,
      endDate,
      actionItems: [],
    };
    update((prev) => ({ ...prev, goals: [...prev.goals, goal] }));
    setSelectedGoalId(goal.id);
    setTitle("");
    setEndDate("");
  }

  function addActionItem(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGoal || !actionInput.trim()) return;
    const item = { id: createId(), title: actionInput.trim() };
    update((prev) => ({
      ...prev,
      goals: prev.goals.map((g) =>
        g.id === selectedGoal.id
          ? { ...g, actionItems: [...g.actionItems, item] }
          : g,
      ),
    }));
    setActionInput("");
  }

  function removeActionItem(actionItemId: string) {
    if (!selectedGoal) return;
    update((prev) => ({
      ...prev,
      goals: prev.goals.map((g) =>
        g.id === selectedGoal.id
          ? {
              ...g,
              actionItems: g.actionItems.filter((a) => a.id !== actionItemId),
            }
          : g,
      ),
      actionCompletions: prev.actionCompletions.filter(
        (c) =>
          !(
            c.goalId === selectedGoal.id && c.actionItemId === actionItemId
          ),
      ),
    }));
  }

  function toggleCompletion(goalId: string, actionItemId: string, date: string) {
    const exists = data.actionCompletions.some(
      (c) =>
        c.goalId === goalId &&
        c.actionItemId === actionItemId &&
        c.date === date,
    );
    update((prev) => ({
      ...prev,
      actionCompletions: exists
        ? prev.actionCompletions.filter(
            (c) =>
              !(
                c.goalId === goalId &&
                c.actionItemId === actionItemId &&
                c.date === date
              ),
          )
        : [...prev.actionCompletions, { goalId, actionItemId, date }],
    }));
  }

  function deleteGoal(id: string) {
    update((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== id),
      actionCompletions: prev.actionCompletions.filter((c) => c.goalId !== id),
    }));
    if (selectedGoalId === id) setSelectedGoalId(null);
  }

  function exportGoals(goalIds?: string[]) {
    const payload = buildGoalExportPayload(
      data.goals,
      data.actionCompletions,
      goalIds,
    );
    if (payload.goals.length === 0) {
      setImportMessage({ type: "error", text: "Nothing to export." });
      return;
    }
    const filename = goalExportFilename(
      goalIds?.length === 1
        ? data.goals.find((g) => g.id === goalIds[0])?.title
        : undefined,
    );
    downloadGoalExport(payload, filename);
    setImportMessage({
      type: "success",
      text: `Exported ${payload.goals.length} goal(s) and ${payload.actionCompletions.length} completion(s).`,
    });
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      if (typeof text !== "string") {
        setImportMessage({ type: "error", text: "Could not read file." });
        return;
      }

      const parsed = parseGoalExportJson(text);
      if (!parsed.ok) {
        setImportMessage({ type: "error", text: parsed.error });
        return;
      }

      if (parsed.payload.goals.length === 0) {
        setImportMessage({ type: "error", text: "File contains no goals." });
        return;
      }

      if (importMode === "replace") {
        const confirmed = window.confirm(
          "Replace all goals and daily completion history with the imported file? This cannot be undone.",
        );
        if (!confirmed) return;
      }

      const imported = applyGoalImport(
        parsed.payload,
        importMode,
        createId,
      );

      update((prev) => {
        if (importMode === "replace") {
          return {
            ...prev,
            goals: imported.goals,
            actionCompletions: imported.actionCompletions,
          };
        }
        return {
          ...prev,
          goals: [...prev.goals, ...imported.goals],
          actionCompletions: [
            ...prev.actionCompletions,
            ...imported.actionCompletions,
          ],
        };
      });

      if (importMode === "merge" && imported.goals.length > 0) {
        setSelectedGoalId(imported.goals[0].id);
      }

      setImportMessage({
        type: "success",
        text: `Imported ${imported.goals.length} goal(s) and ${imported.actionCompletions.length} completion(s) (${importMode}).`,
      });
    };
    reader.onerror = () => {
      setImportMessage({ type: "error", text: "Could not read file." });
    };
    reader.readAsText(file);
  }

  const goalProgress = useMemo(() => {
    return data.goals.map((goal) => {
      const totalDays = daysBetweenInclusive(goal.startDate, goal.endDate);
      const totalSlots = totalDays * goal.actionItems.length;
      const completed = goalCompletions(data.actionCompletions, goal).length;
      const pct =
        totalSlots > 0 ? Math.round((completed / totalSlots) * 100) : 0;
      return { goal, totalDays, totalSlots, completed, pct };
    });
  }, [data.goals, data.actionCompletions]);

  const dailyChartData = useMemo(() => {
    if (!selectedGoal || selectedGoal.actionItems.length === 0) return [];
    return daysInRange(selectedGoal.startDate, selectedGoal.endDate).map(
      (day) => {
        const date = formatDate(day);
        const pct = dailyCompletionPct(
          selectedGoal,
          data.actionCompletions,
          date,
        );
        const completed = selectedGoal.actionItems.filter((item) =>
          isActionCompleted(
            data.actionCompletions,
            selectedGoal.id,
            item.id,
            date,
          ),
        ).length;
        return {
          date,
          label: shortDayLabel(date),
          pct,
          completed,
          total: selectedGoal.actionItems.length,
        };
      },
    );
  }, [selectedGoal, data.actionCompletions]);

  const viewDateSummary = useMemo(() => {
    if (!selectedGoal || selectedGoal.actionItems.length === 0) return null;
    const completed = selectedGoal.actionItems.filter((item) =>
      isActionCompleted(
        data.actionCompletions,
        selectedGoal.id,
        item.id,
        viewDate,
      ),
    ).length;
    return {
      completed,
      total: selectedGoal.actionItems.length,
      pct: dailyCompletionPct(
        selectedGoal,
        data.actionCompletions,
        viewDate,
      ),
    };
  }, [selectedGoal, viewDate, data.actionCompletions]);

  const dayInRange =
    selectedGoal &&
    isDateInRange(viewDate, selectedGoal.startDate, selectedGoal.endDate);

  if (!hydrated) {
    return <p className="text-zinc-500">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Goal Tracker
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Add a goal, define daily action items under it, mark each item per day,
          and track progress over time.
        </p>
        <SyncStatus saving={saving} error={error} />
      </div>

      <Card title="Import & export">
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Back up goals, action items, and daily check-ins as JSON. Import on
          this device or another account.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportGoals()}
            disabled={data.goals.length === 0}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Export all goals
          </button>
          <button
            type="button"
            onClick={() => selectedGoal && exportGoals([selectedGoal.id])}
            disabled={!selectedGoal}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Export selected goal
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <label className="text-sm">
            <span className="mb-1 block text-zinc-600 dark:text-zinc-400">
              Import mode
            </span>
            <select
              value={importMode}
              onChange={(e) =>
                setImportMode(e.target.value as GoalImportMode)
              }
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <option value="merge">Merge (add to existing)</option>
              <option value="replace">Replace all goals</option>
            </select>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Import JSON file
          </button>
        </div>
        {importMessage && (
          <p
            className={`mt-3 text-sm ${
              importMessage.type === "success"
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {importMessage.text}
          </p>
        )}
      </Card>

      <Card title="Create goal">
        <form onSubmit={addGoal} className="flex flex-wrap gap-3">
          <input
            placeholder="e.g. Lose weight by 15 kg"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="min-w-[160px] flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            min={startDate}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Add goal
          </button>
        </form>
      </Card>

      {data.goals.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {goalProgress.map(({ goal, completed, totalSlots, pct }) => (
              <div
                key={goal.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedGoalId(goal.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedGoalId(goal.id);
                  }
                }}
                className={`cursor-pointer rounded-xl border p-4 text-left transition-colors ${
                  selectedGoal?.id === goal.id
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                    : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{goal.title}</h3>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteGoal(goal.id);
                    }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatDisplayDate(goal.startDate)} –{" "}
                  {formatDisplayDate(goal.endDate)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {goal.actionItems.length} daily action
                  {goal.actionItems.length === 1 ? "" : "s"}
                </p>
                <p className="mt-2 text-sm">
                  {completed} / {totalSlots} daily marks · {pct}%
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {selectedGoal && (
            <div className="space-y-6">
              <Card title={`Action items for “${selectedGoal.title}”`}>
                <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                  These repeat every day during the goal period. Mark each one
                  done separately for each date.
                </p>
                <form onSubmit={addActionItem} className="mb-4 flex gap-2">
                  <input
                    placeholder="e.g. 80 squats"
                    value={actionInput}
                    onChange={(e) => setActionInput(e.target.value)}
                    className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Add action
                  </button>
                </form>
                {selectedGoal.actionItems.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    Add actions like “80 squats” or “30 push ups” for this goal.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {selectedGoal.actionItems.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800"
                      >
                        <span className="text-sm font-medium">{item.title}</span>
                        <button
                          type="button"
                          onClick={() => removeActionItem(item.id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="Mark completion for a day">
                <label className="mb-3 block text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Date</span>
                  <input
                    type="date"
                    value={viewDate}
                    onChange={(e) => setViewDate(e.target.value)}
                    min={selectedGoal.startDate}
                    max={selectedGoal.endDate}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </label>
                {viewDateSummary && dayInRange && (
                  <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {formatDisplayDate(viewDate)}: {viewDateSummary.completed} of{" "}
                    {viewDateSummary.total} done ({viewDateSummary.pct}%)
                  </p>
                )}
                {!dayInRange ? (
                  <p className="text-sm text-amber-600">
                    Selected date is outside this goal&apos;s range.
                  </p>
                ) : selectedGoal.actionItems.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    Add action items above before marking daily completion.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {selectedGoal.actionItems.map((item) => {
                      const done = isActionCompleted(
                        data.actionCompletions,
                        selectedGoal.id,
                        item.id,
                        viewDate,
                      );
                      return (
                        <li key={item.id}>
                          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-100 p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50">
                            <input
                              type="checkbox"
                              checked={done}
                              onChange={() =>
                                toggleCompletion(
                                  selectedGoal.id,
                                  item.id,
                                  viewDate,
                                )
                              }
                              className="h-4 w-4 rounded border-zinc-300 text-emerald-600"
                            />
                            <span
                              className={
                                done ? "text-emerald-700 dark:text-emerald-400" : ""
                              }
                            >
                              {item.title}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>

              {dailyChartData.length > 0 && (
                <Card title="Daily progress">
                  <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                    Percent of action items completed each day (100% = all done
                    that day).
                  </p>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyChartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-zinc-200 dark:stroke-zinc-700"
                        />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10 }}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip
                          formatter={(value, _name, props) => {
                            const row = props.payload as {
                              completed: number;
                              total: number;
                            };
                            return [
                              `${Number(value)}% (${row.completed}/${row.total})`,
                              "Daily completion",
                            ];
                          }}
                          labelFormatter={(_, payload) => {
                            const row = payload?.[0]?.payload as
                              | { date: string }
                              | undefined;
                            return row
                              ? formatDisplayDate(row.date)
                              : "";
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="pct"
                          stroke="#059669"
                          strokeWidth={2}
                          dot={{ r: 2 }}
                          activeDot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-zinc-500">Create your first goal to get started.</p>
      )}
    </div>
  );
}

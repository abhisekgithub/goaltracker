"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "./Card";
import { RoutineNowBanner } from "./RoutineNowBanner";
import { SyncStatus } from "./SyncStatus";
import {
  formatRoutineRange,
  getRoutineNow,
  minutesToTimeInput,
  parseTimeToMinutes,
  sortRoutineBlocks,
  validateRoutineBlock,
} from "@/lib/routine";
import { createId, useAppData } from "@/lib/storage";
import type { RoutineBlock } from "@/lib/types";

type BlockFormState = {
  title: string;
  start: string;
  end: string;
};

const emptyForm = (): BlockFormState => ({
  title: "",
  start: "06:00",
  end: "06:30",
});

export function RoutineTracker() {
  const { data, update, hydrated, saving, error } = useAppData();
  const [addForm, setAddForm] = useState<BlockFormState>(emptyForm);
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<BlockFormState>(emptyForm);
  const [editError, setEditError] = useState<string | null>(null);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const blocks = useMemo(
    () => sortRoutineBlocks(data.routineBlocks ?? []),
    [data.routineBlocks],
  );

  const routineNow = useMemo(
    () => getRoutineNow(blocks),
    [blocks, tick],
  );

  function parseForm(
    form: BlockFormState,
  ):
    | { error: string }
    | { error: null; title: string; startMinutes: number; endMinutes: number } {
    const startMinutes = parseTimeToMinutes(form.start);
    const endMinutes = parseTimeToMinutes(form.end);
    if (startMinutes === null || endMinutes === null) {
      return { error: "Invalid time format." };
    }
    const validation = validateRoutineBlock(
      form.title,
      startMinutes,
      endMinutes,
    );
    if (validation) return { error: validation };
    return {
      error: null,
      title: form.title.trim(),
      startMinutes,
      endMinutes,
    };
  }

  function saveBlocks(next: RoutineBlock[]) {
    update((prev) => ({
      ...prev,
      routineBlocks: sortRoutineBlocks(next),
    }));
  }

  function addBlock(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    const parsed = parseForm(addForm);
    if (parsed.error !== null) {
      setAddError(parsed.error);
      return;
    }
    saveBlocks([
      ...blocks,
      {
        id: createId(),
        title: parsed.title,
        startMinutes: parsed.startMinutes,
        endMinutes: parsed.endMinutes,
      },
    ]);
    setAddForm(emptyForm());
  }

  function startEdit(block: RoutineBlock) {
    setEditingId(block.id);
    setEditError(null);
    setEditForm({
      title: block.title,
      start: minutesToTimeInput(block.startMinutes),
      end: minutesToTimeInput(block.endMinutes),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditError(null);
    const parsed = parseForm(editForm);
    if (parsed.error !== null) {
      setEditError(parsed.error);
      return;
    }
    saveBlocks(
      blocks.map((b) =>
        b.id === editingId
          ? {
              ...b,
              title: parsed.title,
              startMinutes: parsed.startMinutes,
              endMinutes: parsed.endMinutes,
            }
          : b,
      ),
    );
    cancelEdit();
  }

  function removeBlock(id: string) {
    saveBlocks(blocks.filter((b) => b.id !== id));
    if (editingId === id) cancelEdit();
  }

  if (!hydrated) {
    return <p className="text-zinc-500">Loading…</p>;
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1 className="page-title">Daily routine</h1>
        <p className="page-subtitle">
          Plan your day in time blocks. Your current activity shows on the home
          page when you&apos;re signed in.
        </p>
        <SyncStatus saving={saving} error={error} />
      </header>

      <RoutineNowBanner />

      <Card title="Add time block">
        <form onSubmit={addBlock} className="space-y-3">
          <input
            placeholder="e.g. Being fresh"
            value={addForm.title}
            onChange={(e) =>
              setAddForm((f) => ({ ...f, title: e.target.value }))
            }
            required
            className="input-field"
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-zinc-600 dark:text-zinc-400">
                From
              </span>
              <input
                type="time"
                value={addForm.start}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, start: e.target.value }))
                }
                required
                className="input-field"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-zinc-600 dark:text-zinc-400">
                To
              </span>
              <input
                type="time"
                value={addForm.end}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, end: e.target.value }))
                }
                required
                className="input-field"
              />
            </label>
          </div>
          {addError && (
            <p className="text-sm text-red-600 dark:text-red-400">{addError}</p>
          )}
          <button type="submit" className="btn-primary w-full sm:w-auto">
            Add to routine
          </button>
        </form>
      </Card>

      <Card title="Your day">
        {blocks.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No blocks yet. Example: 6:00–6:30 Being fresh, 6:30–7:00 Exercise.
          </p>
        ) : (
          <ul className="space-y-3">
            {blocks.map((block) =>
              editingId === block.id ? (
                <li
                  key={block.id}
                  className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20"
                >
                  <form onSubmit={saveEdit} className="space-y-3">
                    <input
                      value={editForm.title}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, title: e.target.value }))
                      }
                      required
                      className="input-field"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-sm">
                        <span className="mb-1 block text-zinc-600 dark:text-zinc-400">
                          From
                        </span>
                        <input
                          type="time"
                          value={editForm.start}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              start: e.target.value,
                            }))
                          }
                          required
                          className="input-field"
                        />
                      </label>
                      <label className="text-sm">
                        <span className="mb-1 block text-zinc-600 dark:text-zinc-400">
                          To
                        </span>
                        <input
                          type="time"
                          value={editForm.end}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, end: e.target.value }))
                          }
                          required
                          className="input-field"
                        />
                      </label>
                    </div>
                    {editError && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {editError}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button type="submit" className="btn-primary">
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </li>
              ) : (
                <li
                  key={block.id}
                  className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                    routineNow.kind === "current" &&
                    routineNow.block.id === block.id
                      ? "border-emerald-300 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/30"
                      : "border-zinc-100 dark:border-zinc-800"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {block.title}
                      </p>
                      {routineNow.kind === "current" &&
                        routineNow.block.id === block.id && (
                          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                            Now
                          </span>
                        )}
                    </div>
                    <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
                      {formatRoutineRange(block)}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {block.endMinutes - block.startMinutes} minutes
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(block)}
                      className="btn-secondary !min-h-9 !px-3 !py-2 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </Card>
    </div>
  );
}

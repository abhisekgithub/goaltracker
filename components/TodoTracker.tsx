"use client";

import { useMemo, useState } from "react";
import { Card } from "./Card";
import { SyncStatus } from "./SyncStatus";
import { createId, useAppData } from "@/lib/storage";
import { formatDate } from "@/lib/dates";

export function TodoTracker() {
  const { data, update, hydrated, saving, error } = useAppData();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");

  const todos = useMemo(() => {
    let list = [...data.todos].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) {
        return a.createdAt.localeCompare(b.createdAt);
      }
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      const byDue = a.dueDate.localeCompare(b.dueDate);
      return byDue !== 0 ? byDue : a.createdAt.localeCompare(b.createdAt);
    });
    if (filter === "active") list = list.filter((t) => !t.completed);
    if (filter === "done") list = list.filter((t) => t.completed);
    return list;
  }, [data.todos, filter]);

  const activeCount = data.todos.filter((t) => !t.completed).length;

  function addTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    update((prev) => ({
      ...prev,
      todos: [
        {
          id: createId(),
          title: title.trim(),
          completed: false,
          createdAt: new Date().toISOString(),
          dueDate: dueDate || undefined,
        },
        ...prev.todos,
      ],
    }));
    setTitle("");
    setDueDate("");
  }

  function toggleTodo(id: string) {
    update((prev) => ({
      ...prev,
      todos: prev.todos.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t,
      ),
    }));
  }

  function removeTodo(id: string) {
    update((prev) => ({
      ...prev,
      todos: prev.todos.filter((t) => t.id !== id),
    }));
  }

  function clearCompleted() {
    update((prev) => ({
      ...prev,
      todos: prev.todos.filter((t) => !t.completed),
    }));
  }

  if (!hydrated) {
    return <p className="text-zinc-500">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Todo Tracker
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Simple task list with optional due dates.
        </p>
        <SyncStatus saving={saving} error={error} />
      </div>

      <Card>
        <form onSubmit={addTodo} className="flex flex-wrap gap-2">
          <input
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="min-w-[200px] flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Add todo
          </button>
        </form>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex gap-2">
          {(["all", "active", "done"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1 capitalize ${
                filter === f
                  ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="text-zinc-500">{activeCount} active</span>
      </div>

      <Card>
        {todos.length === 0 ? (
          <p className="text-sm text-zinc-500">No todos yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {todos.map((todo) => {
              const overdue =
                todo.dueDate &&
                !todo.completed &&
                todo.dueDate < formatDate(new Date());
              return (
                <li
                  key={todo.id}
                  className="flex items-center gap-3 py-3"
                >
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id)}
                    className="h-4 w-4 rounded border-zinc-300 text-emerald-600"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={
                        todo.completed
                          ? "text-zinc-400 line-through"
                          : "font-medium"
                      }
                    >
                      {todo.title}
                    </p>
                    {todo.dueDate && (
                      <p
                        className={`text-xs ${
                          overdue ? "text-red-500" : "text-zinc-500"
                        }`}
                      >
                        Due {todo.dueDate}
                        {overdue && " (overdue)"}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTodo(todo.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {data.todos.some((t) => t.completed) && (
          <button
            type="button"
            onClick={clearCompleted}
            className="mt-4 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Clear completed
          </button>
        )}
      </Card>
    </div>
  );
}

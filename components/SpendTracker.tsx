"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "./Card";
import { SyncStatus } from "./SyncStatus";
import { createId, useAppData } from "@/lib/storage";
import {
  daysInMonth,
  formatDate,
  monthKey,
  parseMonthKey,
  previousMonth,
} from "@/lib/dates";
import type { MonthlyBudget, SpendCategory } from "@/lib/types";

const CHART_COLORS = [
  "#059669",
  "#0d9488",
  "#0891b2",
  "#0284c7",
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
  "#e11d48",
];

function currentMonthSelection() {
  const now = new Date();
  return monthKey(now.getFullYear(), now.getMonth() + 1);
}

function copyCategories(categories: SpendCategory[]): SpendCategory[] {
  return categories.map((c) => ({
    id: createId(),
    name: c.name,
    monthlyBudget: c.monthlyBudget,
  }));
}

export function SpendTracker() {
  const { data, update, hydrated, saving, error } = useAppData();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthSelection);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryBudget, setNewCategoryBudget] = useState("");
  const [spendCategoryId, setSpendCategoryId] = useState("");
  const [spendDate, setSpendDate] = useState(formatDate(new Date()));
  const [spendAmount, setSpendAmount] = useState("");
  const [spendNote, setSpendNote] = useState("");

  const { year, month } = parseMonthKey(selectedMonth);

  const budget: MonthlyBudget | undefined = data.monthlyBudgets.find(
    (b) => b.year === year && b.month === month,
  );

  useEffect(() => {
    if (!hydrated || budget) return;

    const prev = previousMonth(year, month);
    const prevBudget = data.monthlyBudgets.find(
      (b) => b.year === prev.year && b.month === prev.month,
    );
    if (!prevBudget?.categories.length) return;

    update((prevData) => ({
      ...prevData,
      monthlyBudgets: [
        ...prevData.monthlyBudgets,
        {
          id: createId(),
          year,
          month,
          categories: copyCategories(prevBudget.categories),
        },
      ],
    }));
  }, [hydrated, budget, year, month, data.monthlyBudgets, update]);

  const monthEntries = useMemo(
    () =>
      data.spendEntries.filter((e) => e.date.startsWith(selectedMonth)),
    [data.spendEntries, selectedMonth],
  );

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const entry of monthEntries) {
      totals.set(entry.categoryId, (totals.get(entry.categoryId) ?? 0) + entry.amount);
    }
    return totals;
  }, [monthEntries]);

  const totalBudget = budget?.categories.reduce((s, c) => s + c.monthlyBudget, 0) ?? 0;
  const totalSpent = monthEntries.reduce((s, e) => s + e.amount, 0);
  const remaining = totalBudget - totalSpent;

  const dailyChartData = useMemo(() => {
    return daysInMonth(year, month).map((day) => {
      const dateStr = formatDate(day);
      const dayTotal = monthEntries
        .filter((e) => e.date === dateStr)
        .reduce((s, e) => s + e.amount, 0);
      return {
        day: day.getDate(),
        label: dateStr.slice(8),
        amount: dayTotal,
      };
    });
  }, [year, month, monthEntries]);

  const categoryChartData = useMemo(() => {
    if (!budget) return [];
    return budget.categories.map((cat, i) => ({
      name: cat.name,
      value: categoryTotals.get(cat.id) ?? 0,
      budget: cat.monthlyBudget,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [budget, categoryTotals]);

  function ensureBudget(): MonthlyBudget {
    if (budget) return budget;

    const prev = previousMonth(year, month);
    const prevBudget = data.monthlyBudgets.find(
      (b) => b.year === prev.year && b.month === prev.month,
    );
    const categories = prevBudget?.categories.length
      ? copyCategories(prevBudget.categories)
      : [];

    const newBudget: MonthlyBudget = {
      id: createId(),
      year,
      month,
      categories,
    };
    update((prevData) => ({
      ...prevData,
      monthlyBudgets: [...prevData.monthlyBudgets, newBudget],
    }));
    return newBudget;
  }

  function addCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = newCategoryName.trim();
    const amount = parseFloat(newCategoryBudget);
    if (!name || Number.isNaN(amount) || amount <= 0) return;

    const b = ensureBudget();
    const category: SpendCategory = {
      id: createId(),
      name,
      monthlyBudget: amount,
    };

    update((prev) => ({
      ...prev,
      monthlyBudgets: prev.monthlyBudgets.map((mb) =>
        mb.id === b.id
          ? { ...mb, categories: [...mb.categories, category] }
          : mb,
      ),
    }));
    setNewCategoryName("");
    setNewCategoryBudget("");
  }

  function addSpend(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(spendAmount);
    if (!spendCategoryId || Number.isNaN(amount) || amount <= 0) return;

    update((prev) => ({
      ...prev,
      spendEntries: [
        ...prev.spendEntries,
        {
          id: createId(),
          categoryId: spendCategoryId,
          date: spendDate,
          amount,
          note: spendNote.trim() || undefined,
        },
      ],
    }));
    setSpendAmount("");
    setSpendNote("");
  }

  function removeCategory(categoryId: string) {
    update((prev) => ({
      ...prev,
      monthlyBudgets: prev.monthlyBudgets.map((mb) =>
        mb.year === year && mb.month === month
          ? { ...mb, categories: mb.categories.filter((c) => c.id !== categoryId) }
          : mb,
      ),
      spendEntries: prev.spendEntries.filter((e) => e.categoryId !== categoryId),
    }));
  }

  if (!hydrated) {
    return <p className="text-zinc-500">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Spend Tracker
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Monthly budgets by category, daily spending, and charts.
          </p>
          <SyncStatus saving={saving} error={error} />
        </div>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-600 dark:text-zinc-400">Month</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="!p-4">
          <p className="text-sm text-zinc-500">Total budget</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            ${totalBudget.toFixed(2)}
          </p>
        </Card>
        <Card className="!p-4">
          <p className="text-sm text-zinc-500">Spent</p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
            ${totalSpent.toFixed(2)}
          </p>
        </Card>
        <Card className="!p-4">
          <p className="text-sm text-zinc-500">Remaining</p>
          <p
            className={`text-2xl font-bold ${
              remaining >= 0
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            ${remaining.toFixed(2)}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Budget categories">
          <form onSubmit={addCategory} className="mb-4 flex flex-wrap gap-2">
            <input
              placeholder="Category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="min-w-[120px] flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Monthly budget"
              value={newCategoryBudget}
              onChange={(e) => setNewCategoryBudget(e.target.value)}
              className="w-32 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Add
            </button>
          </form>
          {budget && budget.categories.length > 0 ? (
            <ul className="space-y-2">
              {budget.categories.map((cat) => {
                const spent = categoryTotals.get(cat.id) ?? 0;
                const left = cat.monthlyBudget - spent;
                const pct = Math.min(100, (spent / cat.monthlyBudget) * 100);
                return (
                  <li
                    key={cat.id}
                    className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{cat.name}</span>
                      <button
                        type="button"
                        onClick={() => removeCategory(cat.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-1 flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
                      <span>
                        ${spent.toFixed(2)} / ${cat.monthlyBudget.toFixed(2)}
                      </span>
                      <span
                        className={
                          left >= 0 ? "text-emerald-600" : "text-red-500"
                        }
                      >
                        ${left.toFixed(2)} left
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className={`h-full rounded-full ${
                          pct > 100 ? "bg-red-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">Add categories to set your monthly budget.</p>
          )}
        </Card>

        <Card title="Log spend">
          <form onSubmit={addSpend} className="space-y-3">
            <select
              value={spendCategoryId}
              onChange={(e) => setSpendCategoryId(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            >
              <option value="">Select category</option>
              {budget?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={spendDate}
              onChange={(e) => setSpendDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Amount"
              value={spendAmount}
              onChange={(e) => setSpendAmount(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
            <input
              placeholder="Note (optional)"
              value={spendNote}
              onChange={(e) => setSpendNote(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
            <button
              type="submit"
              disabled={!budget?.categories.length}
              className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Add spend
            </button>
          </form>
        </Card>
      </div>

      <Card title="Daily spend this month">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, "Spent"]} />
              <Bar dataKey="amount" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {categoryChartData.some((d) => d.value > 0) && (
        <Card title="Spend by category">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData.filter((d) => d.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, value }) =>
                    `${name}: $${Number(value).toFixed(0)}`
                  }
                >
                  {categoryChartData.map((entry, i) => (
                    <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {monthEntries.length > 0 && (
        <Card title="Recent entries">
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {[...monthEntries]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 20)
              .map((entry) => {
                const cat = budget?.categories.find((c) => c.id === entry.categoryId);
                return (
                  <li
                    key={entry.id}
                    className="flex justify-between py-2 text-sm"
                  >
                    <span>
                      {entry.date} · {cat?.name ?? "Unknown"}
                      {entry.note && (
                        <span className="text-zinc-500"> — {entry.note}</span>
                      )}
                    </span>
                    <span className="font-medium">${entry.amount.toFixed(2)}</span>
                  </li>
                );
              })}
          </ul>
        </Card>
      )}
    </div>
  );
}

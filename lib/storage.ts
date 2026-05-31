"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import type { AppData } from "./types";
import { EMPTY_APP_DATA } from "./types";

const SAVE_DEBOUNCE_MS = 600;

async function fetchData(): Promise<AppData> {
  const res = await fetch("/api/data");
  if (!res.ok) throw new Error("Failed to load data");
  return res.json();
}

async function persistData(data: AppData) {
  const res = await fetch("/api/data", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save data");
}

export function useAppData() {
  const { status } = useSession();
  const [data, setData] = useState<AppData>(EMPTY_APP_DATA);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef(data);

  dataRef.current = data;

  useEffect(() => {
    if (status === "loading") return;

    if (status !== "authenticated") {
      setHydrated(true);
      return;
    }

    let cancelled = false;
    setHydrated(false);
    setError(null);

    fetchData()
      .then((loaded) => {
        if (!cancelled) {
          setData({ ...EMPTY_APP_DATA, ...loaded });
          setHydrated(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load your data.");
          setHydrated(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [status]);

  const flushSave = useCallback(async (next: AppData) => {
    if (status !== "authenticated") return;
    setSaving(true);
    try {
      await persistData(next);
      setError(null);
    } catch {
      setError("Could not save changes.");
    } finally {
      setSaving(false);
    }
  }, [status]);

  const update = useCallback(
    (updater: (prev: AppData) => AppData) => {
      setData((prev) => {
        const next = updater(prev);
        dataRef.current = next;

        if (status === "authenticated") {
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => {
            flushSave(next);
          }, SAVE_DEBOUNCE_MS);
        }

        return next;
      });
    },
    [status, flushSave],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return { data, update, hydrated, saving, error, isAuthenticated: status === "authenticated" };
}

export function createId() {
  return crypto.randomUUID();
}

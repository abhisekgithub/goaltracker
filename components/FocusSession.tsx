"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "./Card";
import {
  notificationsSupported,
  requestNotificationPermission,
  showSessionCompleteNotification,
} from "@/lib/session-notifications";
import { playSessionCompleteSound, prepareSessionAudio } from "@/lib/session-sound";

const PRESET_MINUTES = [15, 25, 30, 45, 60, 90] as const;

type SessionStatus = "idle" | "running" | "paused" | "done";

function formatCountdown(totalSeconds: number) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function FocusSession() {
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [customMinutes, setCustomMinutes] = useState("");
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported" | "unknown"
  >("unknown");

  const endTimeRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  const totalSeconds = durationMinutes * 60;
  const progress =
    totalSeconds > 0
      ? Math.min(100, ((totalSeconds - remainingSeconds) / totalSeconds) * 100)
      : 0;

  useEffect(() => {
    if (!notificationsSupported()) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  const finishSession = useCallback(async () => {
    if (completedRef.current) return;
    completedRef.current = true;
    endTimeRef.current = null;
    setStatus("done");
    setRemainingSeconds(0);
    await playSessionCompleteSound();
    if (notifyEnabled) {
      showSessionCompleteNotification(durationMinutes);
    }
  }, [durationMinutes, notifyEnabled]);

  const tick = useCallback(() => {
    if (!endTimeRef.current) return;
    const left = (endTimeRef.current - Date.now()) / 1000;
    if (left <= 0) {
      setRemainingSeconds(0);
      void finishSession();
      return;
    }
    setRemainingSeconds(left);
  }, [finishSession]);

  useEffect(() => {
    if (status !== "running") return;
    tick();
    const id = window.setInterval(tick, 250);
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [status, tick]);

  function selectPreset(minutes: number) {
    if (status === "running" || status === "paused") return;
    setDurationMinutes(minutes);
    setRemainingSeconds(minutes * 60);
    setCustomMinutes("");
    setStatus("idle");
    completedRef.current = false;
  }

  function applyCustomDuration() {
    if (status === "running" || status === "paused") return;
    const n = parseInt(customMinutes, 10);
    if (Number.isNaN(n) || n < 1 || n > 180) return;
    setDurationMinutes(n);
    setRemainingSeconds(n * 60);
    setStatus("idle");
    completedRef.current = false;
  }

  async function startSession() {
    await prepareSessionAudio();
    if (notifyEnabled && notificationsSupported()) {
      const result = await requestNotificationPermission();
      setPermission(result);
    }
    completedRef.current = false;
    const seconds =
      remainingSeconds > 0 && status !== "done"
        ? remainingSeconds
        : durationMinutes * 60;
    setRemainingSeconds(seconds);
    endTimeRef.current = Date.now() + seconds * 1000;
    setStatus("running");
  }

  function pauseSession() {
    if (status !== "running" || !endTimeRef.current) return;
    const left = Math.max(0, (endTimeRef.current - Date.now()) / 1000);
    setRemainingSeconds(left);
    endTimeRef.current = null;
    setStatus("paused");
  }

  function resumeSession() {
    if (status !== "paused") return;
    endTimeRef.current = Date.now() + remainingSeconds * 1000;
    setStatus("running");
  }

  function resetSession() {
    endTimeRef.current = null;
    completedRef.current = false;
    setStatus("idle");
    setRemainingSeconds(durationMinutes * 60);
  }

  const isActive = status === "running" || status === "paused";

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1 className="page-title">Deep focus</h1>
        <p className="page-subtitle">
          Start a timed session for uninterrupted work. You&apos;ll hear a chime
          and get a desktop notification when time is up.
        </p>
      </header>

      <Card className="overflow-hidden !p-0">
        <div className="bg-gradient-to-b from-emerald-50 to-white p-6 sm:p-10 dark:from-emerald-950/40 dark:to-zinc-900">
          <div className="relative mx-auto flex aspect-square max-w-[min(100%,280px)] items-center justify-center">
            <svg
              className="absolute inset-0 h-full w-full -rotate-90"
              viewBox="0 0 100 100"
              aria-hidden
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                className="stroke-zinc-200 dark:stroke-zinc-800"
                strokeWidth="6"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                className="stroke-emerald-500 transition-all duration-300"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              />
            </svg>
            <div className="text-center">
              <p
                className="font-mono text-5xl font-bold tracking-tight text-zinc-900 tabular-nums sm:text-6xl dark:text-zinc-50"
                aria-live="polite"
                aria-atomic="true"
              >
                {formatCountdown(remainingSeconds)}
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                {status === "idle" && `${durationMinutes} min session`}
                {status === "running" && "In progress…"}
                {status === "paused" && "Paused"}
                {status === "done" && "Session complete!"}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {status === "idle" || status === "done" ? (
              <button
                type="button"
                onClick={() => void startSession()}
                className="btn-primary min-w-[140px]"
              >
                {status === "done" ? "Start again" : "Start session"}
              </button>
            ) : null}
            {status === "running" ? (
              <button
                type="button"
                onClick={pauseSession}
                className="btn-secondary min-w-[120px]"
              >
                Pause
              </button>
            ) : null}
            {status === "paused" ? (
              <button
                type="button"
                onClick={resumeSession}
                className="btn-primary min-w-[120px]"
              >
                Resume
              </button>
            ) : null}
            {isActive || status === "done" ? (
              <button
                type="button"
                onClick={resetSession}
                className="btn-secondary min-w-[100px]"
              >
                Reset
              </button>
            ) : null}
          </div>
        </div>
      </Card>

      <Card title="Session length">
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
          Choose a preset or enter custom minutes (1–180).
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {PRESET_MINUTES.map((min) => (
            <button
              key={min}
              type="button"
              disabled={isActive}
              onClick={() => selectPreset(min)}
              className={`touch-target rounded-xl border px-2 py-3 text-sm font-medium transition-colors ${
                durationMinutes === min && !customMinutes
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
                  : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              } disabled:opacity-50`}
            >
              {min}m
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            type="number"
            min={1}
            max={180}
            placeholder="Custom min"
            value={customMinutes}
            disabled={isActive}
            onChange={(e) => setCustomMinutes(e.target.value)}
            className="input-field min-w-0 flex-1 sm:max-w-[140px]"
          />
          <button
            type="button"
            disabled={isActive || !customMinutes}
            onClick={applyCustomDuration}
            className="btn-secondary"
          >
            Set
          </button>
        </div>
      </Card>

      <Card title="Alerts">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={notifyEnabled}
            onChange={(e) => setNotifyEnabled(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-zinc-300 text-emerald-600"
          />
          <span className="text-sm">
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              Desktop notification when session ends
            </span>
            <span className="mt-1 block text-zinc-500">
              Allow notifications in your browser when prompted. Sound plays
              even if notifications are off.
            </span>
          </span>
        </label>
        {permission === "denied" && notifyEnabled && (
          <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
            Notifications are blocked. Enable them in your browser settings for
            this site.
          </p>
        )}
        {permission === "unsupported" && notifyEnabled && (
          <p className="mt-3 text-sm text-zinc-500">
            Desktop notifications are not supported in this browser.
          </p>
        )}
      </Card>
    </div>
  );
}

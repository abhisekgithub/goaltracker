export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export function showSessionCompleteNotification(durationMinutes: number) {
  if (!notificationsSupported() || Notification.permission !== "granted") {
    return;
  }
  const title = "Deep session complete";
  const body = `Your ${durationMinutes}-minute focus session is finished. Great work!`;
  try {
    const n = new Notification(title, {
      body,
      icon: "/icon.svg",
      tag: "focus-session-complete",
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // Some environments block Notification constructor
  }
}

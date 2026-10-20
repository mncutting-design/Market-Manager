// In-memory user activity & online status tracker
// Records heartbeats and requests to track who is currently online and when they last used the system.

interface UserActivity {
  lastActive: number; // timestamp in ms
  ip?: string;
}

// Global variable to survive hot-reloads in Next.js development
declare global {
  var __rentpro_user_activity: Map<string, UserActivity> | undefined;
}

const activityMap = global.__rentpro_user_activity || new Map<string, UserActivity>();
global.__rentpro_user_activity = activityMap;

export function recordUserActivity(userIdOrName: string, ip?: string) {
  if (!userIdOrName) return;
  const key = userIdOrName.trim().toUpperCase();
  activityMap.set(key, {
    lastActive: Date.now(),
    ip,
  });
}

export function formatTimeAgo(timestamp: number, locale: string = "bn"): { ago_bn: string; ago_en: string } {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);

  if (diffSec < 60) {
    return {
      ago_bn: "এইমাত্র",
      ago_en: "Just now",
    };
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return {
      ago_bn: `${diffMin} মিনিট আগে`,
      ago_en: `${diffMin}m ago`,
    };
  }

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return {
      ago_bn: `${diffHour} ঘণ্টা আগে`,
      ago_en: `${diffHour}h ago`,
    };
  }

  const diffDay = Math.floor(diffHour / 24);
  return {
    ago_bn: `${diffDay} দিন আগে`,
    ago_en: `${diffDay}d ago`,
  };
}

export function getUserActivity(userIdOrName: string, fallbackDate?: Date | string) {
  const key = (userIdOrName || "").trim().toUpperCase();
  const entry = activityMap.get(key);

  let lastActiveMs = entry?.lastActive;
  if (!lastActiveMs && fallbackDate) {
    lastActiveMs = new Date(fallbackDate).getTime();
  }

  // Active within 3 minutes is considered ONLINE
  const isOnline = !!lastActiveMs && Date.now() - lastActiveMs < 3 * 60 * 1000;
  const formatted = lastActiveMs ? formatTimeAgo(lastActiveMs) : { ago_bn: "অজ্ঞাত", ago_en: "Unknown" };

  return {
    isOnline,
    lastActiveAt: lastActiveMs ? new Date(lastActiveMs).toISOString() : null,
    lastActiveAgo_bn: isOnline ? "অনলাইন (সক্রিয়)" : formatted.ago_bn,
    lastActiveAgo_en: isOnline ? "Online Now" : formatted.ago_en,
  };
}

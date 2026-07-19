"use client";

export type ChoNeoBetaEventName =
  | "cho_neo_page_view"
  | "room_sidebar_clicked"
  | "map_icon_clicked"
  | "room_entered"
  | "feedback_opened"
  | "feedback_submitted"
  | "feedback_closed"
  | "post_started"
  | "post_submitted"
  | "ong_dia_opened"
  | "ong_dia_interaction_started"
  | "ong_dia_v1_viewed"
  | "ong_dia_v1_submitted"
  | "ong_dia_v1_response_shown"
  | "ong_dia_v1_share_success"
  | "ong_dia_v1_copy_success"
  | "ong_dia_v1_followup_started"
  | "ong_dia_v1_outbound_clicked"
  | "ong_dia_v1_next_day_returned"
  | "khoe_set_opened"
  | "music_button_seen"
  | "music_start_clicked"
  | "music_started"
  | "music_paused"
  | "music_muted"
  | "music_unmuted"
  | "music_volume_changed"
  | "music_mood_selected"
  | "music_track_changed"
  | "music_stayed_30_seconds"
  | "music_stayed_2_minutes"
  | "music_stayed_5_minutes"
  | "music_error";

const BETA_SESSION_KEY = "choNeoBetaSessionIdV1";
const MUSIC_ACTIVITY_KEY = "choNeoVillageMusicActivityV1";

type BetaEventContext = {
  room?: string;
  selectedVillageMood?: string;
  details?: Record<string, unknown>;
};

export function getChoNeoBetaSessionId() {
  if (typeof window === "undefined") return "server";

  try {
    const existing = window.localStorage.getItem(BETA_SESSION_KEY);
    if (existing) return existing;

    const next =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `cho-neo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(BETA_SESSION_KEY, next);
    return next;
  } catch {
    return "storage-restricted";
  }
}

export function getChoNeoDeviceType() {
  if (typeof window === "undefined") return "unknown";
  return window.matchMedia("(max-width: 760px)").matches ? "mobile" : "desktop";
}

export function rememberChoNeoMusicActivity(activity: string) {
  if (typeof window === "undefined") return;

  try {
    const current = readChoNeoMusicActivity();
    current[activity] = new Date().toISOString();
    window.localStorage.setItem(MUSIC_ACTIVITY_KEY, JSON.stringify(current));
  } catch {
    // Beta music memory is only used to decide whether to ask music questions.
  }
}

export function hasChoNeoMusicActivity() {
  if (typeof window === "undefined") return false;

  const current = readChoNeoMusicActivity();
  return Boolean(current.started || current.stayed_30_seconds);
}

export function trackChoNeoBetaEvent(
  eventName: ChoNeoBetaEventName,
  context: BetaEventContext = {}
) {
  if (typeof window === "undefined") return;

  const payload = {
    kind: "event",
    eventName,
    timestamp: new Date().toISOString(),
    path: window.location.pathname,
    room: context.room ?? inferChoNeoRoomFromPath(window.location.pathname),
    deviceType: getChoNeoDeviceType(),
    anonymousSessionId: getChoNeoBetaSessionId(),
    selectedVillageMood: context.selectedVillageMood,
    details: context.details ?? {},
  };

  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/cho-neo/beta-feedback", blob);
      return;
    }

    void fetch("/api/cho-neo/beta-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Analytics must never block the room.
  }
}

export function inferChoNeoRoomFromPath(pathname: string) {
  if (pathname === "/cho-neo") return "village-map";
  if (pathname.startsWith("/cho-neo/gossip")) return "gossip-cafe";
  if (pathname.startsWith("/cho-neo/ong-dia")) return "ong-dia-shrine";
  if (pathname.startsWith("/cho-neo/show-off")) return "show-off-gallery";
  if (pathname.startsWith("/cho-neo/owner-corner")) return "owner-corner";
  if (pathname.startsWith("/cho-neo/technique")) return "technique-hall";
  if (pathname.startsWith("/cho-neo/pho-cho")) return "market-street";
  if (pathname.startsWith("/cho-neo/waterfront")) return "waterfront";
  return "cho-neo";
}

function readChoNeoMusicActivity() {
  if (typeof window === "undefined") return {} as Record<string, string>;

  try {
    const raw = window.localStorage.getItem(MUSIC_ACTIVITY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

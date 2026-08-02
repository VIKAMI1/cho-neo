const DISABLED_FLAG_VALUES = new Set(["1", "true", "yes", "on"]);

export function isChoNeoDisabledFlag(value: string | undefined) {
  return DISABLED_FLAG_VALUES.has((value ?? "").trim().toLowerCase());
}

export function isChoNeoGossipPostingDisabled() {
  return isChoNeoDisabledFlag(process.env.CHO_NEO_GOSSIP_POSTING_DISABLED);
}

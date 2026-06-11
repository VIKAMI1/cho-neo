export const FOUNDING_PASSCODE = "CHO-NEO-FOUNDERS";
export const FOUNDING_PASS_UNLOCKED_KEY = "choNeoFoundingPassUnlocked";
export const FOUNDING_PASS_NAME_KEY = "choNeoFoundingPassDisplayName";

export type FoundingPassState = {
  displayName: string;
  unlocked: boolean;
};

export function isFoundingPassCode(passcode: string) {
  return passcode.trim() === FOUNDING_PASSCODE;
}

export function readFoundingPass(): FoundingPassState {
  const savedUnlocked = localStorage.getItem(FOUNDING_PASS_UNLOCKED_KEY) === "true";
  const displayName = localStorage.getItem(FOUNDING_PASS_NAME_KEY) ?? "";

  if (!savedUnlocked || !displayName.trim()) {
    return { displayName: "", unlocked: false };
  }

  return { displayName, unlocked: true };
}

export function saveFoundingPass(displayName: string) {
  const cleanedDisplayName = displayName.trim();

  localStorage.setItem(FOUNDING_PASS_UNLOCKED_KEY, "true");
  localStorage.setItem(FOUNDING_PASS_NAME_KEY, cleanedDisplayName);

  return { displayName: cleanedDisplayName, unlocked: true };
}

import { createInitialProfile, getLevelFromXp } from "./growth";
import type { PlayerProfile } from "./types";

const STORAGE_KEY = "gitgame.player-profile.v1";

export const loadProfile = (): PlayerProfile => {
  if (typeof window === "undefined") return createInitialProfile();

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return createInitialProfile();

  try {
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    const profile = { ...createInitialProfile(), ...parsed };
    return { ...profile, level: getLevelFromXp(profile.xp) };
  } catch {
    return createInitialProfile();
  }
};

export const saveProfile = (profile: PlayerProfile) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
};

export const clearProfile = () => {
  window.localStorage.removeItem(STORAGE_KEY);
};

"use client";

import { create } from "zustand";
import { useEffect, useRef } from "react";
import { fetchSession, login, logout, savePrefs, setSessionToken, signup } from "@/lib/api";
import { audio } from "@/lib/audio";
import { DEFAULT_PREFS } from "@/lib/types";
import type { SessionUser, UserPrefs } from "@/lib/types";
import { useAetherStore } from "./useAetherStore";

export type AuthStatus = "checking" | "anonymous" | "authed";

interface AuthState {
  status: AuthStatus;
  user: SessionUser | null;
  error: string | null;
  /** Non-blocking banner copy that survives a sign-out (e.g. "session expired"). */
  notice: string | null;
  busy: boolean;
  bootstrapped: boolean;
  bootstrap: () => Promise<void>;
  signIn: (username: string, password: string) => Promise<boolean>;
  signUp: (username: string, password: string, displayName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
  setNotice: (notice: string | null) => void;
}

function applyPrefs(prefs: UserPrefs): void {
  const store = useAetherStore;
  audio.setEnabled(prefs.sound);
  store.setState({
    viewMode: prefs.viewMode,
    theme: prefs.theme,
    simulation: prefs.simulation,
    sound: prefs.sound,
    orientation: prefs.orientation,
    mobileTab: prefs.mobileTab,
    timeframe: prefs.timeframe,
  });
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = prefs.theme;
  }
}

function adoptSession(user: SessionUser): void {
  applyPrefs(user.prefs ?? DEFAULT_PREFS);
  const store = useAetherStore;
  store.setState({
    status: "idle",
    error: null,
    accounts: [],
    cards: [],
    ledger: [],
    alerts: [],
    wires: [],
    events: [],
    toasts: [],
  });
  void store.getState().hydrate().then(() => {
    const state = store.getState();
    const preferred = user.prefs?.activeCardId;
    const exists = state.cards.some((card) => card.id === preferred);
    store.setState({
      activeCardId: exists && preferred ? preferred : (state.cards[0]?.id ?? ""),
    });
  });
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: "checking",
  user: null,
  error: null,
  notice: null,
  busy: false,
  bootstrapped: false,

  bootstrap: async () => {
    if (get().bootstrapped) return;
    set({ status: "checking", bootstrapped: true });
    try {
      const { user, token } = await fetchSession();
      if (token) setSessionToken(token);
      if (!user) {
        setSessionToken(null);
        set({ status: "anonymous", user: null });
        return;
      }
      set({ status: "authed", user, error: null });
      adoptSession(user);
    } catch {
      set({ status: "anonymous", user: null });
    }
  },

  signIn: async (username, password) => {
    set({ busy: true, error: null });
    try {
      const { user, token } = await login(username, password);
      setSessionToken(token);
      set({ busy: false, status: "authed", user, error: null });
      adoptSession(user);
      audio.play("confirm");
      return true;
    } catch (error) {
      set({
        busy: false,
        error: error instanceof Error ? error.message : "Sign-in failed",
      });
      audio.play("reject");
      return false;
    }
  },

  signUp: async (username, password, displayName) => {
    set({ busy: true, error: null });
    try {
      const { user, token } = await signup(username, password, displayName);
      setSessionToken(token);
      set({ busy: false, status: "authed", user, error: null });
      adoptSession(user);
      audio.play("cash");
      useAetherStore.getState().pushToast({
        title: `Welcome to AETHER, ${user.displayName.split(" ")[0]}`,
        body: "Your treasury workspace has been provisioned with 3 accounts and 2 cards.",
        tone: "positive",
        ttl: 6000,
      });
      return true;
    } catch (error) {
      set({
        busy: false,
        error: error instanceof Error ? error.message : "Sign-up failed",
      });
      audio.play("reject");
      return false;
    }
  },

  signOut: async () => {
    set({ busy: true });
    try {
      await logout();
    } catch {
      /* signing out is best-effort — the local session is always cleared */
    }
    setSessionToken(null);
    useAetherStore.setState({
      status: "idle",
      accounts: [],
      cards: [],
      ledger: [],
      alerts: [],
      wires: [],
      events: [],
      toasts: [],
      simulation: false,
    });
    set({ busy: false, status: "anonymous", user: null, error: null });
  },

  clearError: () => set({ error: null }),
  setNotice: (notice) => set({ notice }),
}));

/* ------------------------- preferences persistence ------------------------- */

const PREF_KEYS = [
  "viewMode",
  "theme",
  "simulation",
  "sound",
  "orientation",
  "mobileTab",
  "timeframe",
  "activeCardId",
] as const;

type PrefKey = (typeof PREF_KEYS)[number];

function readPrefs(): UserPrefs {
  const state = useAetherStore.getState();
  return {
    viewMode: state.viewMode,
    theme: state.theme,
    simulation: state.simulation,
    sound: state.sound,
    orientation: state.orientation,
    mobileTab: state.mobileTab,
    timeframe: state.timeframe,
    activeCardId: state.activeCardId,
  };
}

/** Debounced write-through of UI state into the signed-in user's record. */
export function usePrefsPersistence(): void {
  const authed = useAuthStore((s) => s.status === "authed");
  const values = useAetherStore((state) =>
    PREF_KEYS.map((key) => state[key as PrefKey]).join("|"),
  );
  const timer = useRef<number | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (!authed) return;
    if (first.current) {
      first.current = false;
      return;
    }
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void savePrefs(readPrefs()).catch(() => undefined);
    }, 900);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [authed, values]);

  useEffect(() => {
    const flush = () => {
      if (!useAuthStore.getState().user) return;
      void savePrefs(readPrefs()).catch(() => undefined);
    };
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, []);
}

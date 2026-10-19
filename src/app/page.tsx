"use client";

import { motion } from "framer-motion";
import { AlertOctagon, LogOut, RotateCw, Smartphone, Volume2, Waves } from "lucide-react";
import { useEffect } from "react";
import { AuthScreen } from "@/components/auth/auth-screen";
import { ControlBar } from "@/components/layout/control-bar";
import { EnterpriseShell } from "@/components/layout/enterprise-shell";
import { IPhoneFrame } from "@/components/mobile-frame/iphone-frame";
import { MobileApp } from "@/components/mobile-frame/mobile-app";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/layout/bar-bits";
import { Logo } from "@/components/brand/logo";
import { Panel } from "@/components/ui/panel";
import { Toaster } from "@/components/ui/toaster";
import { useSimulationEngine } from "@/store/useSimulationEngine";
import { useAetherStore } from "@/store/useAetherStore";
import { useAuthStore, usePrefsPersistence } from "@/store/useAuthStore";

function AmbientBackdrop() {
  const theme = useAetherStore((s) => s.theme);
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 ambient-grid opacity-[0.55]" />
      <motion.div
        className="anim-breathe absolute -left-40 -top-40 size-[560px] rounded-full blur-[130px]"
        style={{ background: theme === "dark" ? "rgba(110,86,248,0.22)" : "rgba(110,86,248,0.14)" }}
      />
      <motion.div
        className="anim-breathe absolute -right-52 top-1/3 size-[620px] rounded-full blur-[140px]"
        style={{
          background: theme === "dark" ? "rgba(49,225,249,0.14)" : "rgba(49,225,249,0.16)",
          animationDelay: "2.4s",
        }}
      />
      <motion.div
        className="anim-breathe absolute bottom-[-220px] left-1/3 size-[520px] rounded-full blur-[130px]"
        style={{
          background: theme === "dark" ? "rgba(184,255,60,0.08)" : "rgba(75,52,224,0.08)",
          animationDelay: "4.8s",
        }}
      />
    </div>
  );
}

function DeviceStage() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const orientation = useAetherStore((s) => s.orientation);
  const setOrientation = useAetherStore((s) => s.setOrientation);
  const island = useAetherStore((s) => s.island);
  const simulation = useAetherStore((s) => s.simulation);
  const sound = useAetherStore((s) => s.sound);
  const mobileTab = useAetherStore((s) => s.mobileTab);
  const events = useAetherStore((s) => s.events);

  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1400px] flex-col items-center gap-6 px-4 pb-36 pt-8 lg:flex-row lg:items-start lg:justify-center lg:gap-10 lg:pt-14">
      <div className="shrink-0">
        <IPhoneFrame>
          <MobileApp />
        </IPhoneFrame>
      </div>

      <div className="w-full max-w-[380px] space-y-4">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dim">
                native mockup view
              </p>
              <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.035em] text-ink">
                iPhone 16 Pro chassis
              </h1>
            </div>
            <Button
              size="xs"
              variant="outline"
              icon={<LogOut className="size-3.5" />}
              onClick={() => void signOut()}
            >
              Sign out
            </Button>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
            Signed in as <span className="text-ink">{user?.displayName}</span> · the full treasury
            OS re-rendered at 390×844 pt with iOS spring physics, Dynamic Island live activities,
            pull-to-refresh haptics and a slide-to-confirm payment rail.
          </p>
        </div>

        <Panel eyebrow="device telemetry" title="Mockup State" depth={1}>
          <dl className="space-y-2.5 text-[12px]">
            <Row label="Orientation" value={orientation} />
            <Row label="Active tab" value={mobileTab} />
            <Row label="Dynamic Island" value={island.expanded ? `expanded · ${island.payload.kind}` : "compact"} />
            <Row label="Simulation" value={simulation ? "streaming" : "paused"} />
            <Row label="Audio cues" value={sound ? "enabled" : "muted"} />
            <Row label="Events received" value={String(events.length)} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="xs"
              variant="outline"
              icon={<RotateCw className="size-3.5" />}
              onClick={() => setOrientation(orientation === "portrait" ? "landscape" : "portrait")}
            >
              Rotate device
            </Button>
            <Button size="xs" variant="ghost" icon={<Smartphone className="size-3.5" />}>
              Swipe up home bar
            </Button>
          </div>
        </Panel>

        <Panel eyebrow="interaction map" title="Gestures" depth={2}>
          <ul className="space-y-2 text-[11.5px] text-muted">
            <Gesture icon={<Waves className="size-3.5" />} text="Pull down from the top of any tab to refresh the ledger." />
            <Gesture icon={<Volume2 className="size-3.5" />} text="Slide-to-pay knob releases a live authorisation with haptics." />
            <Gesture icon={<RotateCw className="size-3.5" />} text="Tap the Dynamic Island to dismiss an expanded live activity." />
            <Gesture icon={<Smartphone className="size-3.5" />} text="Drag the home indicator up to return to the Home tab." />
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="accent">spring 420/34</Badge>
            <Badge tone="neutral">haptic 12ms</Badge>
            <Badge tone="signal">gpu composited</Badge>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-[var(--line)] pb-2 last:border-0">
      <dt className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-dim">{label}</dt>
      <dd className="numeric truncate text-right text-[12px] text-ink">{value}</dd>
    </div>
  );
}

function Gesture({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-accent">{icon}</span>
      <span className="leading-relaxed">{text}</span>
    </li>
  );
}

function BootError() {
  const error = useAetherStore((s) => s.error);
  const hydrate = useAetherStore((s) => s.hydrate);
  const signOut = useAuthStore((s) => s.signOut);
  return (
    <div className="relative z-10 grid min-h-screen place-items-center px-6">
      <div className="glass w-full max-w-md rounded-3xl p-7 text-center">
        <AlertOctagon className="mx-auto size-7 text-[color:var(--negative)]" aria-hidden />
        <h2 className="mt-3 text-[17px] font-semibold tracking-[-0.02em] text-ink">
          Treasury core unreachable
        </h2>
        <p className="mt-2 text-[12px] leading-relaxed text-muted">
          {error ?? "The portfolio API did not respond. Verify PostgreSQL is running and retry."}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={() => void hydrate()}>Retry connection</Button>
          <Button variant="outline" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}

function BootSplash() {
  return (
    <div className="relative z-10 grid min-h-screen place-items-center px-6">
      <div className="flex flex-col items-center gap-4">
        <Logo size={52} showWordmark={false} />
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-dim">
          verifying session
        </p>
        <span className="h-0.5 w-40 overflow-hidden rounded-full bg-[var(--surface-3)]">
          <motion.span
            className="block h-full w-1/3 rounded-full bg-accent"
            animate={{ x: ["-100%", "300%"] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>
      </div>
    </div>
  );
}

export default function AetherPage() {
  const theme = useAetherStore((s) => s.theme);
  const viewMode = useAetherStore((s) => s.viewMode);
  const status = useAetherStore((s) => s.status);
  const hydrate = useAetherStore((s) => s.hydrate);
  const setViewMode = useAetherStore((s) => s.setViewMode);
  const toggleTheme = useAetherStore((s) => s.toggleTheme);
  const setSimulation = useAetherStore((s) => s.setSimulation);
  const simulation = useAetherStore((s) => s.simulation);
  const toggleSound = useAetherStore((s) => s.toggleSound);

  const error = useAetherStore((s) => s.error);
  const authStatus = useAuthStore((s) => s.status);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const signOut = useAuthStore((s) => s.signOut);
  const setNotice = useAuthStore((s) => s.setNotice);

  useSimulationEngine();
  usePrefsPersistence();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // Recover from a portfolio fetch failure (e.g. expired session) with a retry.
  useEffect(() => {
    if (authStatus === "authed" && status === "idle") void hydrate();
  }, [authStatus, status, hydrate]);

  // A 401 from the treasury API means the session is gone — fall back to sign-in
  // with an explanation instead of stranding the user on an error screen.
  useEffect(() => {
    if (authStatus !== "authed" || status !== "error") return;
    if (!/unauth/i.test(error ?? "")) return;
    setNotice(
      "Your session could not be verified by the treasury API. Sign in again to reconnect.",
    );
    void signOut();
  }, [authStatus, status, error, setNotice, signOut]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (authStatus !== "authed") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          event.metaKey ||
          event.ctrlKey)
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "v") setViewMode(viewMode === "desktop" ? "mobile" : "desktop");
      if (key === "t") toggleTheme();
      if (key === "l") setSimulation(!simulation);
      if (key === "m") toggleSound();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [authStatus, viewMode, simulation, setViewMode, toggleTheme, setSimulation, toggleSound]);

  return (
    <>
      <AmbientBackdrop />
      {authStatus === "checking" ? (
        <BootSplash />
      ) : authStatus === "anonymous" ? (
        <AuthScreen />
      ) : status === "error" ? (
        <BootError />
      ) : viewMode === "desktop" ? (
        <div className="relative z-10">
          <EnterpriseShell />
        </div>
      ) : (
        <DeviceStage />
      )}
      {authStatus === "authed" && <ControlBar />}
      <Toaster />
    </>
  );
}

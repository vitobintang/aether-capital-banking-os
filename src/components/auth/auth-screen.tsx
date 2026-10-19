"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CircleUserRound,
  Database,
  Fingerprint,
  KeyRound,
  Lock,
  LogIn,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/controls";
import { Badge } from "@/components/layout/bar-bits";
import { Logo } from "@/components/brand/logo";
import { DEMO_CREDENTIALS } from "@/lib/credentials";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { useAetherStore } from "@/store/useAetherStore";

type Mode = "login" | "signup";

const HIGHLIGHTS = [
  { label: "multi-currency", text: "5 books · USD, EUR, GBP, BTC, ETH with zero-fee internal conversion" },
  { label: "issuer controls", text: "Freeze, limits and single-use burners written straight to the card core" },
  { label: "fx engine", text: "Live mid-market quotes, spread in bps, SWIFT gpi arrival estimates" },
  { label: "risk model", text: "Every authorisation scored by an explainable fraud model" },
] as const;

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [shake, setShake] = useState(false);

  const status = useAuthStore((s) => s.status);
  const busy = useAuthStore((s) => s.busy);
  const error = useAuthStore((s) => s.error);
  const notice = useAuthStore((s) => s.notice);
  const setNotice = useAuthStore((s) => s.setNotice);
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const clearError = useAuthStore((s) => s.clearError);
  const playSound = useAetherStore((s) => s.playSound);

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (busy) return;
    setNotice(null);
    const ok =
      mode === "login"
        ? await signIn(username, password)
        : await signUp(username, password, displayName.trim() || username);
    if (!ok) {
      setShake(true);
      window.setTimeout(() => setShake(false), 420);
    }
  };

  const useDemo = async () => {
    setMode("login");
    setUsername(DEMO_CREDENTIALS.username);
    setPassword(DEMO_CREDENTIALS.password);
    clearError();
    playSound("tap");
    await signIn(DEMO_CREDENTIALS.username, DEMO_CREDENTIALS.password);
  };

  return (
    <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1240px] items-center gap-10 px-5 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-16">
      {/* ------------------------------ brand rail ------------------------------ */}
      <div className="max-w-xl">
        <Logo size={44} />
        <h1 className="mt-7 text-[clamp(2rem,4.6vw,3.1rem)] font-semibold leading-[1.03] tracking-[-0.045em] text-ink">
          The treasury operating
          <br />
          system for people who
          <br />
          <span className="text-accent">hate waiting on banks.</span>
        </h1>
        <p className="mt-5 max-w-lg text-[13.5px] leading-relaxed text-muted">
          Sign in to a fully provisioned workspace: multi-currency books, physical and virtual
          cards, a cross-border wire engine, and a fraud model that never sleeps. Every change you
          make is written back to Postgres against your account.
        </p>

        <ul className="mt-8 space-y-3">
          {HIGHLIGHTS.map((item, index) => (
            <motion.li
              key={item.label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.06, type: "spring", stiffness: 240, damping: 26 }}
              className="flex items-start gap-3"
            >
              <span className="mt-[3px] grid size-4 shrink-0 place-items-center rounded-[5px] bg-accent-soft">
                <span className="size-1.5 rounded-full bg-accent" />
              </span>
              <span className="min-w-0 text-[12.5px] leading-relaxed text-muted">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">
                  {item.label}
                </span>
                <span className="mt-0.5 block text-ink">{item.text}</span>
              </span>
            </motion.li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <Badge tone="accent">
            <Database className="size-3" /> demo tenant pre-seeded
          </Badge>
          <Badge tone="neutral">
            <Lock className="size-3" /> scrypt + httpOnly sessions
          </Badge>
          <Badge tone="neutral">postgresql · drizzle</Badge>
        </div>
      </div>

      {/* -------------------------------- form --------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        className="glass-strong w-full rounded-3xl p-6 shadow-[0_50px_120px_-40px_rgba(0,0,0,0.9)] sm:p-7"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[17px] font-semibold tracking-[-0.025em] text-ink">
            {mode === "login" ? "Sign in" : "Create your workspace"}
          </h2>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={status}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
            >
              <Badge tone={status === "checking" ? "warning" : "neutral"}>
                {status === "checking" ? "verifying session" : "secure"}
              </Badge>
            </motion.span>
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {notice && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <p className="mt-4 flex items-start gap-2 rounded-xl border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 px-3 py-2.5 text-[11.5px] leading-relaxed text-[color:var(--warning)]">
                <AlertTriangle className="mt-[1px] size-3.5 shrink-0" aria-hidden />
                {notice}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4 inline-flex w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1">
          {(["login", "signup"] as const).map((option) => {
            const active = mode === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setMode(option);
                  clearError();
                  setNotice(null);
                  playSound("tap");
                }}
                aria-pressed={active}
                className={cn(
                  "relative flex h-9 flex-1 items-center justify-center gap-2 rounded-lg text-[12.5px] font-medium transition-colors",
                  active ? "text-[color:var(--accent-ink)]" : "text-muted hover:text-ink",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="auth-mode-pill"
                    transition={{ type: "spring", stiffness: 520, damping: 36 }}
                    className="absolute inset-0 rounded-lg bg-accent"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-2">
                  {option === "login" ? (
                    <LogIn className="size-3.5" />
                  ) : (
                    <UserPlus className="size-3.5" />
                  )}
                  {option === "login" ? "Sign in" : "Sign up"}
                </span>
              </button>
            );
          })}
        </div>

        <motion.form
          onSubmit={(event) => void submit(event)}
          animate={shake ? { x: [0, -9, 8, -5, 3, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-5 space-y-3.5"
          noValidate
        >
          <AnimatePresence initial={false}>
            {mode === "signup" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <Field
                  label="Full name"
                  value={displayName}
                  onChange={setDisplayName}
                  placeholder="Jordan Reyes"
                  autoComplete="name"
                  prefix={<CircleUserRound className="size-4" />}
                  hint="shown on your cards"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <Field
            label="Username"
            value={username}
            onChange={(value) => {
              setUsername(value);
              clearError();
            }}
            placeholder="demo"
            autoComplete="username"
            mono
            prefix={<KeyRound className="size-4" />}
            hint="3–24 chars"
            onEnter={() => void submit()}
          />

          <Field
            label="Password"
            value={password}
            type="password"
            onChange={(value) => {
              setPassword(value);
              clearError();
            }}
            placeholder="••••••••"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            mono
            prefix={<Lock className="size-4" />}
            hint="min 6 chars"
            onEnter={() => void submit()}
          />

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-[color:var(--negative)]/40 bg-[color:var(--negative)]/10 px-3 py-2.5 text-[11.5px] text-[color:var(--negative)]"
            >
              <ShieldCheck className="mt-[1px] size-3.5 shrink-0" aria-hidden />
              {error}
            </p>
          )}

          <Button
            type="submit"
            block
            size="md"
            loading={busy}
            trailing={<ArrowRight className="size-4" />}
          >
            {mode === "login" ? "Sign in to treasury" : "Provision my workspace"}
          </Button>
        </motion.form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-[var(--line)]" />
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-dim">or</span>
          <span className="h-px flex-1 bg-[var(--line)]" />
        </div>

        <Button
          variant="outline"
          block
          onClick={() => void useDemo()}
          disabled={busy}
          icon={<Fingerprint className="size-4" />}
        >
          Enter with the demo account
        </Button>

        <p className="mt-3 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
          <span className="rounded-md border border-[var(--line-strong)] bg-[var(--surface-2)] px-1.5 py-0.5 text-muted">
            {DEMO_CREDENTIALS.username}
          </span>
          /
          <span className="rounded-md border border-[var(--line-strong)] bg-[var(--surface-2)] px-1.5 py-0.5 text-muted">
            {DEMO_CREDENTIALS.password}
          </span>
        </p>

        <p className="mt-5 text-center text-[10.5px] leading-relaxed text-dim">
          Signing up provisions 3 currency books, 2 cards and a starter ledger owned by your user
          id. Preferences — theme, view mode, active card — persist across sessions.
        </p>
      </motion.div>
    </div>
  );
}

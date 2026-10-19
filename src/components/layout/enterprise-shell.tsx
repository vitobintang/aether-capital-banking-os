"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Bell,
  CreditCard,
  Gauge,
  Landmark,
  Radio,
  ScrollText,
  Search,
  ShieldAlert,
  LogOut,
  Snowflake,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Badge, StatusDot } from "@/components/layout/bar-bits";
import { Logo, LogoMark } from "@/components/brand/logo";
import { useAuthStore } from "@/store/useAuthStore";
import { initials } from "@/lib/utils";
import { NetWorthChart } from "@/components/dashboard/net-worth-chart";
import { MarketTicker, WealthDashboard } from "@/components/dashboard/wealth-dashboard";
import { FraudAlert } from "@/components/dashboard/fraud-alert";
import { SpendingAnalytics } from "@/components/dashboard/spending-analytics";
import { TransactionLedger } from "@/components/dashboard/transaction-ledger";
import { CardWallet } from "@/components/cards/card-wallet";
import { SecurityMatrix } from "@/components/cards/security-matrix";
import { BurnerGenerator } from "@/components/cards/burner-generator";
import { Panel } from "@/components/ui/panel";
import { TransferWizard } from "@/components/transfers/transfer-wizard";
import { formatClock } from "@/lib/format";
import type { LiveEvent } from "@/store/useAetherStore";
import { selectNetWorthUsd, useAetherStore } from "@/store/useAetherStore";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "cards", label: "Cards", icon: CreditCard },
  { id: "risk", label: "Risk", icon: ShieldAlert },
  { id: "analytics", label: "Analytics", icon: Activity },
  { id: "ledger", label: "Ledger", icon: ScrollText },
] as const;

function EventIcon({ type }: { type: LiveEvent["type"] }) {
  switch (type) {
    case "price":
      return <Radio className="size-3" />;
    case "incoming":
      return <Landmark className="size-3" />;
    case "fraud":
      return <ShieldAlert className="size-3" />;
    case "freeze":
      return <Snowflake className="size-3" />;
    case "wire":
      return <ScrollText className="size-3" />;
    default:
      return <CreditCard className="size-3" />;
  }
}

function LiveEventStream() {
  const events = useAetherStore((s) => s.events);
  const simulation = useAetherStore((s) => s.simulation);

  return (
    <Panel
      depth={3}
      eyebrow="Instrument bus · simulated socket"
      title="Live Event Stream"
      subtitle={simulation ? "Streaming ticks, authorisations and detections" : "Feed paused"}
      actions={
        <Badge tone={simulation ? "positive" : "neutral"}>
          <StatusDot tone={simulation ? "positive" : "neutral"} pulse={simulation} />
          {simulation ? "ws://live" : "idle"}
        </Badge>
      }
      bodyClassName="p-0"
      className="h-full"
    >
      <div className="h-[300px] overflow-y-auto px-3 py-3">
        {events.length === 0 ? (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <Radio className="mx-auto size-5 text-dim" aria-hidden />
              <p className="mt-2 text-[12px] font-medium text-ink">Awaiting first tick</p>
              <p className="mt-1 text-[11px] text-muted">
                Enable the live simulation engine to stream market ticks, card authorisations and
                fraud detections into this bus.
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <ul className="space-y-1">
              {events.map((event) => (
                <motion.li
                  key={event.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className={cn(
                    "flex items-start gap-2.5 rounded-lg border border-transparent px-2 py-1.5 transition-colors hover:border-[var(--line)] hover:bg-[var(--surface-2)]",
                    event.type === "fraud" && "text-[color:var(--negative)]",
                    event.type === "incoming" && "text-[color:var(--positive)]",
                    event.type === "price" && "text-muted",
                  )}
                >
                  <span className="mt-[3px] shrink-0">
                    <EventIcon type={event.type} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] text-ink">{event.message}</span>
                    <span className="numeric mt-0.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-dim">
                      {event.type} · {formatClock(event.ts)}
                    </span>
                  </span>
                </motion.li>
              ))}
            </ul>
          </AnimatePresence>
        )}
      </div>
    </Panel>
  );
}

function Sidebar({
  active,
  onNavigate,
}: {
  active: string;
  onNavigate: (id: string) => void;
}) {
  const netWorth = useAetherStore(selectNetWorthUsd);
  const alerts = useAetherStore((s) => s.alerts);
  const openAlerts = alerts.filter((a) => !a.resolved).length;
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const displayName = user?.displayName ?? "Treasury";
  const username = user?.username ?? "guest";

  return (
    <aside className="sticky top-0 z-40 hidden h-screen w-[74px] shrink-0 flex-col items-center gap-2 border-r border-[var(--line)] bg-[var(--canvas-raised)] py-5 lg:flex xl:w-[212px] xl:items-stretch xl:px-4">
      <div className="flex items-center px-1 xl:px-2">
        <span className="xl:hidden">
          <LogoMark size={36} />
        </span>
        <span className="hidden xl:block">
          <Logo size={36} />
        </span>
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-1" aria-label="Modules">
        {SECTIONS.map((section) => {
          const isActive = active === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onNavigate(section.id)}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors xl:px-3",
                isActive ? "text-ink" : "text-muted hover:bg-[var(--surface-2)] hover:text-ink",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="nav-active"
                  transition={{ type: "spring", stiffness: 460, damping: 36 }}
                  className="absolute inset-0 rounded-xl border border-[var(--line-strong)] bg-[var(--surface-2)]"
                />
              )}
              <section.icon className={cn("relative size-4 shrink-0", isActive && "text-accent")} aria-hidden />
              <span className="relative hidden truncate text-[12.5px] font-medium xl:block">
                {section.label}
              </span>
              {section.id === "risk" && openAlerts > 0 && (
                <span className="numeric relative ml-auto hidden rounded-md bg-[color:var(--negative)]/15 px-1.5 py-0.5 text-[9.5px] font-semibold text-[color:var(--negative)] xl:block">
                  {openAlerts}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 xl:block">
        <p className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-dim">consolidated</p>
        <p className="numeric mt-1 truncate text-[15px] font-semibold text-ink">
          ${(netWorth / 1_000_000).toFixed(2)}M
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <StatusDot tone="positive" />
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
            all rails nominal
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 px-1 xl:px-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(140deg,var(--accent),var(--signal))] font-mono text-[11px] font-bold text-white">
          {initials(displayName || username)}
        </span>
        <span className="hidden min-w-0 flex-1 xl:block">
          <span className="block truncate text-[12px] font-medium text-ink">{displayName}</span>
          <span className="block truncate font-mono text-[9px] uppercase tracking-[0.14em] text-dim">
            @{username}
          </span>
        </span>
        <span className="hidden xl:block">
          <IconButton label="Sign out" size="sm" onClick={() => void signOut()}>
            <LogOut className="size-3.5" />
          </IconButton>
        </span>
        <span className="xl:hidden">
          <IconButton label="Sign out" size="sm" onClick={() => void signOut()}>
            <LogOut className="size-3.5" />
          </IconButton>
        </span>
      </div>
    </aside>
  );
}

export function EnterpriseShell() {
  const [active, setActive] = useState<string>("overview");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [query, setQuery] = useState("");
  const setFilters = useAetherStore((s) => s.setFilters);
  const alerts = useAetherStore((s) => s.alerts);
  const openAlerts = alerts.filter((a) => !a.resolved).length;

  const navigate = useCallback((id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const submitSearch = () => {
    setFilters({ query });
    navigate("ledger");
  };

  return (
    <div className="flex min-h-screen bg-[var(--canvas)]">
      <Sidebar active={active} onNavigate={navigate} />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--canvas)_78%,transparent)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
            <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
              <LogoMark size={32} />
              <span className="text-[13px] font-semibold tracking-[-0.03em] text-ink">AETHER</span>
            </div>

            <div className="relative min-w-0 flex-1 lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-dim" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitSearch();
                }}
                placeholder="Search 1,200+ ledger rows, merchants, references…"
                aria-label="Global ledger search"
                className="h-9 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] pl-9 pr-3 text-[12px] text-ink outline-none transition-colors placeholder:text-dim focus:border-accent"
              />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Badge tone="accent">treasury os v4.2</Badge>
              <IconButton label="Alerts" size="sm" active={openAlerts > 0}>
                <Bell className="size-3.5" />
              </IconButton>
              <Button size="sm" icon={<ScrollText className="size-4" />} onClick={() => setWizardOpen(true)}>
                New wire
              </Button>
            </div>
          </div>
          <MarketTicker />
        </header>

        <main className="ambient-grid px-4 pb-32 pt-5 lg:px-6">
          <div className="mx-auto max-w-[1600px] space-y-5">
            <section id="overview" className="scroll-mt-32 grid gap-5 xl:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)]">
              <NetWorthChart />
              <WealthDashboard onTransfer={() => setWizardOpen(true)} onSwap={() => setWizardOpen(true)} />
            </section>

            <section id="cards" className="scroll-mt-32 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              <CardWallet />
              <SecurityMatrix />
            </section>

            <section id="risk" className="scroll-mt-32 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <FraudAlert />
              <LiveEventStream />
            </section>

            <section id="analytics" className="scroll-mt-32 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              <SpendingAnalytics />
              <BurnerGenerator />
            </section>

            <section id="ledger" className="scroll-mt-32">
              <TransactionLedger />
            </section>

            <footer className="flex flex-wrap items-center justify-between gap-3 pt-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-dim">
              <span>aether // capital · institutional treasury operating system</span>
              <span>postgresql · drizzle orm · next.js app router · framer motion</span>
            </footer>
          </div>
        </main>
      </div>

      <TransferWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}

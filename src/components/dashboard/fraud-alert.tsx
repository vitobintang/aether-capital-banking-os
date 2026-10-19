"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Cpu,
  Fingerprint,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Snowflake,
  Activity,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Badge, ProgressRing, StatusDot } from "@/components/ui/feedback";
import { formatCoordinates } from "@/lib/format";
import type { SecurityAlert } from "@/lib/types";
import { cn, distanceKm, relativeTime } from "@/lib/utils";
import { useAetherStore } from "@/store/useAetherStore";

const HQ = { lat: 37.7749, lng: -122.4194, city: "San Francisco", country: "US", countryCode: "US" };

function ModelTelemetry({ confidence }: { confidence: number }) {
  const bars = useMemo(
    () => Array.from({ length: 22 }, (_, i) => 18 + Math.abs(Math.sin(i * 1.7 + confidence)) * 82),
    [confidence],
  );
  return (
    <div className="flex h-9 items-end gap-[3px]" aria-hidden>
      {bars.map((height, index) => (
        <motion.span
          key={index}
          className="w-[3px] rounded-sm bg-gradient-to-t from-[color:var(--negative)] to-[color:var(--warning)]"
          animate={{ height: `${height}%`, opacity: [0.35, 0.95, 0.35] }}
          transition={{
            height: { type: "spring", stiffness: 180, damping: 18 },
            opacity: { duration: 1.6 + (index % 5) * 0.16, repeat: Infinity, ease: "easeInOut" },
          }}
        />
      ))}
    </div>
  );
}

function AlertCard({ alert, index }: { alert: SecurityAlert; index: number }) {
  const resolve = useAetherStore((s) => s.resolveAlertById);
  const playSound = useAetherStore((s) => s.playSound);
  const expandIsland = useAetherStore((s) => s.expandIsland);
  const updateCardControls = useAetherStore((s) => s.updateCardControls);
  const pushToast = useAetherStore((s) => s.pushToast);
  const cards = useAetherStore((s) => s.cards);
  const activeCardId = useAetherStore((s) => s.activeCardId);
  const [freezing, setFreezing] = useState(false);

  const targetCard =
    cards.find((card) => card.id === activeCardId) ??
    cards.find((card) => !card.isVirtual) ??
    cards[0];
  const drift = distanceKm(HQ, alert.geo);
  const critical = alert.severity === "critical" || alert.confidence >= 88;

  const blockAndFreeze = async () => {
    if (!targetCard) {
      pushToast({
        title: "No instrument available",
        body: "Issue a card before blocking this transaction.",
        tone: "warning",
      });
      resolve(alert.id);
      return;
    }
    setFreezing(true);
    playSound("freeze", [24, 40, 24]);
    await updateCardControls(targetCard.id, { frozen: true, internationalEnabled: false });
    resolve(alert.id);
    pushToast({
      title: "Card frozen · transaction blocked",
      body: `${targetCard.label} •••• ${targetCard.last4} frozen. ${alert.title} marked as mitigated.`,
      tone: "warning",
      ttl: 5600,
    });
    expandIsland(
      { kind: "frozen", title: "Card frozen", detail: `${targetCard.label} •••• ${targetCard.last4}` },
      5000,
    );
    setFreezing(false);
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -24, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 320, damping: 30, delay: index * 0.05 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4",
        critical
          ? "border-[color:var(--negative)]/45 bg-[color:var(--negative)]/[0.07]"
          : "border-[color:var(--warning)]/35 bg-[color:var(--warning)]/[0.05]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-[2px]",
          critical ? "bg-[color:var(--negative)]" : "bg-[color:var(--warning)]",
        )}
      />
      <div className="flex items-start gap-4">
        <ProgressRing
          value={alert.confidence}
          size={64}
          stroke={5}
          color={critical ? "var(--negative)" : "var(--warning)"}
          label={`Model confidence ${alert.confidence} percent`}
        >
          <span className="numeric text-[13px] font-semibold text-ink">{alert.confidence}%</span>
        </ProgressRing>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={critical ? "negative" : "warning"} icon={<ShieldAlert className="size-3" />}>
              {alert.severity}
            </Badge>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-dim">
              risk score · auto-flagged
            </span>
          </div>
          <h4 className="mt-1.5 text-[14px] font-semibold tracking-[-0.01em] text-ink">
            {alert.title}
          </h4>
          <p className="mt-0.5 text-[12px] text-muted">{alert.detail}</p>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] sm:grid-cols-3">
            <div className="min-w-0">
              <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-dim">Origin</dt>
              <dd className="mt-0.5 flex items-center gap-1 truncate text-ink">
                <MapPin className="size-3 shrink-0 text-muted" />
                {alert.geo.city}, {alert.geo.countryCode}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-dim">Drift</dt>
              <dd className="numeric mt-0.5 text-ink">
                {drift.toLocaleString("en-US")} km from HQ
              </dd>
            </div>
            <div className="min-w-0 col-span-2 sm:col-span-1">
              <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-dim">Detected</dt>
              <dd className="mt-0.5 text-ink">{relativeTime(alert.ts)}</dd>
            </div>
          </dl>

          <p className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-2 text-[11px] leading-relaxed text-muted">
            <Cpu className="mt-[1px] size-3.5 shrink-0 text-[color:var(--signal)]" aria-hidden />
            <span>
              <span className="font-semibold text-ink">GBM v7.4 · </span>
              {alert.vector} · {formatCoordinates(alert.geo.lat, alert.geo.lng)}
            </span>
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="xs"
              variant="danger"
              loading={freezing}
              icon={<Snowflake className="size-3.5" />}
              onClick={() => void blockAndFreeze()}
            >
              Block &amp; freeze
            </Button>
            <Button size="xs" variant="outline" icon={<ShieldCheck className="size-3.5" />} onClick={() => resolve(alert.id)}>
              Approve as legitimate
            </Button>
            <Button size="xs" variant="ghost" icon={<Fingerprint className="size-3.5" />}>
              Step-up auth
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-3 border-t border-[var(--line)] pt-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-dim">
            <Activity className="size-3" aria-hidden />
            model inference stream
          </span>
          <span className="numeric text-[10px] text-dim">
            latency {Math.round(11 + (alert.confidence % 9))} ms · 1,284 features
          </span>
        </div>
        <ModelTelemetry confidence={alert.confidence} />
      </div>
    </motion.article>
  );
}

export function FraudAlert() {
  const alerts = useAetherStore((s) => s.alerts);
  const status = useAetherStore((s) => s.status);
  const open = alerts.filter((alert) => !alert.resolved);
  const resolved = alerts.length - open.length;

  return (
    <Panel
      depth={2}
      eyebrow="Anomaly & fraud detection"
      title="Live Risk Engine"
      subtitle={
        status === "ready"
          ? `${open.length} open flag${open.length === 1 ? "" : "s"} · ${resolved} mitigated · model GBM v7.4`
          : "Loading detection models…"
      }
      actions={
        open.length > 0 ? (
          <Badge tone="negative" icon={<StatusDot tone="negative" />}>
            {open.length} open
          </Badge>
        ) : (
          <Badge tone="positive" icon={<StatusDot tone="positive" />}>
            all clear
          </Badge>
        )
      }
      className="min-h-[320px]"
    >
      <div className="space-y-3">
        <AnimatePresence initial={false} mode="popLayout">
          {open.slice(0, 3).map((alert, index) => (
            <AlertCard key={alert.id} alert={alert} index={index} />
          ))}
        </AnimatePresence>

        {open.length === 0 && status === "ready" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid place-items-center rounded-2xl border border-dashed border-[var(--line)] px-6 py-12 text-center"
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-[color:var(--positive)]/12 text-[color:var(--positive)]">
              <ShieldCheck className="size-6" />
            </span>
            <p className="mt-3 text-[14px] font-semibold text-ink">No anomalous activity</p>
            <p className="mt-1 max-w-sm text-[12px] text-muted">
              1,284 behavioural features are being scored on every authorisation. Alerts appear
              here the moment the model exceeds the 70% confidence threshold.
            </p>
          </motion.div>
        )}

        {resolved > 0 && (
          <p className="pt-1 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-dim">
            {resolved} alert{resolved === 1 ? "" : "s"} mitigated · audit trail immutable
          </p>
        )}
      </div>
      <span className="sr-only" aria-live="polite">
        {open.length} open fraud alert{open.length === 1 ? "" : "s"}
        {open[0] ? `, highest confidence ${open[0].confidence} percent in ${open[0].geo.city}` : ""}.
      </span>
    </Panel>
  );
}

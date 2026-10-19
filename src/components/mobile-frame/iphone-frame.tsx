"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";
import { DynamicIsland } from "@/components/mobile-frame/dynamic-island";
import { cn } from "@/lib/utils";
import { useAetherStore } from "@/store/useAetherStore";

const SCREEN_W = 390;
const SCREEN_H = 844;
const BEZEL = 12;

export interface IPhoneFrameProps {
  children: ReactNode;
}

/**
 * Photorealistic iPhone 16 Pro chassis: grade-5 titanium band, quad-corner
 * radius, Dynamic Island cut-out, side buttons, glass reflection and an
 * interactive swipe-up home indicator. Supports portrait ⇄ landscape.
 */
export function IPhoneFrame({ children }: IPhoneFrameProps) {
  const orientation = useAetherStore((s) => s.orientation);
  const setMobileTab = useAetherStore((s) => s.setMobileTab);
  const collapseIsland = useAetherStore((s) => s.collapseIsland);
  const playSound = useAetherStore((s) => s.playSound);
  const landscape = orientation === "landscape";

  const frameW = SCREEN_W + BEZEL * 2;
  const frameH = SCREEN_H + BEZEL * 2;
  const scale = 0.78;
  const wrapperW = (landscape ? frameH : frameW) * scale;
  const wrapperH = (landscape ? frameW : frameH) * scale;

  return (
    <div
      className="relative mx-auto"
      style={{ width: wrapperW, height: wrapperH }}
      aria-label="iPhone 16 Pro device mockup"
    >
      <motion.div
        className="absolute left-1/2 top-1/2"
        animate={{
          x: "-50%",
          y: "-50%",
          rotate: landscape ? 90 : 0,
          scale,
        }}
        transition={{ type: "spring", stiffness: 190, damping: 26 }}
        style={{ width: frameW, height: frameH }}
      >
        {/* side hardware */}
        <span aria-hidden className="absolute -left-[3px] top-[132px] h-8 w-[3px] rounded-l bg-[#4c4f56]" />
        <span aria-hidden className="absolute -left-[3px] top-[186px] h-14 w-[3px] rounded-l bg-[#4c4f56]" />
        <span aria-hidden className="absolute -left-[3px] top-[252px] h-14 w-[3px] rounded-l bg-[#4c4f56]" />
        <span aria-hidden className="absolute -right-[3px] top-[210px] h-20 w-[3px] rounded-r bg-[#4c4f56]" />

        {/* titanium chassis */}
        <div
          className="relative h-full w-full rounded-[58px] p-[12px] shadow-[0_60px_120px_-40px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.09)_inset]"
          style={{
            backgroundImage:
              "linear-gradient(145deg,#7d818a 0%,#2c2f35 14%,#5b5f68 30%,#1c1e22 52%,#6a6e77 74%,#25282d 100%)",
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-[3px] rounded-[55px] ring-1 ring-black/60"
          />
          {/* screen */}
          <div
            className="relative h-full w-full overflow-hidden rounded-[46px] bg-black"
            style={{ width: SCREEN_W, height: SCREEN_H }}
          >
            <DynamicIsland />
            <div className="relative h-full w-full">{children}</div>

            {/* glass reflection */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 z-30 rounded-[46px] bg-[linear-gradient(128deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.03)_18%,transparent_38%,transparent_72%,rgba(255,255,255,0.05)_100%)]"
            />

            {/* home indicator — swipe up to return home */}
            <motion.button
              type="button"
              aria-label="Home indicator — swipe up to return to the home tab"
              drag="y"
              dragConstraints={{ top: -26, bottom: 0 }}
              dragElastic={0.4}
              onDragEnd={(_, info) => {
                if (info.offset.y < -18 || info.velocity.y < -220) {
                  setMobileTab("home");
                  collapseIsland();
                  playSound("whoosh", [8, 12]);
                }
              }}
              className="absolute bottom-2 left-1/2 z-40 h-6 w-40 -translate-x-1/2 cursor-grab rounded-full"
            >
              <span className="absolute bottom-1.5 left-1/2 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-white/85 transition-colors hover:bg-white" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      <p
        className={cn(
          "mt-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-dim",
          landscape && "mt-2",
        )}
      >
        iphone 16 pro · {landscape ? "landscape" : "portrait"} · 390×844 pt
      </p>
    </div>
  );
}

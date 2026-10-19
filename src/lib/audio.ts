/**
 * Web Audio API sound-design layer.
 * All cues are synthesised — zero asset payload, no autoplay violations.
 * The AudioContext is created lazily on the first user gesture.
 */

export type SoundCue =
  | "tap"
  | "hover"
  | "confirm"
  | "reject"
  | "cash"
  | "freeze"
  | "scan"
  | "whoosh"
  | "alert";

interface OscSpec {
  type: OscillatorType;
  freq: number;
  toFreq?: number;
  gain: number;
  duration: number;
  delay?: number;
}

const CUES: Record<SoundCue, OscSpec[]> = {
  tap: [{ type: "sine", freq: 1180, gain: 0.045, duration: 0.05 }],
  hover: [{ type: "sine", freq: 760, gain: 0.018, duration: 0.035 }],
  confirm: [
    { type: "triangle", freq: 660, gain: 0.06, duration: 0.09 },
    { type: "triangle", freq: 990, gain: 0.05, duration: 0.13, delay: 0.07 },
    { type: "sine", freq: 1320, gain: 0.035, duration: 0.18, delay: 0.14 },
  ],
  reject: [
    { type: "sawtooth", freq: 220, toFreq: 120, gain: 0.05, duration: 0.22 },
  ],
  cash: [
    { type: "sine", freq: 880, gain: 0.05, duration: 0.08 },
    { type: "sine", freq: 1174, gain: 0.045, duration: 0.1, delay: 0.06 },
    { type: "sine", freq: 1568, gain: 0.04, duration: 0.16, delay: 0.12 },
  ],
  freeze: [
    { type: "sine", freq: 2400, toFreq: 420, gain: 0.05, duration: 0.42 },
    { type: "triangle", freq: 180, gain: 0.03, duration: 0.3, delay: 0.05 },
  ],
  scan: [
    { type: "sine", freq: 420, toFreq: 1600, gain: 0.035, duration: 0.7 },
  ],
  whoosh: [{ type: "sine", freq: 300, toFreq: 900, gain: 0.028, duration: 0.18 }],
  alert: [
    { type: "square", freq: 520, gain: 0.03, duration: 0.09 },
    { type: "square", freq: 400, gain: 0.03, duration: 0.11, delay: 0.11 },
  ],
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private volume = 0.9;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(
        enabled ? this.volume : 0,
        this.ctx.currentTime,
        0.02,
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? this.volume : 0;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  play(cue: SoundCue): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const specs = CUES[cue];
    specs.forEach((spec) => {
      const start = ctx.currentTime + (spec.delay ?? 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = spec.type;
      osc.frequency.setValueAtTime(spec.freq, start);
      if (spec.toFreq !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(40, spec.toFreq),
          start + spec.duration,
        );
      }
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(spec.gain, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + spec.duration);
      osc.connect(gain);
      gain.connect(this.master!);
      osc.start(start);
      osc.stop(start + spec.duration + 0.05);
    });
  }

  /** Hardware haptics where supported (mobile mockup view). */
  haptic(pattern: number | number[] = 12): void {
    if (typeof navigator === "undefined") return;
    const vibrate = (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean })
      .vibrate;
    if (typeof vibrate === "function") vibrate(pattern);
  }
}

export const audio = new AudioEngine();

export function playCue(cue: SoundCue, haptic?: number | number[]): void {
  audio.play(cue);
  if (haptic !== undefined) audio.haptic(haptic);
}

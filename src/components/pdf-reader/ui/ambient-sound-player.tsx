"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CloudRain, Flame, Volume2, VolumeX, Waves, Wind } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export type AmbientSoundType = "none" | "rain" | "waves" | "fireplace" | "whitenoise";

const AMBIENT_PRESETS = [
  { id: "none" as const, label: "Silêncio (Desligado)", icon: VolumeX },
  { id: "rain" as const, label: "Chuva Suave", icon: CloudRain },
  { id: "waves" as const, label: "Ondas do Mar", icon: Waves },
  { id: "fireplace" as const, label: "Lareira & Café", icon: Flame },
  { id: "whitenoise" as const, label: "Ruído de Foco", icon: Wind },
];

export function AmbientSoundPlayer() {
  const [currentSound, setCurrentSound] = useState<AmbientSoundType>("none");
  const [volume, setVolume] = useState(0.4);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<AudioNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const timerRef = useRef<number | null>(null);

  const stopAudio = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        // Stop if buffer source
        if ("stop" in sourceNodeRef.current && typeof sourceNodeRef.current.stop === "function") {
          sourceNodeRef.current.stop();
        }
        sourceNodeRef.current.disconnect();
      } catch {}
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startSound = useCallback(
    (type: AmbientSoundType) => {
      stopAudio();
      if (type === "none") {
        setCurrentSound("none");
        return;
      }

      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioContextClass();
      } else if (audioCtxRef.current.state === "suspended") {
        void audioCtxRef.current.resume();
      }

      const ctx = audioCtxRef.current;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
      gainNode.connect(ctx.destination);
      gainNodeRef.current = gainNode;

      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Generate pink/brown noise algorithm
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11;
        b6 = white * 0.115926;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filterNodeRef.current = filter;

      if (type === "rain") {
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1000, ctx.currentTime);
      } else if (type === "waves") {
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(450, ctx.currentTime);
        filter.Q.setValueAtTime(1.5, ctx.currentTime);

        // LFO for wave swelling
        let wavePhase = 0;
        timerRef.current = window.setInterval(() => {
          wavePhase += 0.05;
          const currentGain = (Math.sin(wavePhase) + 1) * 0.5 * (volume * 0.18);
          if (gainNodeRef.current && ctx.state === "running") {
            gainNodeRef.current.gain.setTargetAtTime(currentGain, ctx.currentTime, 0.2);
          }
        }, 100);
      } else if (type === "fireplace") {
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(600, ctx.currentTime);
      } else if (type === "whitenoise") {
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(2500, ctx.currentTime);
      }

      whiteNoise.connect(filter);
      filter.connect(gainNode);
      whiteNoise.start(0);

      sourceNodeRef.current = whiteNoise;
      setCurrentSound(type);
      setIsPlaying(true);
    },
    [volume, stopAudio]
  );

  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(volume * 0.15, audioCtxRef.current.currentTime);
    }
  }, [volume]);

  useEffect(() => {
    return () => {
      stopAudio();
      if (audioCtxRef.current) {
        void audioCtxRef.current.close();
      }
    };
  }, [stopAudio]);

  const activePreset = AMBIENT_PRESETS.find((p) => p.id === currentSound) ?? AMBIENT_PRESETS[0];
  const Icon = activePreset.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={`Som Ambiente: ${activePreset.label}`}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all shadow-sm",
            isPlaying
              ? "bg-accent text-accent-foreground ring-2 ring-accent/30"
              : "bg-background/80 text-foreground/80 hover:bg-secondary hover:text-foreground border border-border"
          )}
        >
          <Icon className="size-3.5" />
          <span className="hidden sm:inline">
            {isPlaying ? activePreset.label : "Sons de Foco"}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 p-2 glass-panel">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Atmosfera & Ruído Zen
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {AMBIENT_PRESETS.map((preset) => {
          const ItemIcon = preset.icon;
          const isSelected = currentSound === preset.id;
          return (
            <DropdownMenuItem
              key={preset.id}
              onClick={() => startSound(preset.id)}
              className={cn(
                "flex items-center gap-2.5 cursor-pointer py-2 text-xs rounded-lg font-medium",
                isSelected && "bg-accent/15 text-accent font-semibold"
              )}
            >
              <ItemIcon className={cn("size-4", isSelected ? "text-accent" : "text-muted-foreground")} />
              <span>{preset.label}</span>
            </DropdownMenuItem>
          );
        })}

        {isPlaying && (
          <>
            <DropdownMenuSeparator className="my-2" />
            <div className="px-2 py-1.5 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                <span>Volume Ambiente</span>
                <span>{Math.round(volume * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Volume2 className="size-3.5 text-muted-foreground shrink-0" />
                <Slider
                  value={[volume]}
                  min={0}
                  max={1}
                  step={0.05}
                  onValueChange={(val) => setVolume(val[0])}
                  className="flex-1"
                />
              </div>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

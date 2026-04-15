import { useState, useEffect } from "react";
import {
  useMotionValue,
  useTransform,
  animate,
  motion,
  AnimatePresence,
} from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, X } from "lucide-react";
import type { Profile } from "@/lib/data";

type Action = "none" | "yes" | "no";
type Phase = "rope" | "snap-flash" | "broken" | "connected" | "hidden";

/**
 * Rope visual — hangs between the card and buttons.
 *
 * Rope path: M 50 0 Q cx 40 50 80 (quadratic bezier, viewBox 0 0 100 80)
 * Midpoint at t=0.5 when cx=4 (max stretch):
 *   x = 0.25*50 + 0.5*4 + 0.25*50 = 27
 *   y = 0.25*0  + 0.5*40 + 0.25*80 = 40
 * Sub-beziers (de Casteljau at t=0.5):
 *   Top half:    M 50 0  Q 27 20 27 40
 *   Bottom half: M 27 40 Q 27 60 50 80
 */
const BREAK_X = 27;
const BREAK_Y = 40;

const FIBERS = [
  { angle: -75, len: 10 },
  { angle: -50, len: 13 },
  { angle: -25, len: 9 },
  { angle:   0, len: 12 },
  { angle:  25, len: 11 },
  { angle:  50, len: 13 },
  { angle:  75, len: 9  },
  { angle: 110, len: 10 },
  { angle:-110, len: 11 },
];

function RopeStrands({
  d,
  isYes,
}: {
  d: string | ReturnType<typeof useTransform>;
  isYes?: boolean;
}) {
  return (
    <>
      {/* Shadow / depth layer */}
      <motion.path
        d={d as unknown as string}
        stroke="#3A2008"
        strokeWidth={7}
        fill="none"
        strokeLinecap="round"
      />
      {/* Main rope body */}
      <motion.path
        d={d as unknown as string}
        stroke={isYes ? "#c0392b" : "#8B5E1A"}
        strokeWidth={5}
        fill="none"
        strokeLinecap="round"
        style={{
          filter: isYes
            ? "drop-shadow(0 0 6px rgba(244,63,94,0.8))"
            : "none",
        }}
      />
      {/* Lighter twist strand — one side of braid */}
      <motion.path
        d={d as unknown as string}
        stroke={isYes ? "#ff8fa3" : "#C9952E"}
        strokeWidth={2}
        strokeDasharray="5 6"
        strokeDashoffset={0}
        fill="none"
        strokeLinecap="round"
        style={{ opacity: 0.8 }}
      />
      {/* Darker twist strand — other side of braid */}
      <motion.path
        d={d as unknown as string}
        stroke="#4A2E08"
        strokeWidth={1.5}
        strokeDasharray="5 6"
        strokeDashoffset={5}
        fill="none"
        strokeLinecap="round"
        style={{ opacity: 0.6 }}
      />
    </>
  );
}

function StringVisual({ action }: { action: Action }) {
  const cx = useMotionValue(53);
  const [phase, setPhase] = useState<Phase>("rope");
  const [isYes, setIsYes] = useState(false);

  const mainD = useTransform(
    [cx] as [typeof cx],
    ([x]: [number]) => `M 50 0 Q ${x} 40 50 80`
  );

  useEffect(() => {
    if (action === "no") {
      setPhase("rope");
      setIsYes(false);

      // Stretch the rope hard left
      animate(cx, 4, { duration: 0.26, ease: [0.4, 0, 1, 1] });

      // Flash moment — rope at maximum tension
      const t1 = setTimeout(() => {
        setPhase("snap-flash");
        cx.set(53); // reset cx for next time
      }, 270);

      // Show broken halves
      const t2 = setTimeout(() => setPhase("broken"), 310);

      // All done
      const t3 = setTimeout(() => setPhase("hidden"), 750);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }

    if (action === "yes") {
      setPhase("rope");
      setIsYes(false);
      animate(cx, 50, { duration: 0.2, ease: "easeOut" });
      setTimeout(() => setIsYes(true), 200);
      setTimeout(() => setPhase("hidden"), 560);
    }

    if (action === "none") {
      setPhase("rope");
      setIsYes(false);
      cx.set(53);
    }
  }, [action]);

  if (phase === "hidden") return <div style={{ height: 80 }} />;

  return (
    <div className="flex justify-center" style={{ height: 80 }}>
      <svg
        width="120"
        height="80"
        viewBox="0 0 100 80"
        style={{ overflow: "visible" }}
      >
        <AnimatePresence mode="sync">
          {/* ── Intact rope (idle / stretching / connected) ─────────────── */}
          {(phase === "rope" || phase === "snap-flash") && (
            <motion.g
              key="intact"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.05 }}
            >
              <RopeStrands d={mainD} isYes={isYes} />

              {/* Yes: glowing dot at midpoint */}
              {isYes && (
                <motion.circle
                  cx={50}
                  cy={40}
                  r={6}
                  fill="#f43f5e"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 2, 0], opacity: [0, 1, 0] }}
                  transition={{ duration: 0.45, ease: "easeOut", times: [0, 0.4, 1] }}
                />
              )}
            </motion.g>
          )}

          {/* ── Snap flash: bright burst at break point ──────────────────── */}
          {phase === "snap-flash" && (
            <motion.g key="flash">
              <motion.circle
                cx={BREAK_X}
                cy={BREAK_Y}
                r={3}
                fill="#FFD580"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 4, opacity: 0 }}
                transition={{ duration: 0.12 }}
              />
            </motion.g>
          )}

          {/* ── Broken halves + fibers ───────────────────────────────────── */}
          {phase === "broken" && (
            <motion.g key="broken">
              {/* Top half — recoils up and to the right */}
              <motion.g
                initial={{ x: 0, y: 0 }}
                animate={{ x: 28, y: -26 }}
                transition={{ duration: 0.38, ease: [0.1, 0, 0.6, 1] }}
              >
                <motion.path
                  d="M 50 0 Q 27 20 27 40"
                  stroke="#3A2008"
                  strokeWidth={7}
                  fill="none"
                  strokeLinecap="round"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.38, delay: 0.08 }}
                />
                <motion.path
                  d="M 50 0 Q 27 20 27 40"
                  stroke="#8B5E1A"
                  strokeWidth={5}
                  fill="none"
                  strokeLinecap="round"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.38, delay: 0.08 }}
                />
                <motion.path
                  d="M 50 0 Q 27 20 27 40"
                  stroke="#C9952E"
                  strokeWidth={2}
                  strokeDasharray="5 6"
                  fill="none"
                  strokeLinecap="round"
                  style={{ opacity: 0.8 }}
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.38, delay: 0.08 }}
                />
                {/* Frayed end — a few loose fibers at the break */}
                {[
                  { angle: 20,  len: 8 },
                  { angle: 60,  len: 6 },
                  { angle: 100, len: 9 },
                  { angle: 140, len: 6 },
                ].map(({ angle, len }, i) => {
                  const rad = (angle * Math.PI) / 180;
                  return (
                    <motion.line
                      key={i}
                      x1={BREAK_X} y1={BREAK_Y}
                      x2={BREAK_X + Math.cos(rad) * len}
                      y2={BREAK_Y + Math.sin(rad) * len}
                      stroke={i % 2 === 0 ? "#C9952E" : "#8B5E1A"}
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 0 }}
                      transition={{ duration: 0.32, delay: 0.05 }}
                    />
                  );
                })}
              </motion.g>

              {/* Bottom half — recoils down and to the left */}
              <motion.g
                initial={{ x: 0, y: 0 }}
                animate={{ x: -28, y: 26 }}
                transition={{ duration: 0.38, ease: [0.1, 0, 0.6, 1] }}
              >
                <motion.path
                  d="M 27 40 Q 27 60 50 80"
                  stroke="#3A2008"
                  strokeWidth={7}
                  fill="none"
                  strokeLinecap="round"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.38, delay: 0.08 }}
                />
                <motion.path
                  d="M 27 40 Q 27 60 50 80"
                  stroke="#8B5E1A"
                  strokeWidth={5}
                  fill="none"
                  strokeLinecap="round"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.38, delay: 0.08 }}
                />
                <motion.path
                  d="M 27 40 Q 27 60 50 80"
                  stroke="#C9952E"
                  strokeWidth={2}
                  strokeDasharray="5 6"
                  strokeDashoffset={3}
                  fill="none"
                  strokeLinecap="round"
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.38, delay: 0.08 }}
                />
                {/* Frayed end at the break */}
                {[
                  { angle: -160, len: 8 },
                  { angle: -120, len: 6 },
                  { angle:  -80, len: 9 },
                  { angle:  -40, len: 6 },
                ].map(({ angle, len }, i) => {
                  const rad = (angle * Math.PI) / 180;
                  return (
                    <motion.line
                      key={i}
                      x1={BREAK_X} y1={BREAK_Y}
                      x2={BREAK_X + Math.cos(rad) * len}
                      y2={BREAK_Y + Math.sin(rad) * len}
                      stroke={i % 2 === 0 ? "#C9952E" : "#8B5E1A"}
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 0 }}
                      transition={{ duration: 0.32, delay: 0.05 }}
                    />
                  );
                })}
              </motion.g>

              {/* Radiating fibers at the snap point */}
              {FIBERS.map(({ angle, len }, i) => {
                const rad = (angle * Math.PI) / 180;
                return (
                  <motion.line
                    key={`fiber-${i}`}
                    x1={BREAK_X}
                    y1={BREAK_Y}
                    x2={BREAK_X + Math.cos(rad) * len}
                    y2={BREAK_Y + Math.sin(rad) * len}
                    stroke={i % 3 === 0 ? "#FFD580" : i % 3 === 1 ? "#C9952E" : "#8B5E1A"}
                    strokeWidth={i % 2 === 0 ? 1.5 : 1}
                    strokeLinecap="round"
                    initial={{ scale: 0.1, opacity: 1, originX: `${BREAK_X}px`, originY: `${BREAK_Y}px` }}
                    animate={{ scale: 1, opacity: 0 }}
                    transition={{ duration: 0.28, delay: i * 0.015, ease: "easeOut" }}
                  />
                );
              })}

              {/* Bright burst ring */}
              <motion.circle
                cx={BREAK_X}
                cy={BREAK_Y}
                r={4}
                fill="none"
                stroke="#FFD580"
                strokeWidth={2}
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 3.5, opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              />
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
}

interface SwipeCardProps {
  profile: Profile;
  onSwipe: (direction: "left" | "right") => void;
  locationIcon?: React.ReactNode;
  locationName?: string;
  progress?: string;
}

export function SwipeCard({
  profile,
  onSwipe,
  locationIcon,
  locationName,
  progress,
}: SwipeCardProps) {
  const [action, setAction] = useState<Action>("none");
  const [sliding, setSliding] = useState<"left" | "right" | null>(null);

  function handleSwipe(dir: "left" | "right") {
    if (action !== "none") return;
    const act: Action = dir === "left" ? "no" : "yes";
    setAction(act);
    setTimeout(() => setSliding(dir), 160);
    setTimeout(() => {
      onSwipe(dir);
      setAction("none");
      setSliding(null);
    }, 480);
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {progress && (
        <p className="text-xs text-muted-foreground text-center mb-4 uppercase tracking-wide">
          {progress}
        </p>
      )}

      <div
        className={`transition-all duration-300 ease-out ${
          sliding === "left"
            ? "-translate-x-40 -rotate-12 opacity-0"
            : sliding === "right"
              ? "translate-x-40 rotate-12 opacity-0"
              : ""
        }`}
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary/70 to-primary text-primary-foreground text-2xl font-bold mb-4">
              {profile.avatar}
            </div>
            <h2 className="text-xl font-semibold text-center">
              {profile.name}, {profile.age}
            </h2>
            <p className="text-muted-foreground text-center mt-2 text-sm">
              {profile.bio}
            </p>
            {locationIcon && locationName && (
              <div className="flex items-center justify-center gap-1.5 mt-3">
                {locationIcon}
                <span className="text-xs text-muted-foreground">
                  {locationName}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <StringVisual action={action} />

      <div className="flex justify-center gap-6">
        <Button
          variant="outline"
          size="lg"
          className="rounded-full w-14 h-14 p-0 border-destructive text-destructive hover:bg-destructive/10"
          onClick={() => handleSwipe("left")}
          disabled={action !== "none"}
        >
          <X className="w-6 h-6" />
        </Button>
        <Button
          size="lg"
          className="rounded-full w-14 h-14 p-0 bg-primary hover:bg-primary/90"
          onClick={() => handleSwipe("right")}
          disabled={action !== "none"}
        >
          <Heart className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}

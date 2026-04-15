import { useState, useEffect, useMemo } from "react";
import {
  useMotionValue,
  useTransform,
  animate,
  motion,
  AnimatePresence,
} from "framer-motion";
import { Heart, X, HelpCircle, MapPin } from "lucide-react";
import type { Profile } from "@/lib/data";

type Action = "none" | "yes" | "no" | "maybe";
type Phase = "rope" | "snap-flash" | "broken" | "connected" | "hidden";
type Slide = "left" | "right" | "up" | null;

const BREAK_X = 27;
const BREAK_Y = 40;

const FIBERS = [
  { angle: -75, len: 10 }, { angle: -50, len: 13 }, { angle: -25, len: 9 },
  { angle: 0, len: 12 }, { angle: 25, len: 11 }, { angle: 50, len: 13 },
  { angle: 75, len: 9 }, { angle: 110, len: 10 }, { angle: -110, len: 11 },
];

const CONFETTI_COLORS = [
  "#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#FF6FD8",
  "#FFA552", "#C77DFF", "#000000", "#333333", "#ffffff",
];

function ConfettiBurst() {
  const particles = useMemo(() =>
    Array.from({ length: 48 }, (_, i) => {
      const angle = Math.random() * 2 * Math.PI;
      const speed = 100 + Math.random() * 220;
      const spread = Math.random() < 0.5 ? -1 : 1;
      return {
        id: i,
        x: Math.cos(angle) * speed * (0.6 + Math.random() * 0.8),
        y: -(60 + Math.abs(Math.sin(angle)) * speed + Math.random() * 160),
        rotate: spread * (180 + Math.random() * 360),
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        w: 7 + Math.random() * 9,
        h: 4 + Math.random() * 5,
        delay: Math.random() * 0.08,
        isCircle: i % 5 === 0,
      };
    }), []
  );

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[9998]" aria-hidden>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: "absolute",
            left: "50%",
            top: "42%",
            width: p.isCircle ? p.w : p.w,
            height: p.isCircle ? p.w : p.h,
            backgroundColor: p.color,
            borderRadius: p.isCircle ? "50%" : 2,
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 0.4 }}
          transition={{ duration: 1.1 + Math.random() * 0.3, delay: p.delay, ease: [0.1, 0.6, 0.8, 1] }}
        />
      ))}
    </div>
  );
}

function RopeStrands({ d }: { d: string | ReturnType<typeof useTransform> }) {
  return (
    <>
      <motion.path d={d as unknown as string} stroke="#3A2008" strokeWidth={7} fill="none" strokeLinecap="round" />
      <motion.path d={d as unknown as string} stroke="#8B5E1A" strokeWidth={5} fill="none" strokeLinecap="round" />
      <motion.path d={d as unknown as string} stroke="#C9952E" strokeWidth={2} strokeDasharray="5 6" strokeDashoffset={0} fill="none" strokeLinecap="round" style={{ opacity: 0.8 }} />
      <motion.path d={d as unknown as string} stroke="#4A2E08" strokeWidth={1.5} strokeDasharray="5 6" strokeDashoffset={5} fill="none" strokeLinecap="round" style={{ opacity: 0.6 }} />
    </>
  );
}

function RopeStrandsGlow({ d }: { d: string | ReturnType<typeof useTransform> }) {
  return (
    <>
      <motion.path d={d as unknown as string} stroke="#3A2008" strokeWidth={7} fill="none" strokeLinecap="round" />
      <motion.path d={d as unknown as string} stroke="#c0392b" strokeWidth={5} fill="none" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 6px rgba(244,63,94,0.8))" }} />
      <motion.path d={d as unknown as string} stroke="#ff8fa3" strokeWidth={2} strokeDasharray="5 6" strokeDashoffset={0} fill="none" strokeLinecap="round" style={{ opacity: 0.8 }} />
      <motion.path d={d as unknown as string} stroke="#4A2E08" strokeWidth={1.5} strokeDasharray="5 6" strokeDashoffset={5} fill="none" strokeLinecap="round" style={{ opacity: 0.6 }} />
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
      setPhase("rope"); setIsYes(false);
      animate(cx, 4, { duration: 0.26, ease: [0.4, 0, 1, 1] });
      const t1 = setTimeout(() => { setPhase("snap-flash"); cx.set(53); }, 270);
      const t2 = setTimeout(() => setPhase("broken"), 310);
      const t3 = setTimeout(() => setPhase("hidden"), 750);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
    if (action === "yes") {
      setPhase("rope"); setIsYes(false);
      animate(cx, 50, { duration: 0.2, ease: "easeOut" });
      setTimeout(() => setIsYes(true), 200);
      setTimeout(() => setPhase("hidden"), 560);
    }
    if (action === "maybe") {
      setPhase("rope"); setIsYes(false);
      animate(cx, [53, 75, 31, 68, 38, 58, 48, 53], {
        duration: 0.75,
        times: [0, 0.15, 0.32, 0.48, 0.62, 0.75, 0.88, 1],
        ease: "easeInOut",
      });
      setTimeout(() => setPhase("hidden"), 760);
    }
    if (action === "none") {
      setPhase("rope"); setIsYes(false); cx.set(53);
    }
  }, [action]);

  if (phase === "hidden") return <div style={{ height: 72 }} />;

  return (
    <div className="flex justify-center" style={{ height: 72 }}>
      <svg width="120" height="72" viewBox="0 0 100 80" style={{ overflow: "visible" }}>
        <AnimatePresence mode="sync">
          {(phase === "rope" || phase === "snap-flash") && (
            <motion.g key="intact" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.05 }}>
              {isYes ? <RopeStrandsGlow d={mainD} /> : <RopeStrands d={mainD} />}
              {isYes && (
                <motion.circle cx={50} cy={40} r={6} fill="#f43f5e"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 2, 0], opacity: [0, 1, 0] }}
                  transition={{ duration: 0.45, ease: "easeOut", times: [0, 0.4, 1] }}
                />
              )}
            </motion.g>
          )}

          {phase === "snap-flash" && (
            <motion.g key="flash">
              <motion.circle cx={BREAK_X} cy={BREAK_Y} r={3} fill="#FFD580"
                initial={{ scale: 0, opacity: 1 }} animate={{ scale: 4, opacity: 0 }}
                transition={{ duration: 0.12 }}
              />
            </motion.g>
          )}

          {phase === "broken" && (
            <motion.g key="broken">
              <motion.g initial={{ x: 0, y: 0 }} animate={{ x: 28, y: -26 }} transition={{ duration: 0.38, ease: [0.1, 0, 0.6, 1] }}>
                <motion.path d="M 50 0 Q 27 20 27 40" stroke="#3A2008" strokeWidth={7} fill="none" strokeLinecap="round" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.38, delay: 0.08 }} />
                <motion.path d="M 50 0 Q 27 20 27 40" stroke="#8B5E1A" strokeWidth={5} fill="none" strokeLinecap="round" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.38, delay: 0.08 }} />
                {[{ angle: 20, len: 8 }, { angle: 60, len: 6 }, { angle: 100, len: 9 }, { angle: 140, len: 6 }].map(({ angle, len }, i) => {
                  const rad = (angle * Math.PI) / 180;
                  return <motion.line key={i} x1={BREAK_X} y1={BREAK_Y} x2={BREAK_X + Math.cos(rad) * len} y2={BREAK_Y + Math.sin(rad) * len} stroke={i % 2 === 0 ? "#C9952E" : "#8B5E1A"} strokeWidth={1.5} strokeLinecap="round" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.32, delay: 0.05 }} />;
                })}
              </motion.g>
              <motion.g initial={{ x: 0, y: 0 }} animate={{ x: -28, y: 26 }} transition={{ duration: 0.38, ease: [0.1, 0, 0.6, 1] }}>
                <motion.path d="M 27 40 Q 27 60 50 80" stroke="#3A2008" strokeWidth={7} fill="none" strokeLinecap="round" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.38, delay: 0.08 }} />
                <motion.path d="M 27 40 Q 27 60 50 80" stroke="#8B5E1A" strokeWidth={5} fill="none" strokeLinecap="round" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.38, delay: 0.08 }} />
                {[{ angle: -160, len: 8 }, { angle: -120, len: 6 }, { angle: -80, len: 9 }, { angle: -40, len: 6 }].map(({ angle, len }, i) => {
                  const rad = (angle * Math.PI) / 180;
                  return <motion.line key={i} x1={BREAK_X} y1={BREAK_Y} x2={BREAK_X + Math.cos(rad) * len} y2={BREAK_Y + Math.sin(rad) * len} stroke={i % 2 === 0 ? "#C9952E" : "#8B5E1A"} strokeWidth={1.5} strokeLinecap="round" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.32, delay: 0.05 }} />;
                })}
              </motion.g>
              {FIBERS.map(({ angle, len }, i) => {
                const rad = (angle * Math.PI) / 180;
                return <motion.line key={`fiber-${i}`} x1={BREAK_X} y1={BREAK_Y} x2={BREAK_X + Math.cos(rad) * len} y2={BREAK_Y + Math.sin(rad) * len} stroke={i % 3 === 0 ? "#FFD580" : i % 3 === 1 ? "#C9952E" : "#8B5E1A"} strokeWidth={i % 2 === 0 ? 1.5 : 1} strokeLinecap="round" initial={{ scale: 0.1, opacity: 1, originX: `${BREAK_X}px`, originY: `${BREAK_Y}px` }} animate={{ scale: 1, opacity: 0 }} transition={{ duration: 0.28, delay: i * 0.015, ease: "easeOut" }} />;
              })}
              <motion.circle cx={BREAK_X} cy={BREAK_Y} r={4} fill="none" stroke="#FFD580" strokeWidth={2} initial={{ scale: 0, opacity: 1 }} animate={{ scale: 3.5, opacity: 0 }} transition={{ duration: 0.22, ease: "easeOut" }} />
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
}

interface SwipeCardProps {
  profile: Profile;
  onSwipe: (direction: "left" | "right" | "maybe") => void;
  locationIcon?: React.ReactNode;
  locationName?: string;
  progress?: string;
}

export function SwipeCard({ profile, onSwipe, locationIcon, locationName, progress }: SwipeCardProps) {
  const [action, setAction] = useState<Action>("none");
  const [sliding, setSliding] = useState<Slide>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  function handleAction(dir: "left" | "right" | "maybe") {
    if (action !== "none") return;
    const act: Action = dir === "left" ? "no" : dir === "right" ? "yes" : "maybe";
    setAction(act);

    if (dir === "right") {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1500);
      setTimeout(() => setSliding("right"), 160);
    } else if (dir === "left") {
      setTimeout(() => setSliding("left"), 160);
    } else {
      setTimeout(() => setSliding("up"), 160);
    }

    setTimeout(() => {
      onSwipe(dir);
      setAction("none");
      setSliding(null);
    }, dir === "maybe" ? 780 : 500);
  }

  return (
    <>
      {showConfetti && <ConfettiBurst />}

      <div className="w-full max-w-sm mx-auto">
        {progress && (
          <p className="text-xs text-muted-foreground text-center mb-3 uppercase tracking-wide">
            {progress}
          </p>
        )}

        {/* Card */}
        <div
          className={`transition-all duration-300 ease-out ${
            sliding === "left"
              ? "-translate-x-44 -rotate-12 opacity-0"
              : sliding === "right"
                ? "translate-x-44 rotate-12 opacity-0"
                : sliding === "up"
                  ? "-translate-y-6 scale-95 opacity-0"
                  : ""
          }`}
        >
          <div className="rounded-3xl overflow-hidden shadow-xl" style={{ height: 430 }}>
            {/* Photo area */}
            <div className="relative w-full h-full" style={{ background: profile.gradient }}>
              {/* Large avatar letters as texture */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-9xl font-black text-white/10 select-none tracking-tight">
                  {profile.avatar}
                </span>
              </div>

              {/* Location pill */}
              {locationIcon && locationName && (
                <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full">
                  {locationIcon}
                  <span>{locationName}</span>
                </div>
              )}

              {/* Info overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-5 pt-12 pb-5 text-white">
                <h2 className="text-2xl font-bold leading-tight">
                  {profile.name}, {profile.age}
                </h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-white/60 shrink-0" />
                  <span className="text-sm text-white/70">{profile.distance}</span>
                </div>
                <p className="text-sm text-white/80 mt-2 leading-snug line-clamp-2">
                  {profile.bio}
                </p>
              </div>
            </div>
          </div>
        </div>

        <StringVisual action={action} />

        {/* Three action buttons */}
        <div className="flex justify-center items-center gap-5">
          {/* No */}
          <button
            onClick={() => handleAction("left")}
            disabled={action !== "none"}
            className="w-14 h-14 rounded-full border-2 border-destructive/40 text-destructive hover:bg-destructive/10 active:scale-95 transition-all flex items-center justify-center disabled:opacity-40 shadow-sm"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Maybe */}
          <button
            onClick={() => handleAction("maybe")}
            disabled={action !== "none"}
            className="w-12 h-12 rounded-full border-2 border-amber-400/60 text-amber-500 hover:bg-amber-50 active:scale-95 transition-all flex items-center justify-center disabled:opacity-40 shadow-sm"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {/* Yes */}
          <button
            onClick={() => handleAction("right")}
            disabled={action !== "none"}
            className="w-14 h-14 rounded-full bg-foreground text-background hover:bg-foreground/80 active:scale-95 transition-all flex items-center justify-center disabled:opacity-40 shadow-sm"
          >
            <Heart className="w-6 h-6" />
          </button>
        </div>
      </div>
    </>
  );
}

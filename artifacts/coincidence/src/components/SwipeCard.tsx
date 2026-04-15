import { useState, useEffect, useMemo, useRef } from "react";
import {
  useMotionValue,
  useTransform,
  animate,
  motion,
  AnimatePresence,
  type PanInfo,
  type MotionValue,
} from "framer-motion";
import { Heart, X, HelpCircle, MapPin } from "lucide-react";
import type { Profile } from "@/lib/data";

type Action = "none" | "yes" | "no" | "maybe";
type Phase = "rope" | "snap-flash" | "broken" | "hidden";

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
      return {
        id: i,
        x: Math.cos(angle) * speed * (0.6 + Math.random() * 0.8),
        y: -(60 + Math.abs(Math.sin(angle)) * speed + Math.random() * 160),
        rotate: (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 360),
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
        <motion.div key={p.id}
          style={{ position: "absolute", left: "50%", top: "42%", width: p.w, height: p.isCircle ? p.w : p.h, backgroundColor: p.color, borderRadius: p.isCircle ? "50%" : 2 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 0.4 }}
          transition={{ duration: 1.1 + Math.random() * 0.3, delay: p.delay, ease: [0.1, 0.6, 0.8, 1] }}
        />
      ))}
    </div>
  );
}

function HRopeStrands({ d }: { d: MotionValue<string> }) {
  return (
    <>
      <motion.path d={d as unknown as string} stroke="#3A2008" strokeWidth={7} fill="none" strokeLinecap="round" />
      <motion.path d={d as unknown as string} stroke="#8B5E1A" strokeWidth={5} fill="none" strokeLinecap="round" />
      <motion.path d={d as unknown as string} stroke="#C9952E" strokeWidth={2} strokeDasharray="5 6" fill="none" strokeLinecap="round" style={{ opacity: 0.8 }} />
      <motion.path d={d as unknown as string} stroke="#4A2E08" strokeWidth={1.5} strokeDasharray="5 6" strokeDashoffset={5} fill="none" strokeLinecap="round" style={{ opacity: 0.6 }} />
    </>
  );
}

function HRopeStrandsGlow({ d }: { d: MotionValue<string> }) {
  return (
    <>
      <motion.path d={d as unknown as string} stroke="#3A2008" strokeWidth={7} fill="none" strokeLinecap="round" />
      <motion.path d={d as unknown as string} stroke="#c0392b" strokeWidth={5} fill="none" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 6px rgba(244,63,94,0.8))" }} />
      <motion.path d={d as unknown as string} stroke="#ff8fa3" strokeWidth={2} strokeDasharray="5 6" fill="none" strokeLinecap="round" style={{ opacity: 0.8 }} />
      <motion.path d={d as unknown as string} stroke="#4A2E08" strokeWidth={1.5} strokeDasharray="5 6" strokeDashoffset={5} fill="none" strokeLinecap="round" style={{ opacity: 0.6 }} />
    </>
  );
}

function HStringVisual({
  side,
  action,
  dragX,
}: {
  side: "left" | "right";
  action: Action;
  dragX: MotionValue<number>;
}) {
  const controlY = useMotionValue(56);
  const [phase, setPhase] = useState<Phase>("rope");
  const [isGlowing, setIsGlowing] = useState(false);
  const phaseRef = useRef<Phase>("rope");
  phaseRef.current = phase;

  const pathD = useTransform(controlY, (y) =>
    side === "right"
      ? `M 0 40 Q 60 ${y} 120 40`
      : `M 120 40 Q 60 ${y} 0 40`
  );

  useEffect(() => {
    return dragX.on("change", (x) => {
      if (phaseRef.current !== "rope") return;
      const relevant = side === "right" ? Math.max(0, x) : Math.max(0, -x);
      const tautness = Math.min(relevant / 160, 1);
      controlY.set(56 - tautness * 16);
    });
  }, [side, dragX, controlY]);

  useEffect(() => {
    if (action === "none") {
      setPhase("rope");
      setIsGlowing(false);
      animate(controlY, 56, { type: "spring", stiffness: 200, damping: 22 });
      return;
    }

    if (side === "right" && action === "yes") {
      setPhase("rope");
      animate(controlY, 40, { duration: 0.2 });
      setIsGlowing(true);
      setTimeout(() => setPhase("hidden"), 500);
    }

    if (side === "left" && action === "no") {
      setPhase("rope");
      animate(controlY, 40, { duration: 0.25, ease: [0.4, 0, 1, 1] });
      setTimeout(() => { setPhase("snap-flash"); controlY.set(56); }, 270);
      setTimeout(() => setPhase("broken"), 310);
      setTimeout(() => setPhase("hidden"), 760);
    }

    if (action === "maybe") {
      setPhase("rope");
      animate(controlY, [56, 22, 72, 32, 68, 44, 60, 56], {
        duration: 0.75,
        times: [0, 0.15, 0.32, 0.48, 0.62, 0.75, 0.88, 1],
      });
      setTimeout(() => setPhase("hidden"), 760);
    }
  }, [action]);

  if (phase === "hidden") return <div style={{ width: 120, height: 80, flexShrink: 0 }} />;

  const bx = side === "left" ? 90 : 30;
  const by = 40;

  return (
    <div style={{ width: 120, height: 80, flexShrink: 0 }}>
      <svg width="120" height="80" viewBox="0 0 120 80" style={{ overflow: "visible" }}>
        <AnimatePresence mode="sync">
          {(phase === "rope" || phase === "snap-flash") && (
            <motion.g key="intact" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.05 }}>
              {isGlowing ? <HRopeStrandsGlow d={pathD} /> : <HRopeStrands d={pathD} />}
              {isGlowing && (
                <motion.circle cx={60} cy={40} r={6} fill="#f43f5e"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 2, 0], opacity: [0, 1, 0] }}
                  transition={{ duration: 0.45, ease: "easeOut", times: [0, 0.4, 1] }}
                />
              )}
            </motion.g>
          )}
          {phase === "snap-flash" && (
            <motion.g key="flash">
              <motion.circle cx={bx} cy={by} r={3} fill="#FFD580"
                initial={{ scale: 0, opacity: 1 }} animate={{ scale: 4, opacity: 0 }}
                transition={{ duration: 0.12 }}
              />
            </motion.g>
          )}
          {phase === "broken" && (
            <motion.g key="broken">
              {FIBERS.map(({ angle, len }, i) => {
                const rad = (angle * Math.PI) / 180;
                return (
                  <motion.line key={`f-${i}`}
                    x1={bx} y1={by}
                    x2={bx + Math.cos(rad) * len} y2={by + Math.sin(rad) * len}
                    stroke={i % 3 === 0 ? "#FFD580" : i % 3 === 1 ? "#C9952E" : "#8B5E1A"}
                    strokeWidth={i % 2 === 0 ? 1.5 : 1} strokeLinecap="round"
                    initial={{ scale: 0.1, opacity: 1 }}
                    animate={{ scale: 1, opacity: 0 }}
                    transition={{ duration: 0.28, delay: i * 0.015, ease: "easeOut" }}
                  />
                );
              })}
              <motion.circle cx={bx} cy={by} r={4} fill="none" stroke="#FFD580" strokeWidth={2}
                initial={{ scale: 0, opacity: 1 }} animate={{ scale: 3.5, opacity: 0 }}
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
  onSwipe: (direction: "left" | "right" | "maybe") => void;
  locationIcon?: React.ReactNode;
  locationName?: string;
  progress?: string;
}

export function SwipeCard({ profile, onSwipe, locationIcon, locationName, progress }: SwipeCardProps) {
  const [action, setAction] = useState<Action>("none");
  const [showConfetti, setShowConfetti] = useState(false);

  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const cardRotate = useTransform(dragX, [-280, 280], [-18, 18]);
  const cardOpacity = useTransform(dragX, [-420, -180, 0, 180, 420], [0, 1, 1, 1, 0]);

  const yesOpacity = useTransform(dragX, [25, 75], [0, 1]);
  const nopeOpacity = useTransform(dragX, [-75, -25], [1, 0]);

  function handleAction(dir: "left" | "right" | "maybe") {
    if (action !== "none") return;
    const act: Action = dir === "left" ? "no" : dir === "right" ? "yes" : "maybe";
    setAction(act);

    if (dir === "right") {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1500);
      animate(dragX, 520, { duration: 0.42, ease: "easeIn" });
    } else if (dir === "left") {
      animate(dragX, -520, { duration: 0.42, ease: "easeIn" });
    } else {
      animate(dragY, [0, -10, 0], { duration: 0.35, times: [0, 0.45, 1], ease: "easeOut" });
    }

    setTimeout(() => {
      onSwipe(dir);
      setAction("none");
    }, dir === "maybe" ? 780 : 480);
  }

  function handleDragEnd(_: PointerEvent, info: PanInfo) {
    if (action !== "none") return;
    const { offset, velocity } = info;
    if (offset.x > 80 || velocity.x > 500) {
      handleAction("right");
    } else if (offset.x < -80 || velocity.x < -500) {
      handleAction("left");
    } else {
      animate(dragX, 0, { type: "spring", stiffness: 320, damping: 30 });
    }
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

        <div className="flex items-center justify-center" style={{ overflow: "visible" }}>
          <div className="pointer-events-none shrink-0" style={{ marginRight: -6 }}>
            <HStringVisual side="left" action={action} dragX={dragX} />
          </div>

          <motion.div
            drag="x"
            dragConstraints={{ left: -500, right: 500 }}
            dragElastic={0.05}
            style={{ x: dragX, y: dragY, rotate: cardRotate, opacity: cardOpacity }}
            onDragEnd={handleDragEnd as never}
            className="w-full touch-none cursor-grab active:cursor-grabbing shrink-0"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-xl" style={{ height: 430 }}>
              <motion.div
                style={{ opacity: yesOpacity }}
                className="absolute top-8 left-5 z-20 border-4 border-emerald-400 text-emerald-400 font-black text-xl px-3 py-1 rounded-lg select-none pointer-events-none"
                initial={false}
              >
                YES
              </motion.div>
              <motion.div
                style={{ opacity: nopeOpacity }}
                className="absolute top-8 right-5 z-20 border-4 border-red-400 text-red-400 font-black text-xl px-3 py-1 rounded-lg select-none pointer-events-none"
                initial={false}
              >
                NOPE
              </motion.div>

              <div className="absolute inset-0" style={{ background: profile.gradient }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-9xl font-black text-white/10 select-none tracking-tight">
                    {profile.avatar}
                  </span>
                </div>
                {locationIcon && locationName && (
                  <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full">
                    {locationIcon}
                    <span>{locationName}</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-5 pt-12 pb-5 text-white">
                  <h2 className="text-2xl font-bold leading-tight">{profile.name}, {profile.age}</h2>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-white/60 shrink-0" />
                    <span className="text-sm text-white/70">{profile.distance}</span>
                  </div>
                  <p className="text-sm text-white/80 mt-2 leading-snug line-clamp-2">{profile.bio}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="pointer-events-none shrink-0" style={{ marginLeft: -6 }}>
            <HStringVisual side="right" action={action} dragX={dragX} />
          </div>
        </div>

        <div className="flex justify-center items-center gap-5 mt-5">
          <button
            onClick={() => handleAction("left")}
            disabled={action !== "none"}
            className="w-14 h-14 rounded-full border-2 border-destructive/40 text-destructive hover:bg-destructive/10 active:scale-95 transition-all flex items-center justify-center disabled:opacity-40 shadow-sm"
          >
            <X className="w-6 h-6" />
          </button>
          <button
            onClick={() => handleAction("maybe")}
            disabled={action !== "none"}
            className="w-12 h-12 rounded-full border-2 border-amber-400/60 text-amber-500 hover:bg-amber-50 active:scale-95 transition-all flex items-center justify-center disabled:opacity-40 shadow-sm"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
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

import { useState, useEffect, useMemo, useRef } from "react";
import {
  useMotionValue,
  useTransform,
  useMotionTemplate,
  animate,
  motion,
  AnimatePresence,
  type PanInfo,
  type MotionValue,
} from "framer-motion";
import { Heart, X, HelpCircle, MapPin, MoreVertical, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { StringIcon } from "@/components/StringIcon";
import type { Profile } from "@/lib/data";
import { useProfilePreview } from "@/contexts/ProfilePreviewContext";

type Action = "none" | "yes" | "no" | "maybe";
type Phase = "rope" | "snap-flash" | "broken" | "hidden";

// 24 fibers for a dramatic burst
const FIBERS = [
  { angle: -80, len: 22 }, { angle: -60, len: 28 }, { angle: -40, len: 20 },
  { angle: -20, len: 26 }, { angle: 0,   len: 24 }, { angle: 20,  len: 28 },
  { angle: 40,  len: 22 }, { angle: 60,  len: 30 }, { angle: 80,  len: 20 },
  { angle: 100, len: 26 }, { angle: 120, len: 22 }, { angle: 140, len: 28 },
  { angle: 160, len: 20 }, { angle: 180, len: 24 }, { angle: -160, len: 28 },
  { angle: -140, len: 22 }, { angle: -120, len: 26 }, { angle: -100, len: 18 },
  { angle: -10, len: 16 }, { angle: 10,  len: 16 }, { angle: 50,  len: 18 },
  { angle: -50, len: 18 }, { angle: 90,  len: 14 }, { angle: -90, len: 14 },
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

// Sub-component so we can call useTransform for the offset cy values
function BeadGroup({
  kx, ky, gradId, glowFilter,
}: {
  kx: number;
  ky: MotionValue<number>;
  gradId: string;
  glowFilter?: React.CSSProperties;
}) {
  const shadowCy    = useTransform(ky, (y) => y + 2.5);
  const highlightCy = useTransform(ky, (y) => y - 1.1);
  const bottomCy    = useTransform(ky, (y) => y + 1.0);
  return (
    <g>
      {/* Soft drop shadow */}
      <motion.ellipse cx={kx + 0.5} cy={shadowCy}    rx={6}   ry={3.5} fill="rgba(0,0,0,0.5)"          style={{ filter: "blur(2px)" }} />
      {/* Gem body */}
      <motion.ellipse cx={kx}       cy={ky}           rx={5.5} ry={3.8} fill={`url(#${gradId})`}         style={glowFilter} />
      {/* Inner depth */}
      <motion.ellipse cx={kx}       cy={ky}           rx={3.5} ry={2.2} fill="rgba(155,93,229,0.5)" />
      {/* Specular highlight — top-left glint */}
      <motion.ellipse cx={kx - 1.6} cy={highlightCy} rx={1.8} ry={1}   fill="rgba(255,255,255,0.82)" />
      {/* Tiny bottom glint for facet depth */}
      <motion.ellipse cx={kx + 1.2} cy={bottomCy}    rx={0.9} ry={0.5} fill="rgba(255,255,255,0.35)" />
    </g>
  );
}

// Renders the silk thread strands + gem beads, driven by a single controlY MotionValue
function RopeWithKnots({
  controlY,
  side,
  glow = false,
}: {
  controlY: MotionValue<number>;
  side: "left" | "right";
  glow?: boolean;
}) {
  const pathD = useTransform(controlY, (y) =>
    side === "right"
      ? `M 0 40 Q 60 ${y} 120 40`
      : `M 120 40 Q 60 ${y} 0 40`
  );

  // Bead Y at Bezier t=0.25, 0.5, 0.75
  const k1y = useTransform(controlY, (y) => 40 + 2 * 0.25 * 0.75 * (y - 40));
  const k2y = useTransform(controlY, (y) => 40 + 0.5 * (y - 40));
  const k3y = useTransform(controlY, (y) => 40 + 2 * 0.75 * 0.25 * (y - 40));

  const kxs = side === "right" ? [30, 60, 90] : [90, 60, 30];
  const kys = [k1y, k2y, k3y];

  const gradId  = `thread-grad-${side}`;
  const glowId  = `thread-glow-${side}`;

  const glowFilter = glow
    ? { filter: "drop-shadow(0 0 7px rgba(232,56,125,0.95)) drop-shadow(0 0 14px rgba(155,93,229,0.65))" }
    : undefined;

  return (
    <>
      {/* Ambient halo behind thread */}
      <motion.path d={pathD as unknown as string} stroke={`url(#${glowId})`} strokeWidth={13} fill="none" strokeLinecap="round"
        style={{ opacity: glow ? 0.85 : 0.38 }} />
      {/* Main silk thread */}
      <motion.path d={pathD as unknown as string} stroke={`url(#${gradId})`} strokeWidth={3.5} fill="none" strokeLinecap="round"
        style={glowFilter} />
      {/* Silk sheen — fine dashed highlight */}
      <motion.path d={pathD as unknown as string} stroke="rgba(255,255,255,0.42)" strokeWidth={1.2}
        strokeDasharray="3 11" strokeDashoffset={1} fill="none" strokeLinecap="round" />

      {/* Gem beads at t=0.25, 0.5, 0.75 */}
      {kxs.map((kx, i) => (
        <BeadGroup key={i} kx={kx} ky={kys[i]} gradId={gradId} glowFilter={glowFilter} />
      ))}
    </>
  );
}

const DEFAULT_SAG = 82; // big visible droop at rest
const TAUT_Y = 40;      // fully taut (horizontal)

function HStringVisual({
  side,
  action,
  dragX,
  dragY,
}: {
  side: "left" | "right";
  action: Action;
  dragX: MotionValue<number>;
  dragY: MotionValue<number>;
}) {
  const controlY = useMotionValue(DEFAULT_SAG);
  const [phase, setPhase] = useState<Phase>("rope");
  const [isGlowing, setIsGlowing] = useState(false);
  const phaseRef = useRef<Phase>("rope");
  phaseRef.current = phase;

  // Gentle sway on mount so the ropes feel alive
  useEffect(() => {
    animate(controlY, [DEFAULT_SAG, DEFAULT_SAG + 10, DEFAULT_SAG - 5, DEFAULT_SAG + 7, DEFAULT_SAG], {
      duration: 1.6,
      times: [0, 0.28, 0.55, 0.78, 1],
      ease: "easeInOut",
    });
  }, []);

  // Live drag → flow
  useEffect(() => {
    function update() {
      if (phaseRef.current !== "rope") return;
      const x = dragX.get();
      const y = dragY.get();
      // Downward drag makes both ropes sag more
      const ySag = Math.min(Math.max(0, y) / 280, 1) * 18;
      if (side === "right") {
        // Dragging right: right rope tautens
        const taut = Math.min(Math.max(0, x) / 190, 1);
        // Dragging left: right rope sags extra
        const extraSag = Math.min(Math.max(0, -x) / 190, 1);
        controlY.set(DEFAULT_SAG - taut * (DEFAULT_SAG - TAUT_Y) + extraSag * 22 + ySag);
      } else {
        // Dragging left: left rope tautens
        const taut = Math.min(Math.max(0, -x) / 190, 1);
        // Dragging right: left rope sags extra
        const extraSag = Math.min(Math.max(0, x) / 190, 1);
        controlY.set(DEFAULT_SAG - taut * (DEFAULT_SAG - TAUT_Y) + extraSag * 22 + ySag);
      }
    }
    const unsubX = dragX.on("change", update);
    const unsubY = dragY.on("change", update);
    return () => { unsubX(); unsubY(); };
  }, [side, dragX, dragY, controlY]);

  useEffect(() => {
    if (action === "none") {
      setPhase("rope");
      setIsGlowing(false);
      animate(controlY, DEFAULT_SAG, { type: "spring", stiffness: 140, damping: 18 });
      return;
    }
    if (side === "right" && action === "yes") {
      setPhase("rope");
      animate(controlY, TAUT_Y, { duration: 0.2 });
      setIsGlowing(true);
      setTimeout(() => setPhase("hidden"), 500);
    }
    if (side === "left" && action === "no") {
      setPhase("rope");
      animate(controlY, TAUT_Y, { duration: 0.22, ease: [0.4, 0, 1, 1] });
      setTimeout(() => { setPhase("snap-flash"); controlY.set(DEFAULT_SAG); }, 230);
      setTimeout(() => setPhase("broken"), 280);
      setTimeout(() => setPhase("hidden"), 900);
    }
    if (action === "maybe") {
      setPhase("rope");
      animate(controlY, [DEFAULT_SAG, 18, DEFAULT_SAG + 18, 26, DEFAULT_SAG + 12, TAUT_Y + 8, DEFAULT_SAG - 4, DEFAULT_SAG], {
        duration: 0.82,
        times: [0, 0.14, 0.30, 0.46, 0.60, 0.73, 0.87, 1],
      });
      setTimeout(() => setPhase("hidden"), 830);
    }
  }, [action]);

  if (phase === "hidden") return <div style={{ width: 130, height: 90, flexShrink: 0 }} />;

  // Break point: for left string, close to card (x=90); for right, far end (x=30)
  const bx = side === "left" ? 90 : 30;
  const by = 40;

  return (
    <div style={{ width: 130, height: 90, flexShrink: 0 }}>
      <svg width="130" height="90" viewBox="0 0 130 90" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={`thread-grad-${side}`} x1="0" y1="0" x2="130" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E8387D" />
            <stop offset="100%" stopColor="#9B5DE5" />
          </linearGradient>
          <linearGradient id={`thread-glow-${side}`} x1="0" y1="0" x2="130" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E8387D" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#9B5DE5" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <AnimatePresence mode="sync">
          {(phase === "rope" || phase === "snap-flash") && (
            <motion.g key="intact" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.04 }}>
              <RopeWithKnots controlY={controlY} side={side} glow={isGlowing} />
              {isGlowing && (
                <motion.circle cx={65} cy={40} r={8} fill="#E8387D"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 2.5, 0], opacity: [0, 0.85, 0] }}
                  transition={{ duration: 0.5, ease: "easeOut", times: [0, 0.4, 1] }}
                />
              )}
            </motion.g>
          )}

          {phase === "snap-flash" && (
            <motion.g key="flash">
              {/* Bright pink core */}
              <motion.circle cx={bx} cy={by} r={8} fill="#E8387D"
                initial={{ scale: 0, opacity: 1 }} animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
              {/* Purple mid ring */}
              <motion.circle cx={bx} cy={by} r={4} fill="#9B5DE5"
                initial={{ scale: 0, opacity: 1 }} animate={{ scale: 5, opacity: 0 }}
                transition={{ duration: 0.2, delay: 0.02 }}
              />
              {/* Outer pink ring */}
              <motion.circle cx={bx} cy={by} r={2} fill="none" stroke="#E8387D" strokeWidth={3}
                initial={{ scale: 0, opacity: 1 }} animate={{ scale: 8, opacity: 0 }}
                transition={{ duration: 0.28, delay: 0.04 }}
              />
            </motion.g>
          )}

          {phase === "broken" && (
            <motion.g key="broken">
              {/* Near-card thread piece flies up */}
              <motion.g
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{ x: side === "left" ? 18 : -18, y: -38, opacity: 0 }}
                transition={{ duration: 0.55, ease: [0.1, 0, 0.55, 1] }}
              >
                <path
                  d={side === "left" ? `M 130 40 Q 110 30 ${bx} ${by}` : `M 0 40 Q 20 30 ${bx} ${by}`}
                  stroke={`url(#thread-glow-${side})`} strokeWidth={13} fill="none" strokeLinecap="round" opacity={0.5}
                />
                <path
                  d={side === "left" ? `M 130 40 Q 110 30 ${bx} ${by}` : `M 0 40 Q 20 30 ${bx} ${by}`}
                  stroke={`url(#thread-grad-${side})`} strokeWidth={3.5} fill="none" strokeLinecap="round"
                />
                <path
                  d={side === "left" ? `M 130 40 Q 110 30 ${bx} ${by}` : `M 0 40 Q 20 30 ${bx} ${by}`}
                  stroke="rgba(255,255,255,0.4)" strokeWidth={1.2} strokeDasharray="3 11" fill="none" strokeLinecap="round"
                />
              </motion.g>

              {/* Far thread piece flies down */}
              <motion.g
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{ x: side === "left" ? -18 : 18, y: 38, opacity: 0 }}
                transition={{ duration: 0.55, ease: [0.1, 0, 0.55, 1] }}
              >
                <path
                  d={side === "left" ? `M 0 40 Q 45 55 ${bx} ${by}` : `M 130 40 Q 85 55 ${bx} ${by}`}
                  stroke={`url(#thread-glow-${side})`} strokeWidth={13} fill="none" strokeLinecap="round" opacity={0.5}
                />
                <path
                  d={side === "left" ? `M 0 40 Q 45 55 ${bx} ${by}` : `M 130 40 Q 85 55 ${bx} ${by}`}
                  stroke={`url(#thread-grad-${side})`} strokeWidth={3.5} fill="none" strokeLinecap="round"
                />
                <path
                  d={side === "left" ? `M 0 40 Q 45 55 ${bx} ${by}` : `M 130 40 Q 85 55 ${bx} ${by}`}
                  stroke="rgba(255,255,255,0.4)" strokeWidth={1.2} strokeDasharray="3 11" fill="none" strokeLinecap="round"
                />
              </motion.g>

              {/* 24 fiber shards — app palette */}
              {FIBERS.map(({ angle, len }, i) => {
                const rad = (angle * Math.PI) / 180;
                return (
                  <motion.line key={`f-${i}`}
                    x1={bx} y1={by}
                    x2={bx + Math.cos(rad) * len} y2={by + Math.sin(rad) * len}
                    stroke={i % 3 === 0 ? "#E8387D" : i % 3 === 1 ? "#9B5DE5" : "#C68FE8"}
                    strokeWidth={i % 3 === 0 ? 2.5 : i % 3 === 1 ? 1.8 : 1.2}
                    strokeLinecap="round"
                    initial={{ scale: 0.05, opacity: 1 }}
                    animate={{ scale: 1, opacity: 0 }}
                    transition={{ duration: 0.42, delay: i * 0.008, ease: "easeOut" }}
                  />
                );
              })}

              {/* 3 expanding shockwave rings — app palette */}
              {[
                { r: 5, stroke: "#E8387D", sw: 3,   dur: 0.28, delay: 0 },
                { r: 3, stroke: "#9B5DE5", sw: 2.5, dur: 0.4,  delay: 0.04 },
                { r: 2, stroke: "#C68FE8", sw: 2,   dur: 0.55, delay: 0.08 },
              ].map((ring, i) => (
                <motion.circle key={`ring-${i}`}
                  cx={bx} cy={by} r={ring.r}
                  fill="none" stroke={ring.stroke} strokeWidth={ring.sw}
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: 9, opacity: 0 }}
                  transition={{ duration: ring.dur, delay: ring.delay, ease: "easeOut" }}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
}

function resolvePhoto(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return /^(https?:|blob:|data:)/.test(url) ? url : `${import.meta.env.BASE_URL}${url}`;
}

const REPORT_REASONS = [
  "Inappropriate photos",
  "Fake profile",
  "Harassment or spam",
  "Under 18",
  "Other",
];

function ReportSheet({
  profileName,
  onSelect,
  onCancel,
}: {
  profileName: string;
  onSelect: (reason: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999]">
      <motion.div
        className="absolute inset-0 bg-black/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 400, damping: 36 }}
        className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl px-5 pb-10 pt-4 shadow-2xl"
      >
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-5" />
        <h3 className="text-base font-semibold text-foreground mb-1">
          Report {profileName}
        </h3>
        <p className="text-sm text-muted-foreground mb-5">
          They'll be blocked and won't appear again. Your report is anonymous.
        </p>
        <div className="space-y-2">
          {REPORT_REASONS.map((reason) => (
            <button
              key={reason}
              onClick={() => onSelect(reason)}
              className="w-full text-left px-4 py-3 rounded-xl border border-border hover:border-destructive/50 hover:bg-destructive/5 text-sm text-foreground transition-all active:scale-[0.98]"
            >
              {reason}
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="w-full mt-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </motion.div>
    </div>
  );
}

interface SwipeCardProps {
  profile: Profile;
  onSwipe: (direction: "left" | "right" | "maybe") => void;
  locationIcon?: React.ReactNode;
  locationName?: string;
  progress?: string;
  peekProfiles?: Profile[];
  blurName?: boolean;
  onDoubleString?: () => void;
  boostCredits?: number;
  onReport?: (reason: string) => void;
  onRewind?: () => void;
  canRewind?: boolean;
}

export function SwipeCard({ profile, onSwipe, locationIcon, locationName, progress, peekProfiles = [], blurName = false, onDoubleString, boostCredits = 0, onReport, onRewind, canRewind = false }: SwipeCardProps) {
  const { openPreview } = useProfilePreview();
  const [action, setAction] = useState<Action>("none");
  const [showConfetti, setShowConfetti] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const isDragging = useRef(false);

  const allPhotos = profile.photos?.length
    ? profile.photos
    : profile.photo ? [profile.photo] : [];
  // Clamp index whenever the photos array shrinks (e.g. owner removed a photo)
  const safeIndex = allPhotos.length > 0 ? Math.min(photoIndex, allPhotos.length - 1) : 0;
  const currentPhoto = resolvePhoto(allPhotos[safeIndex]);

  useEffect(() => { setPhotoIndex(0); }, [profile.id]);
  useEffect(() => {
    if (allPhotos.length > 0 && photoIndex >= allPhotos.length) {
      setPhotoIndex(allPhotos.length - 1);
    }
  }, [allPhotos.length, photoIndex]);

  function handleCardTap() {
    if (isDragging.current) return;
    openPreview(profile, { blurName, onSwipe: (dir) => handleAction(dir) });
  }

  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const cardRotate = useTransform(dragX, [-280, 280], [-18, 18]);

  // Opacity fades on all three exit directions
  const cardOpacity = useTransform([dragX, dragY] as MotionValue<number>[], ([x, y]: number[]) => {
    const opX = Math.abs(x) > 180 ? Math.max(0, 1 - (Math.abs(x) - 180) / 240) : 1;
    const opY = y > 180 ? Math.max(0, 1 - (y - 180) / 240) : 1;
    return Math.min(opX, opY);
  });

  const yesOpacity   = useTransform(dragX, [25, 75], [0, 1]);
  const nopeOpacity  = useTransform(dragX, [-75, -25], [1, 0]);
  const maybeOpacity = useTransform(dragY, [25, 75], [0, 1]);

  // Drag-reactive glow — pink-purple at rest, shifts green on yes, red on nope
  const glowPink   = useTransform(dragX, [-160, 0, 160], [0.1,  0.55, 0.95]);
  const glowPurple = useTransform(dragX, [-160, 0, 160], [0.12, 0.45, 0.15]);
  const glowGreen  = useTransform(dragX, [20,  160],      [0,    0.6]);
  const glowRed    = useTransform(dragX, [-160, -20],     [0.6,  0]);
  const cardGlow   = useMotionTemplate`0 0 0 1.5px rgba(232,56,125,${glowPink}), 0 0 20px 5px rgba(155,93,229,${glowPurple}), 0 0 32px 10px rgba(52,211,153,${glowGreen}), 0 0 32px 10px rgba(239,68,68,${glowRed}), 0 0 48px 14px rgba(232,56,125,${glowPink})`;

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
      // Slide card downward off screen
      animate(dragX, 0, { type: "spring", stiffness: 500, damping: 40 });
      animate(dragY, 560, { duration: 0.42, ease: "easeIn" });
    }

    // For "no", wait longer so snap burst has time to play
    setTimeout(() => {
      onSwipe(dir);
      setAction("none");
    }, dir === "maybe" ? 780 : dir === "left" ? 620 : 480);
  }

  function handleDragEnd(_: PointerEvent, info: PanInfo) {
    if (action !== "none") return;
    const { offset, velocity } = info;

    const absX = Math.abs(offset.x);
    const absY = Math.max(0, offset.y); // only care about downward

    // Downward swipe wins if it's the dominant axis and passes threshold
    if (absY > absX && (offset.y > 80 || velocity.y > 500)) {
      handleAction("maybe");
    } else if (offset.x > 80 || velocity.x > 500) {
      handleAction("right");
    } else if (offset.x < -80 || velocity.x < -500) {
      handleAction("left");
    } else {
      // Snap everything back to centre
      animate(dragX, 0, { type: "spring", stiffness: 320, damping: 30 });
      animate(dragY, 0, { type: "spring", stiffness: 320, damping: 30 });
    }
  }

  return (
    <>
      {showConfetti && <ConfettiBurst />}

      <AnimatePresence>
        {showReport && (
          <ReportSheet
            profileName={blurName ? "this person" : profile.name.split(" ")[0]}
            onSelect={(reason) => { setShowReport(false); onReport?.(reason); }}
            onCancel={() => setShowReport(false)}
          />
        )}
      </AnimatePresence>

      <div className="w-full max-w-sm mx-auto">
        <div className="flex items-center justify-center" style={{ overflow: "visible" }}>
          {/* Card stack wrapper — ghost cards peek from behind, card fills full width */}
          <div className="relative shrink-0 w-full" style={{ overflow: "visible" }}>
            {peekProfiles.slice(0, 2).map((p, i) => {
              const depth = i + 1;
              return (
                <div
                  key={p.id}
                  className="absolute pointer-events-none"
                  style={{
                    top: depth * 9,
                    left: `${depth * 4}%`,
                    right: `${depth * 4}%`,
                    height: `calc(clamp(360px, calc(100svh - 268px), 520px) - ${depth * 9}px)`,
                    borderRadius: 24,
                    overflow: "hidden",
                    background: p.gradient,
                    zIndex: 10 - depth * 3,
                    boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
                  }}
                >
                  {(p.photos?.[0] ?? p.photo) ? (
                    <img
                      src={resolvePhoto(p.photos?.[0] ?? p.photo)}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover object-top opacity-70"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-9xl font-black text-white/10 select-none">{p.avatar}</span>
                    </div>
                  )}
                </div>
              );
            })}

          <motion.div
            drag
            dragConstraints={{ left: -500, right: 500, top: 0, bottom: 500 }}
            dragElastic={{ left: 0.05, right: 0.05, top: 0.02, bottom: 0.05 }}
            style={{ x: dragX, y: dragY, rotate: cardRotate, opacity: cardOpacity, position: "relative", zIndex: 10, boxShadow: cardGlow, borderRadius: "1.5rem" }}
            onDragStart={() => { isDragging.current = true; }}
            onDragEnd={(e, info) => { setTimeout(() => { isDragging.current = false; }, 80); handleDragEnd(e as never, info); }}
            className="w-full touch-none cursor-grab active:cursor-grabbing shrink-0"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-xl" style={{ height: "clamp(360px, calc(100svh - 268px), 520px)" }}>
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
              <motion.div
                style={{ opacity: maybeOpacity }}
                className="absolute bottom-16 left-1/2 z-20 -translate-x-1/2 border-4 border-amber-400 text-amber-400 font-black text-xl px-4 py-1 rounded-lg select-none pointer-events-none whitespace-nowrap"
                initial={false}
              >
                MAYBE
              </motion.div>

              <div
                className="absolute inset-0"
                style={{ background: profile.gradient }}
                onClick={handleCardTap}
              >
                {currentPhoto ? (
                  <img
                    src={currentPhoto}
                    alt={profile.name}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                    draggable={false}
                    onError={() => {
                      // Skip broken photo — try next, then wrap to first
                      const next = safeIndex + 1 < allPhotos.length ? safeIndex + 1 : 0;
                      if (next !== safeIndex) setPhotoIndex(next);
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-9xl font-black text-white/10 select-none tracking-tight">
                      {profile.avatar}
                    </span>
                  </div>
                )}

                {locationIcon && locationName && (
                  <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full">
                    {locationIcon}
                    <span>{locationName}</span>
                  </div>
                )}

                {/* Report button — top-right of photo */}
                {onReport && (
                  <button
                    className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-all active:scale-90"
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShowReport(true); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    aria-label="Report profile"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/65 to-transparent px-5 pt-24 pb-5 text-white">
                  <h2 className="text-2xl font-bold leading-tight">
                    {blurName ? (
                      <>
                        <span
                          style={{ filter: "blur(9px)", userSelect: "none" }}
                          aria-hidden="true"
                        >
                          {profile.name}
                        </span>
                        <span className="sr-only">Name hidden</span>
                        {", "}
                        {profile.age}
                      </>
                    ) : (
                      <>{profile.name}, {profile.age}</>
                    )}
                  </h2>
                  {blurName && (
                    <p className="text-[10px] text-white/40 mt-0.5 italic">name revealed on match</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-white/60 shrink-0" />
                    <span className="text-sm text-white/70">{profile.distance}</span>
                  </div>
                  <p className="text-sm text-white/80 mt-2 leading-snug line-clamp-2">{profile.bio}</p>
                </div>

              </div>
            </div>
          </motion.div>
          </div>{/* end card stack wrapper */}
        </div>

        <div className="flex justify-center items-center gap-4 mt-2">
          {/* Rewind — undo last swipe */}
          <button
            onClick={onRewind}
            disabled={!canRewind || action !== "none"}
            className="w-11 h-11 rounded-full bg-card border border-white/10 text-amber-400 hover:bg-amber-500/10 active:scale-95 transition-all flex items-center justify-center disabled:opacity-25 shadow-lg"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* X — reject */}
          <button
            onClick={() => handleAction("left")}
            disabled={action !== "none"}
            className="w-11 h-11 rounded-full bg-card border border-white/10 text-rose-400 hover:bg-rose-500/10 active:scale-95 transition-all flex items-center justify-center disabled:opacity-40 shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Heart — like (large, pink-purple gradient) */}
          <button
            onClick={() => handleAction("right")}
            disabled={action !== "none"}
            className="w-13 h-13 rounded-full active:scale-95 transition-all flex items-center justify-center disabled:opacity-40 shadow-xl shadow-primary/30"
            style={{ width: 52, height: 52, background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" }}
          >
            <Heart className="w-6 h-6 text-white fill-white" />
          </button>

          {/* Star — maybe/save */}
          <button
            onClick={() => handleAction("maybe")}
            disabled={action !== "none"}
            className="w-11 h-11 rounded-full bg-card border border-white/10 text-violet-400 hover:bg-violet-500/10 active:scale-95 transition-all flex items-center justify-center disabled:opacity-40 shadow-lg"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Double String button */}
        {onDoubleString && (
          <div className="flex justify-center mt-1.5">
            <button
              onClick={onDoubleString}
              disabled={action !== "none" || boostCredits < 2}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border transition-all active:scale-95
                ${boostCredits >= 2
                  ? "border-primary/40 hover:border-primary/70 text-primary hover:bg-primary/10"
                  : "border-border text-muted-foreground opacity-40 cursor-not-allowed"
                }`}
            >
              <StringIcon className="w-3 h-3" />
              <StringIcon className="w-3 h-3 -ml-1.5" />
              <span className="text-[11px] font-semibold ml-0.5">Double String</span>
              <span className="text-[10px] opacity-60 ml-0.5">2 credits</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface AnimatedSplashProps {
  onDone: () => void;
}

const PATH = "M 90 58 C 90 160, 230 160, 230 262";
const CX = 90,  CY = 58;
const PX = 230, PY = 262;
const FX = 160, FY = 160;

export default function AnimatedSplash({ onDone }: AnimatedSplashProps) {
  const [pathDone, setPathDone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPathDone(true), 1000);
    const t2 = setTimeout(() => onDone(), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  const pathAnim = {
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: { duration: 1.4, delay: 0.2, ease: "easeInOut" as const },
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#08080f" }}
    >
      {/* ── String visual ── */}
      <div className="flex items-center justify-center" style={{ width: "100%", maxHeight: "55%", flex: "0 0 55%" }}>
        <svg
          viewBox="0 0 320 320"
          style={{ width: "100%", maxWidth: 360, height: "100%" }}
          aria-hidden
          overflow="visible"
        >
          <defs>
            <linearGradient id="sg2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#FF5CA0" />
              <stop offset="48%"  stopColor="#E099D8" />
              <stop offset="100%" stopColor="#9B8EEF" />
            </linearGradient>
            <filter id="s2-wide" x="-120%" y="-120%" width="340%" height="340%">
              <feGaussianBlur stdDeviation="20" />
            </filter>
            <filter id="s2-mid" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
            <filter id="s2-dot-pink" x="-300%" y="-300%" width="700%" height="700%">
              <feGaussianBlur stdDeviation="18" />
            </filter>
            <filter id="s2-dot-purple" x="-300%" y="-300%" width="700%" height="700%">
              <feGaussianBlur stdDeviation="18" />
            </filter>
            <filter id="s2-flare-bloom" x="-400%" y="-400%" width="900%" height="900%">
              <feGaussianBlur stdDeviation="28" />
            </filter>
            <filter id="s2-ray" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="s2rL"   x1={FX} y1={FY} x2={FX-148} y2={FY}   gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="white" stopOpacity="0.9" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="s2rR"   x1={FX} y1={FY} x2={FX+148} y2={FY}   gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="white" stopOpacity="0.9" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="s2rU"   x1={FX} y1={FY} x2={FX}     y2={FY-130} gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="white" stopOpacity="0.85" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="s2rD"   x1={FX} y1={FY} x2={FX}     y2={FY+130} gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="white" stopOpacity="0.85" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="s2rDUL" x1={FX} y1={FY} x2={FX-65}  y2={FY-65}  gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#D8A8FF" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#D8A8FF" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="s2rDDR" x1={FX} y1={FY} x2={FX+65}  y2={FY+65}  gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#D8A8FF" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#D8A8FF" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="s2rDUR" x1={FX} y1={FY} x2={FX+65}  y2={FY-65}  gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#FFAAD8" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#FFAAD8" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="s2rDDL" x1={FX} y1={FY} x2={FX-65}  y2={FY+65}  gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#FFAAD8" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#FFAAD8" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Dot blooms */}
          <motion.circle cx={CX} cy={CY} r={18} fill="#FF3A7A" filter="url(#s2-dot-pink)"
            initial={{ opacity: 0 }} animate={{ opacity: 0.85 }} transition={{ delay: 0.1, duration: 0.5 }} />
          <motion.circle cx={PX} cy={PY} r={18} fill="#7B5CF0" filter="url(#s2-dot-purple)"
            initial={{ opacity: 0 }} animate={{ opacity: 0.85 }} transition={{ delay: 1.45, duration: 0.5 }} />

          {/* Path — 3 layers */}
          <motion.path d={PATH} stroke="url(#sg2)" strokeWidth={28} fill="none"
            strokeLinecap="round" filter="url(#s2-wide)" opacity={0.55} {...pathAnim} />
          <motion.path d={PATH} stroke="url(#sg2)" strokeWidth={10} fill="none"
            strokeLinecap="round" filter="url(#s2-mid)" opacity={0.85} {...pathAnim} />
          <motion.path d={PATH} stroke="url(#sg2)" strokeWidth={2.5} fill="none"
            strokeLinecap="round" opacity={1} {...pathAnim} />

          {/* Pink orb */}
          <motion.circle cx={CX} cy={CY} r={14} fill="#FF5CA0"
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4, type: "spring", stiffness: 320 }} />
          <motion.circle cx={CX} cy={CY} r={6} fill="#FFADD0"
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, duration: 0.3 }} />

          {/* Purple orb */}
          <motion.circle cx={PX} cy={PY} r={14} fill="#9B8EEF"
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.45, duration: 0.4, type: "spring", stiffness: 320 }} />
          <motion.circle cx={PX} cy={PY} r={6} fill="#C8BEFF"
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.5, duration: 0.3 }} />

          {/* Lens flare */}
          {pathDone && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
              <circle cx={FX} cy={FY} r={55} fill="#9B5DE5" filter="url(#s2-flare-bloom)" opacity={0.5} />
              <circle cx={FX} cy={FY} r={28} fill="#CC88FF" filter="url(#s2-flare-bloom)" opacity={0.4} />
              <line x1={FX} y1={FY} x2={FX-148} y2={FY}  stroke="url(#s2rL)"   strokeWidth={2}   filter="url(#s2-ray)" />
              <line x1={FX} y1={FY} x2={FX+148} y2={FY}  stroke="url(#s2rR)"   strokeWidth={2}   filter="url(#s2-ray)" />
              <line x1={FX} y1={FY} x2={FX}  y2={FY-130} stroke="url(#s2rU)"   strokeWidth={1.8} filter="url(#s2-ray)" />
              <line x1={FX} y1={FY} x2={FX}  y2={FY+130} stroke="url(#s2rD)"   strokeWidth={1.8} filter="url(#s2-ray)" />
              <line x1={FX} y1={FY} x2={FX-65} y2={FY-65} stroke="url(#s2rDUL)" strokeWidth={1.2} filter="url(#s2-ray)" />
              <line x1={FX} y1={FY} x2={FX+65} y2={FY+65} stroke="url(#s2rDDR)" strokeWidth={1.2} filter="url(#s2-ray)" />
              <line x1={FX} y1={FY} x2={FX+65} y2={FY-65} stroke="url(#s2rDUR)" strokeWidth={0.9} filter="url(#s2-ray)" />
              <line x1={FX} y1={FY} x2={FX-65} y2={FY+65} stroke="url(#s2rDDL)" strokeWidth={0.9} filter="url(#s2-ray)" />
              <circle cx={FX} cy={FY} r={5} fill="white" opacity={0.95} />
              <circle cx={FX} cy={FY} r={2.5} fill="white" />
              <motion.circle cx={FX} cy={FY} r={18} fill="none"
                stroke="rgba(200,180,255,0.25)" strokeWidth={1}
                animate={{ r: [18, 28, 18], opacity: [0.25, 0, 0.25] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }} />
            </motion.g>
          )}
        </svg>
      </div>

      {/* ── Text ── */}
      <motion.div
        className="text-center px-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.6, ease: "easeOut" }}
      >
        <h1
          className="gradient-text font-bold select-none leading-none"
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "clamp(2.6rem, 12vw, 3.6rem)",
            letterSpacing: "-0.01em",
          }}
        >
          ✦ coincidence
        </h1>
        <p
          className="mt-5 text-white/40 font-semibold tracking-[0.22em] leading-relaxed"
          style={{ fontSize: "clamp(0.6rem, 2.8vw, 0.72rem)" }}
        >
          SOME CONNECTIONS<br />ARE MEANT TO FIND YOU.
        </p>
      </motion.div>
    </div>
  );
}

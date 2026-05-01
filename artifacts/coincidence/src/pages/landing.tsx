import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface LandingPageProps {
  onGetStarted: () => void;
}

// S-curve: M 90 58 C 90 160, 230 160, 230 262
// Midpoint at t=0.5 is exactly (160, 160) — where the flare lives
const PATH = "M 90 58 C 90 160, 230 160, 230 262";
const CX = 90, CY = 58;   // pink dot
const PX = 230, PY = 262; // purple dot
const FX = 160, FY = 160; // flare / star

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [pathDone, setPathDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPathDone(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const pathAnim = {
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: { duration: 1.4, delay: 0.2, ease: "easeInOut" as const },
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center overflow-hidden"
      style={{ background: "#08080f" }}
    >
      {/* ── String visual ── */}
      <div
        className="w-full flex items-center justify-center"
        style={{ flex: "0 0 52%", minHeight: 0 }}
      >
        <svg
          viewBox="0 0 320 320"
          style={{ width: "100%", maxWidth: 360, height: "100%" }}
          aria-hidden
          overflow="visible"
        >
          <defs>
            {/* Path gradient: pink → lavender → purple */}
            <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#FF5CA0" />
              <stop offset="48%"  stopColor="#E099D8" />
              <stop offset="100%" stopColor="#9B8EEF" />
            </linearGradient>

            {/* Outer wide blur — gives the neon bloom */}
            <filter id="f-wide" x="-120%" y="-120%" width="340%" height="340%">
              <feGaussianBlur stdDeviation="20" />
            </filter>
            {/* Mid glow */}
            <filter id="f-mid" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
            {/* Dot outer bloom */}
            <filter id="f-dot-pink" x="-300%" y="-300%" width="700%" height="700%">
              <feGaussianBlur stdDeviation="18" />
            </filter>
            <filter id="f-dot-purple" x="-300%" y="-300%" width="700%" height="700%">
              <feGaussianBlur stdDeviation="18" />
            </filter>
            {/* Flare bloom */}
            <filter id="f-flare-bloom" x="-400%" y="-400%" width="900%" height="900%">
              <feGaussianBlur stdDeviation="28" />
            </filter>
            {/* Ray blur */}
            <filter id="f-ray" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>

            {/* Fading ray gradients — userSpaceOnUse so coords are absolute */}
            {/* Horizontal */}
            <linearGradient id="rL" x1={FX} y1={FY} x2={FX - 148} y2={FY} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="white" stopOpacity="0.9" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="rR" x1={FX} y1={FY} x2={FX + 148} y2={FY} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="white" stopOpacity="0.9" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
            {/* Vertical */}
            <linearGradient id="rU" x1={FX} y1={FY} x2={FX} y2={FY - 130} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="white" stopOpacity="0.85" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="rD" x1={FX} y1={FY} x2={FX} y2={FY + 130} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="white" stopOpacity="0.85" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
            {/* Diagonal UL */}
            <linearGradient id="rDUL" x1={FX} y1={FY} x2={FX - 65} y2={FY - 65} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#D8A8FF" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#D8A8FF" stopOpacity="0" />
            </linearGradient>
            {/* Diagonal DR */}
            <linearGradient id="rDDR" x1={FX} y1={FY} x2={FX + 65} y2={FY + 65} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#D8A8FF" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#D8A8FF" stopOpacity="0" />
            </linearGradient>
            {/* Diagonal UR */}
            <linearGradient id="rDUR" x1={FX} y1={FY} x2={FX + 65} y2={FY - 65} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFAAD8" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#FFAAD8" stopOpacity="0" />
            </linearGradient>
            {/* Diagonal DL */}
            <linearGradient id="rDDL" x1={FX} y1={FY} x2={FX - 65} y2={FY + 65} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFAAD8" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#FFAAD8" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* ── Pink dot bloom ── */}
          <motion.circle cx={CX} cy={CY} r={18} fill="#FF3A7A"
            filter="url(#f-dot-pink)"
            initial={{ opacity: 0 }} animate={{ opacity: 0.85 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          />
          {/* ── Purple dot bloom ── */}
          <motion.circle cx={PX} cy={PY} r={18} fill="#7B5CF0"
            filter="url(#f-dot-purple)"
            initial={{ opacity: 0 }} animate={{ opacity: 0.85 }}
            transition={{ delay: 1.45, duration: 0.5 }}
          />

          {/* ── Path: outer wide neon bloom ── */}
          <motion.path d={PATH} stroke="url(#sg)" strokeWidth={28} fill="none"
            strokeLinecap="round" filter="url(#f-wide)" opacity={0.55}
            {...pathAnim}
          />
          {/* ── Path: mid inner glow ── */}
          <motion.path d={PATH} stroke="url(#sg)" strokeWidth={10} fill="none"
            strokeLinecap="round" filter="url(#f-mid)" opacity={0.85}
            {...pathAnim}
          />
          {/* ── Path: sharp core ── */}
          <motion.path d={PATH} stroke="url(#sg)" strokeWidth={2.5} fill="none"
            strokeLinecap="round" opacity={1}
            {...pathAnim}
          />

          {/* ── Pink dot ── */}
          <motion.circle cx={CX} cy={CY} r={14} fill="#FF5CA0"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4, type: "spring", stiffness: 320 }}
          />
          <motion.circle cx={CX} cy={CY} r={6} fill="#FFADD0"
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          />

          {/* ── Purple dot ── */}
          <motion.circle cx={PX} cy={PY} r={14} fill="#9B8EEF"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.45, duration: 0.4, type: "spring", stiffness: 320 }}
          />
          <motion.circle cx={PX} cy={PY} r={6} fill="#C8BEFF"
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 1.5, duration: 0.3 }}
          />

          {/* ── Lens flare — appears after path finishes ── */}
          {pathDone && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {/* Outermost diffuse bloom */}
              <circle cx={FX} cy={FY} r={55} fill="#9B5DE5"
                filter="url(#f-flare-bloom)" opacity={0.5} />
              {/* Mid purple bloom */}
              <circle cx={FX} cy={FY} r={28} fill="#CC88FF"
                filter="url(#f-flare-bloom)" opacity={0.4} />

              {/* Long horizontal rays */}
              <line x1={FX} y1={FY} x2={FX - 148} y2={FY}
                stroke="url(#rL)" strokeWidth={2} filter="url(#f-ray)" />
              <line x1={FX} y1={FY} x2={FX + 148} y2={FY}
                stroke="url(#rR)" strokeWidth={2} filter="url(#f-ray)" />

              {/* Vertical rays */}
              <line x1={FX} y1={FY} x2={FX} y2={FY - 130}
                stroke="url(#rU)" strokeWidth={1.8} filter="url(#f-ray)" />
              <line x1={FX} y1={FY} x2={FX} y2={FY + 130}
                stroke="url(#rD)" strokeWidth={1.8} filter="url(#f-ray)" />

              {/* Diagonal rays */}
              <line x1={FX} y1={FY} x2={FX - 65} y2={FY - 65}
                stroke="url(#rDUL)" strokeWidth={1.2} filter="url(#f-ray)" />
              <line x1={FX} y1={FY} x2={FX + 65} y2={FY + 65}
                stroke="url(#rDDR)" strokeWidth={1.2} filter="url(#f-ray)" />
              <line x1={FX} y1={FY} x2={FX + 65} y2={FY - 65}
                stroke="url(#rDUR)" strokeWidth={0.9} filter="url(#f-ray)" />
              <line x1={FX} y1={FY} x2={FX - 65} y2={FY + 65}
                stroke="url(#rDDL)" strokeWidth={0.9} filter="url(#f-ray)" />

              {/* Bright center */}
              <circle cx={FX} cy={FY} r={5} fill="white" opacity={0.95} />
              <circle cx={FX} cy={FY} r={2.5} fill="white" />

              {/* Gentle pulsing outer ring */}
              <motion.circle cx={FX} cy={FY} r={18} fill="none"
                stroke="rgba(200,180,255,0.25)" strokeWidth={1}
                animate={{ r: [18, 28, 18], opacity: [0.25, 0, 0.25] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.g>
          )}
        </svg>
      </div>

      {/* ── Text ── */}
      <motion.div
        className="text-center px-8"
        initial={{ opacity: 0, y: 16 }}
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

      {/* ── Wave decoration ── */}
      <motion.div
        className="w-full"
        style={{ marginTop: "auto", flexShrink: 0 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.8 }}
      >
        <svg
          viewBox="0 0 390 120"
          style={{ display: "block", width: "100%", height: 120, overflow: "visible" }}
          aria-hidden
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="wg1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#E8387D" stopOpacity="0" />
              <stop offset="30%"  stopColor="#E8387D" stopOpacity="0.4" />
              <stop offset="65%"  stopColor="#C45AE8" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#9B5DE5" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="wg2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#9B5DE5" stopOpacity="0" />
              <stop offset="40%"  stopColor="#9B5DE5" stopOpacity="0.28" />
              <stop offset="75%"  stopColor="#E8387D" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#E8387D" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="wg3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#E8387D" stopOpacity="0" />
              <stop offset="50%"  stopColor="#C45AE8" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#9B5DE5" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M -30 80 C 60 40, 120 100, 195 65 C 270 30, 330 90, 420 55"
            stroke="url(#wg1)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M -40 95 C 50 60, 130 110, 195 78 C 260 46, 340 100, 430 70"
            stroke="url(#wg2)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M -20 68 C 70 30, 140 85, 195 55 C 250 25, 320 80, 410 45"
            stroke="url(#wg3)" strokeWidth="0.8" fill="none" strokeLinecap="round" />
          <path d="M 0 108 C 80 75, 150 118, 220 90 C 290 62, 355 108, 430 82"
            stroke="url(#wg1)" strokeWidth="0.7" fill="none" strokeLinecap="round" opacity="0.5" />
          <path d="M -50 55 C 30 28, 100 72, 180 48 C 260 24, 335 68, 430 40"
            stroke="url(#wg2)" strokeWidth="0.5" fill="none" strokeLinecap="round" opacity="0.4" />
        </svg>
      </motion.div>

      {/* ── Dots + button ── */}
      <motion.div
        className="w-full px-8 pb-14 flex flex-col items-center gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white/70" />
          <span className="w-2 h-2 rounded-full bg-white/25" />
          <span className="w-2 h-2 rounded-full bg-white/25" />
          <span className="w-2 h-2 rounded-full bg-white/25" />
        </div>
        <button
          onClick={onGetStarted}
          className="w-full py-4 rounded-full text-white font-semibold text-base active:scale-[0.97] transition-transform"
          style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" }}
        >
          Get Started
        </button>
      </motion.div>
    </div>
  );
}

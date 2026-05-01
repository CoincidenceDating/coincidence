import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [pathDone, setPathDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPathDone(true), 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center overflow-hidden"
      style={{ background: "#08080f" }}
    >
      {/* ── Ambient glow blobs ── */}
      <div
        aria-hidden
        style={{
          position: "absolute", top: "8%", left: "15%",
          width: 180, height: 180,
          background: "radial-gradient(circle, rgba(232,56,125,0.22) 0%, transparent 70%)",
          filter: "blur(32px)", pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute", top: "32%", right: "12%",
          width: 200, height: 200,
          background: "radial-gradient(circle, rgba(155,93,229,0.20) 0%, transparent 70%)",
          filter: "blur(40px)", pointerEvents: "none",
        }}
      />

      {/* ── String visual ── */}
      <div className="w-full flex-1 flex items-center justify-center" style={{ maxHeight: "52%", minHeight: 0 }}>
        <svg
          viewBox="0 0 320 260"
          style={{ width: "100%", maxWidth: 380, height: "100%" }}
          aria-hidden
        >
          <defs>
            <linearGradient id="stringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E8387D" />
              <stop offset="50%" stopColor="#C45AE8" />
              <stop offset="100%" stopColor="#9B5DE5" />
            </linearGradient>
            <filter id="glow-pink">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-purple">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-star">
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Glow halo around pink dot */}
          <motion.circle
            cx={88} cy={62}
            r={22}
            fill="rgba(232,56,125,0.15)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
            transition={{ delay: 0.2, duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.circle
            cx={88} cy={62}
            r={12}
            fill="rgba(232,56,125,0.25)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4, ease: "easeOut" }}
          />

          {/* Glow halo around purple dot */}
          <motion.circle
            cx={238} cy={200}
            r={22}
            fill="rgba(155,93,229,0.15)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
            transition={{ delay: 1.6, duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.circle
            cx={238} cy={200}
            r={12}
            fill="rgba(155,93,229,0.25)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.4, ease: "easeOut" }}
          />

          {/* Glow behind path */}
          <motion.path
            d="M 88 62 C 72 130, 215 90, 195 152 C 178 206, 252 176, 238 200"
            stroke="url(#stringGrad)"
            strokeWidth={12}
            fill="none"
            strokeLinecap="round"
            opacity={0.18}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, delay: 0.3, ease: "easeInOut" }}
          />

          {/* Main path */}
          <motion.path
            d="M 88 62 C 72 130, 215 90, 195 152 C 178 206, 252 176, 238 200"
            stroke="url(#stringGrad)"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, delay: 0.3, ease: "easeInOut" }}
          />

          {/* Pink dot (filled) */}
          <motion.circle
            cx={88} cy={62} r={8}
            fill="#E8387D"
            filter="url(#glow-pink)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.35, type: "spring", stiffness: 400 }}
          />

          {/* Purple dot (filled) */}
          <motion.circle
            cx={238} cy={200} r={8}
            fill="#9B5DE5"
            filter="url(#glow-purple)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.45, duration: 0.35, type: "spring", stiffness: 400 }}
          />

          {/* Star / sparkle at intersection — appears when path finishes */}
          {pathDone && (
            <>
              {/* Outer glow */}
              <motion.circle
                cx={197} cy={139} r={28}
                fill="rgba(255,255,255,0.04)"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [1, 1.5, 1], opacity: [0.04, 0.1, 0.04] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* Inner glow */}
              <motion.circle
                cx={197} cy={139} r={14}
                fill="rgba(255,255,255,0.08)"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
              {/* 4-pointed star */}
              <motion.g
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                style={{ transformOrigin: "197px 139px" }}
                filter="url(#glow-star)"
              >
                {/* Vertical ray */}
                <line x1="197" y1="121" x2="197" y2="157" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
                {/* Horizontal ray */}
                <line x1="179" y1="139" x2="215" y2="139" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
                {/* Diagonal rays (shorter) */}
                <line x1="185" y1="127" x2="209" y2="151" stroke="white" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
                <line x1="209" y1="127" x2="185" y2="151" stroke="white" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
                {/* Center bright dot */}
                <circle cx="197" cy="139" r="3" fill="white" />
              </motion.g>
            </>
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
          className="mt-5 text-white/45 font-semibold tracking-[0.22em] leading-relaxed"
          style={{ fontSize: "clamp(0.6rem, 2.8vw, 0.72rem)" }}
        >
          SOME CONNECTIONS<br />ARE MEANT TO FIND YOU.
        </p>
      </motion.div>

      {/* ── Wave decoration ── */}
      <motion.div
        className="w-full mt-auto"
        style={{ marginTop: "auto", flexShrink: 0 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
      >
        <svg
          viewBox="0 0 390 120"
          style={{ display: "block", width: "100%", height: 120, overflow: "visible" }}
          aria-hidden
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E8387D" stopOpacity="0" />
              <stop offset="30%" stopColor="#E8387D" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#C45AE8" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#9B5DE5" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9B5DE5" stopOpacity="0" />
              <stop offset="40%" stopColor="#9B5DE5" stopOpacity="0.25" />
              <stop offset="70%" stopColor="#E8387D" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#E8387D" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="waveGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E8387D" stopOpacity="0" />
              <stop offset="50%" stopColor="#C45AE8" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#9B5DE5" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Wave layer 1 - prominent */}
          <path
            d="M -30 80 C 60 40, 120 100, 195 65 C 270 30, 330 90, 420 55"
            stroke="url(#waveGrad1)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          {/* Wave layer 2 - offset */}
          <path
            d="M -40 95 C 50 60, 130 110, 195 78 C 260 46, 340 100, 430 70"
            stroke="url(#waveGrad2)"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />
          {/* Wave layer 3 - subtle */}
          <path
            d="M -20 68 C 70 30, 140 85, 195 55 C 250 25, 320 80, 410 45"
            stroke="url(#waveGrad3)"
            strokeWidth="0.8"
            fill="none"
            strokeLinecap="round"
          />
          {/* Wave layer 4 - deep */}
          <path
            d="M 0 108 C 80 75, 150 118, 220 90 C 290 62, 355 108, 430 82"
            stroke="url(#waveGrad1)"
            strokeWidth="0.7"
            fill="none"
            strokeLinecap="round"
            opacity="0.5"
          />
          {/* Wave layer 5 - very subtle */}
          <path
            d="M -50 55 C 30 28, 100 72, 180 48 C 260 24, 335 68, 430 40"
            stroke="url(#waveGrad2)"
            strokeWidth="0.5"
            fill="none"
            strokeLinecap="round"
            opacity="0.4"
          />
        </svg>
      </motion.div>

      {/* ── Pagination dots + button ── */}
      <motion.div
        className="w-full px-8 pb-14 flex flex-col items-center gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
      >
        {/* Dots */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white/70" />
          <span className="w-2 h-2 rounded-full bg-white/25" />
          <span className="w-2 h-2 rounded-full bg-white/25" />
          <span className="w-2 h-2 rounded-full bg-white/25" />
        </div>

        {/* Get Started button */}
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

import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Sparkles, X } from "lucide-react";
import { type Match, type Profile } from "@/lib/data";
import { useEffect, useRef } from "react";

interface MatchOverlayProps {
  match: Match;
  myProfile: Profile;
  onMessage: (match: Match) => void;
  onDismiss: () => void;
}

function Avatar({ profile, size = 120 }: { profile: Profile; size?: number }) {
  const src = profile.photos?.[0] ?? profile.photo;
  return (
    <div
      className="rounded-full overflow-hidden border-[3px] border-white/30 shadow-2xl flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt={profile.name} className="w-full h-full object-cover" />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center text-white font-bold"
          style={{ background: profile.gradient, fontSize: size * 0.33 }}
        >
          {profile.avatar}
        </div>
      )}
    </div>
  );
}

const PARTICLE_COUNT = 28;

function Particles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
        const angle  = (i / PARTICLE_COUNT) * 360;
        const radius = 55 + Math.random() * 40;
        const delay  = Math.random() * 0.6;
        const size   = 3 + Math.random() * 5;
        const colors = ["#E8387D", "#9B5DE5", "#FF6BB5", "#C084FC", "#F472B6", "#FDE68A"];
        const color  = colors[i % colors.length];
        const tx = Math.cos((angle * Math.PI) / 180) * radius * (2 + Math.random());
        const ty = Math.sin((angle * Math.PI) / 180) * radius * (2 + Math.random());
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size, height: size,
              background: color,
              top: "50%", left: "50%",
              x: "-50%", y: "-50%",
            }}
            initial={{ opacity: 1, x: "-50%", y: "-50%", scale: 1 }}
            animate={{ opacity: [1, 1, 0], x: `calc(-50% + ${tx}vw)`, y: `calc(-50% + ${ty}vh)`, scale: [1, 0.8, 0] }}
            transition={{ duration: 1.4 + Math.random() * 0.6, delay, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

export default function MatchOverlay({ match, myProfile, onMessage, onDismiss }: MatchOverlayProps) {
  const { profile } = match;
  const dismissedRef = useRef(false);

  // Auto-dismiss after 12 seconds if the user doesn't interact
  useEffect(() => {
    const id = setTimeout(() => {
      if (!dismissedRef.current) onDismiss();
    }, 12000);
    return () => clearTimeout(id);
  }, [onDismiss]);

  function dismiss() {
    dismissedRef.current = true;
    onDismiss();
  }

  function goToMessage() {
    dismissedRef.current = true;
    onMessage(match);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 flex flex-col items-center justify-center text-center px-6"
      style={{ zIndex: 9999, background: "rgba(5,3,14,0.94)", backdropFilter: "blur(12px)" }}
      onClick={dismiss}
    >
      <Particles />

      {/* Close button */}
      <button
        onClick={dismiss}
        className="absolute top-5 right-5 p-2 rounded-full text-white/50 hover:text-white/80 transition-colors"
        style={{ background: "rgba(255,255,255,0.07)" }}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
        className="mb-8 space-y-1"
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-pink-400" />
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-pink-400">
            It's a Match
          </span>
          <Sparkles className="w-5 h-5 text-pink-400" />
        </div>
        <p
          className="text-5xl font-extrabold leading-none"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {profile.name.split(" ")[0]}
        </p>
        <p className="text-sm text-white/50">liked you back</p>
      </motion.div>

      {/* Avatars */}
      <motion.div
        initial={{ opacity: 0, scale: 0.75 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.25, duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
        className="flex items-center gap-0 mb-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* My photo */}
        <motion.div
          initial={{ x: 30 }}
          animate={{ x: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
          style={{ zIndex: 2, filter: "drop-shadow(0 0 18px rgba(155,93,229,0.55))" }}
        >
          <Avatar profile={myProfile} size={112} />
        </motion.div>

        {/* Heart connector */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          className="relative z-10 mx-[-12px] w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)", boxShadow: "0 0 24px rgba(232,56,125,0.6)" }}
        >
          <span className="text-white text-lg">♥</span>
        </motion.div>

        {/* Their photo */}
        <motion.div
          initial={{ x: -30 }}
          animate={{ x: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
          style={{ zIndex: 2, filter: "drop-shadow(0 0 18px rgba(232,56,125,0.55))" }}
        >
          <Avatar profile={profile} size={112} />
        </motion.div>
      </motion.div>

      {/* Bio snippet */}
      {profile.bio && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          className="text-sm text-white/50 max-w-[240px] leading-relaxed mb-8 line-clamp-2"
        >
          "{profile.bio}"
        </motion.p>
      )}

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65, duration: 0.4 }}
        className="flex flex-col gap-3 w-full max-w-[280px]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={goToMessage}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-sm font-bold text-white transition-opacity active:opacity-80"
          style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)", boxShadow: "0 4px 24px rgba(232,56,125,0.35)" }}
        >
          <MessageCircle className="w-4 h-4" />
          Send a Message
        </button>
        <button
          onClick={dismiss}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-white/60 transition-colors active:text-white/80"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          Keep Swiping
        </button>
      </motion.div>
    </motion.div>
  );
}

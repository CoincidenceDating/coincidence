import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { swipeProfiles, type Match } from "@/lib/data";
import { SwipeCard } from "@/components/SwipeCard";
import { StringIcon } from "@/components/StringIcon";

function formatBoostTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface SwipePageProps {
  onMatch: (match: Match) => void;
  onMaybe: (match: Match) => void;
  isBoostActive: boolean;
  boostTimeLeft: number;
  boostRadius: number;
  boostCredits: number;
  onActivateBoost: () => void;
}

export default function SwipePage({
  onMatch,
  onMaybe,
  isBoostActive,
  boostTimeLeft,
  boostRadius,
  boostCredits,
  onActivateBoost,
}: SwipePageProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pulse, setPulse] = useState(false);

  function handleSwipe(dir: "left" | "right" | "maybe") {
    const profile = swipeProfiles[currentIndex];
    if (profile) {
      if (dir === "right") {
        onMatch({ profile, source: "swipe", matchedAt: Date.now() });
      } else if (dir === "maybe") {
        onMaybe({ profile, source: "swipe", matchedAt: Date.now() });
      }
    }
    setCurrentIndex((prev) => (prev + 1) % swipeProfiles.length);
  }

  function handleActivate() {
    if (boostCredits <= 0 || isBoostActive) return;
    onActivateBoost();
    setPulse(true);
    setTimeout(() => setPulse(false), 700);
  }

  const profile = swipeProfiles[currentIndex];
  if (!profile) return null;

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-4">

      {/* String button — top right */}
      <div className="absolute top-4 right-4 z-10">
        <AnimatePresence mode="wait">
          {isBoostActive ? (
            /* Compact active state */
            <motion.div
              key="active-pill"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold"
            >
              <motion.div
                animate={{ opacity: [1, 0.35, 1] }}
                transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
              >
                <StringIcon className="w-3.5 h-3.5" />
              </motion.div>
              {boostRadius} mi · {formatBoostTime(boostTimeLeft)}
            </motion.div>
          ) : (
            /* Idle — tappable activate button */
            <motion.button
              key="idle-btn"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={pulse ? { scale: [1, 1.18, 1] } : { opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              onClick={handleActivate}
              disabled={boostCredits === 0}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full border transition-all
                ${boostCredits > 0
                  ? "bg-background border-border hover:border-foreground/60 hover:bg-muted active:scale-95"
                  : "bg-background border-border opacity-35 cursor-not-allowed"
                }`}
            >
              <StringIcon className="w-4 h-4 text-foreground" />
              <span className="text-xs font-semibold text-foreground tabular-nums">
                {boostCredits}
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Spacer so card doesn't sit under button */}
      <div className="h-10" />

      <SwipeCard
        key={profile.id}
        profile={profile}
        onSwipe={handleSwipe}
        progress={`${currentIndex + 1} / ${swipeProfiles.length}`}
      />
    </div>
  );
}

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { swipeProfiles, filterByLookingFor, type Match } from "@/lib/data";
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
  lookingFor: string;
}

export default function SwipePage({
  onMatch,
  onMaybe,
  isBoostActive,
  boostTimeLeft,
  boostRadius,
  boostCredits,
  onActivateBoost,
  lookingFor,
}: SwipePageProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pulse, setPulse] = useState(false);

  const filteredProfiles = filterByLookingFor(swipeProfiles, lookingFor);

  function handleSwipe(dir: "left" | "right" | "maybe") {
    const profile = filteredProfiles[currentIndex];
    if (profile) {
      if (dir === "right") {
        onMatch({ profile, source: "swipe", matchedAt: Date.now() });
      } else if (dir === "maybe") {
        onMaybe({ profile, source: "swipe", matchedAt: Date.now() });
      }
    }
    setCurrentIndex((prev) => (prev + 1) % Math.max(filteredProfiles.length, 1));
  }

  function handleActivate() {
    if (boostCredits <= 0 || isBoostActive) return;
    onActivateBoost();
    setPulse(true);
    setTimeout(() => setPulse(false), 700);
  }

  const profile = filteredProfiles[currentIndex];

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

      {profile ? (
        <SwipeCard
          key={profile.id}
          profile={profile}
          onSwipe={handleSwipe}
          peekProfiles={filteredProfiles.slice(currentIndex + 1, currentIndex + 3)}
        />
      ) : (
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="font-semibold text-foreground">No profiles nearby</p>
          <p className="text-sm text-muted-foreground">Try adjusting your preferences in your profile to see more people.</p>
        </div>
      )}
    </div>
  );
}

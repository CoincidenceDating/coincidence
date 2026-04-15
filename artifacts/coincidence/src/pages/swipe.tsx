import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { swipeProfiles, type Match } from "@/lib/data";
import { SwipeCard } from "@/components/SwipeCard";
import { Zap } from "lucide-react";

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
}

export default function SwipePage({ onMatch, onMaybe, isBoostActive, boostTimeLeft }: SwipePageProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

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

  const profile = swipeProfiles[currentIndex];
  if (!profile) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-4">
      {/* Boost active banner */}
      <div className="mb-3 h-8 flex items-center">
        <AnimatePresence>
          {isBoostActive && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold"
            >
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Zap className="w-3.5 h-3.5 fill-background" />
              </motion.div>
              Boosted · {formatBoostTime(boostTimeLeft)} left
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SwipeCard
        key={profile.id}
        profile={profile}
        onSwipe={handleSwipe}
        progress={`${currentIndex + 1} / ${swipeProfiles.length}`}
      />
    </div>
  );
}

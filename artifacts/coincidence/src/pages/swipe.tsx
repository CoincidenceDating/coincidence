import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { swipeProfiles, filterByLookingFor, type Match } from "@/lib/data";
import { SwipeCard } from "@/components/SwipeCard";
import { StringIcon } from "@/components/StringIcon";
import { MapPin } from "lucide-react";

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
  onDoubleStringCredit: () => void;
  lookingFor: string;
  blockedIds: string[];
  swipedIds: string[];
  onSwiped: (id: string) => void;
}

export default function SwipePage({
  onMatch,
  onMaybe,
  isBoostActive,
  boostTimeLeft,
  boostRadius,
  boostCredits,
  onActivateBoost,
  onDoubleStringCredit,
  lookingFor,
  blockedIds,
  swipedIds,
  onSwiped,
}: SwipePageProps) {
  const [pulse, setPulse] = useState(false);

  const filteredProfiles = filterByLookingFor(swipeProfiles, lookingFor)
    .filter((p) => !blockedIds.includes(p.id) && !swipedIds.includes(p.id));

  const profile = filteredProfiles[0];

  function handleSwipe(dir: "left" | "right" | "maybe") {
    if (!profile) return;
    if (dir === "right") {
      onMatch({ profile, source: "swipe", matchedAt: Date.now() });
    } else if (dir === "maybe") {
      onMaybe({ profile, source: "swipe", matchedAt: Date.now() });
    }
    onSwiped(profile.id);
  }

  function handleDoubleString() {
    if (!profile || boostCredits < 2) return;
    onMatch({ profile, source: "swipe", matchedAt: Date.now(), superLike: true });
    onDoubleStringCredit();
    onSwiped(profile.id);
  }

  function handleActivate() {
    if (boostCredits <= 0 || isBoostActive) return;
    onActivateBoost();
    setPulse(true);
    setTimeout(() => setPulse(false), 700);
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-4">

      {/* String button — top right */}
      <div className="absolute top-4 right-4 z-10">
        <AnimatePresence mode="wait">
          {isBoostActive ? (
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

      <div className="h-10" />

      <AnimatePresence mode="wait">
        {profile ? (
          <motion.div key={profile.id} className="w-full flex justify-center">
            <SwipeCard
              profile={profile}
              onSwipe={handleSwipe}
              peekProfiles={filteredProfiles.slice(1, 3)}
              onDoubleString={handleDoubleString}
              boostCredits={boostCredits}
            />
          </motion.div>
        ) : (
          <motion.div
            key="all-done"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center gap-5 text-center px-8"
          >
            {/* Animated string icon */}
            <motion.div
              className="w-20 h-20 rounded-full bg-muted flex items-center justify-center"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <StringIcon className="w-9 h-9 text-muted-foreground" />
            </motion.div>

            <div className="space-y-2">
              <p className="text-lg font-semibold text-foreground" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                You've seen everyone nearby
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You've interacted with everyone in your radius. Check back later — or switch to the Coincidence tab to find people at places you visit.
              </p>
            </div>

            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted text-muted-foreground text-xs">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>Try checking into a new place to discover more people</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

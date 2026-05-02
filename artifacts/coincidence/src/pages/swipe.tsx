import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type Match, type Profile } from "@/lib/data";
import { isRealUserId } from "@/lib/db";
import { SwipeCard } from "@/components/SwipeCard";
import { StringIcon } from "@/components/StringIcon";
import { MapPin, User, Sparkles, Loader2 } from "lucide-react";

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
  blockedIds: string[];
  onSwiped: (id: string, liked: boolean) => void;
  onRealRightSwipe: (profile: Profile) => void;
  onGoToProfile: () => void;
  discoverProfiles: Profile[];
  isLoadingProfiles: boolean;
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
  blockedIds,
  onSwiped,
  onRealRightSwipe,
  onGoToProfile,
  discoverProfiles,
  isLoadingProfiles,
}: SwipePageProps) {
  const [pulse, setPulse] = useState(false);
  const [stringSentName, setStringSentName] = useState<string | null>(null);

  const filteredProfiles = (discoverProfiles ?? []).filter((p) => !blockedIds.includes(p.id));

  const profile = filteredProfiles[0];

  function handleSwipe(dir: "left" | "right" | "maybe") {
    if (!profile) return;
    if (dir === "right" && isRealUserId(profile.id)) {
      onRealRightSwipe(profile);
      setStringSentName(profile.name.split(" ")[0]);
      setTimeout(() => setStringSentName(null), 2800);
    } else {
      if (dir === "right") onMatch({ profile, source: "swipe", matchedAt: Date.now() });
      else if (dir === "maybe") onMaybe({ profile, source: "swipe", matchedAt: Date.now() });
      onSwiped(profile.id, dir === "right");
    }
  }

  function handleDoubleString() {
    if (!profile || boostCredits < 2) return;
    onMatch({ profile, source: "swipe", matchedAt: Date.now(), superLike: true });
    onDoubleStringCredit();
    onSwiped(profile.id, true);
  }

  function handleActivate() {
    if (boostCredits <= 0 || isBoostActive) return;
    onActivateBoost();
    setPulse(true);
    setTimeout(() => setPulse(false), 700);
  }

  return (
    <div className="relative flex flex-col items-center min-h-[calc(100vh-80px)] px-4 pt-0 pb-4">

      {/* ── Header ── */}
      <div className="w-full max-w-sm flex items-center justify-between py-4 mb-1">
        {/* Profile icon */}
        <button onClick={onGoToProfile} className="w-9 h-9 rounded-full bg-card border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <User className="w-4.5 h-4.5" />
        </button>

        {/* Gradient "coincidence" wordmark */}
        <h1
          className="gradient-text font-bold tracking-tight select-none"
          style={{ fontSize: "clamp(1.25rem, 5vw, 1.5rem)", fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: "italic" }}
        >
          coincidence
        </h1>

        {/* String / boost button */}
        <AnimatePresence mode="wait">
          {isBoostActive ? (
            <motion.div
              key="active-pill"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" }}
            >
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
              >
                <StringIcon className="w-3 h-3" />
              </motion.div>
              {formatBoostTime(boostTimeLeft)} · {boostRadius}mi
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
              className={`relative w-9 h-9 rounded-full flex items-center justify-center border transition-all
                ${boostCredits > 0
                  ? "bg-card border-white/10 hover:border-primary/60 active:scale-95 text-muted-foreground hover:text-primary"
                  : "bg-card border-white/10 opacity-35 cursor-not-allowed text-muted-foreground"
                }`}
            >
              <Sparkles className="w-4 h-4" />
              {boostCredits > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" }}
                >
                  {boostCredits}
                </span>
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Tagline */}
      <div className="w-full max-w-sm mb-3 text-center">
        <p className="text-muted-foreground text-xs tracking-wide">Paths cross for a reason.</p>
      </div>

      <AnimatePresence mode="wait">
        {isLoadingProfiles ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 pt-12"
          >
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Finding people near you…</p>
          </motion.div>
        ) : profile ? (
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
                Check back later — or switch to the Coincidence tab to find people at places you visit.
              </p>
            </div>

            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted text-muted-foreground text-xs">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>Try checking into a new place to discover more people</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── String sent toast ── */}
      <AnimatePresence>
        {stringSentName && (
          <motion.div
            key="string-sent"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl text-white text-sm font-medium shadow-xl"
            style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" }}
          >
            <StringIcon className="w-4 h-4 shrink-0" />
            String sent to {stringSentName} — you'll match when they like you back
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

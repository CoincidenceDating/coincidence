import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X, Heart, Lock, Clock } from "lucide-react";
import type { Profile } from "@/lib/data";

interface LikedPageProps {
  whoLikedMeCount: number;
  whoLikedMeProfiles: Profile[];
  hasWhoLikedMeAccess: boolean;
  whoLikedMeExpiresAt: number | null;
  onUnlockWhoLikedMe: () => Promise<void>;
  onLikeBack: (profile: Profile) => void;
  onPassLiker: (profile: Profile) => void;
}

function timeLeft(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "expired";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

const BLUR_GRADIENTS = [
  "linear-gradient(135deg,#E8387D 0%,#9B5DE5 100%)",
  "linear-gradient(135deg,#9B5DE5 0%,#3B82F6 100%)",
  "linear-gradient(135deg,#E8387D 0%,#F59E0B 100%)",
  "linear-gradient(135deg,#06B6D4 0%,#9B5DE5 100%)",
  "linear-gradient(135deg,#10B981 0%,#3B82F6 100%)",
  "linear-gradient(135deg,#F59E0B 0%,#E8387D 100%)",
];

export default function LikedPage({
  whoLikedMeCount,
  whoLikedMeProfiles,
  hasWhoLikedMeAccess,
  whoLikedMeExpiresAt,
  onUnlockWhoLikedMe,
  onLikeBack,
  onPassLiker,
}: LikedPageProps) {
  const [unlocking, setUnlocking] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    if (!whoLikedMeExpiresAt) return;
    const tick = () => setTimeStr(timeLeft(whoLikedMeExpiresAt));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [whoLikedMeExpiresAt]);

  async function handleUnlock() {
    setUnlocking(true);
    try {
      await onUnlockWhoLikedMe();
    } finally {
      setUnlocking(false);
      setShowPaywall(false);
    }
  }

  const blurCount = Math.max(Math.min(whoLikedMeCount, 6), 3);

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] px-4 pt-6 pb-6">

      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Heart className="w-5 h-5 text-foreground" />
        <h1 className="text-xl font-bold">Liked you</h1>
        {whoLikedMeCount > 0 && (
          <span className="ml-auto text-sm text-muted-foreground">
            {whoLikedMeCount} {whoLikedMeCount === 1 ? "person" : "people"}
          </span>
        )}
      </div>

      {/* Empty state */}
      {whoLikedMeCount === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 text-center">
          <svg viewBox="0 0 120 40" className="w-48 opacity-40 mb-4">
            <path
              d="M10 28 C 20 14, 30 10, 40 18 C 50 26, 50 34, 60 34 C 70 34, 70 18, 80 14 C 90 10, 100 18, 110 24"
              stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"
            />
          </svg>
          <p className="text-muted-foreground text-sm max-w-xs">
            Nobody has liked you yet — keep swiping and let fate work.
          </p>
        </div>
      )}

      {/* Locked state */}
      {whoLikedMeCount > 0 && !hasWhoLikedMeAccess && (
        <div className="relative rounded-3xl overflow-hidden border border-border flex-1 min-h-[320px]">
          {/* Blurred mosaic */}
          <div className="grid grid-cols-3 gap-0.5 p-0.5 blur-sm select-none pointer-events-none h-full" aria-hidden>
            {Array.from({ length: blurCount }).map((_, i) => (
              <div
                key={i}
                className="rounded-sm"
                style={{ background: BLUR_GRADIENTS[i % BLUR_GRADIENTS.length], minHeight: 120 }}
              />
            ))}
          </div>

          {/* Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center mb-4">
              <Lock className="w-5 h-5 text-foreground" />
            </div>
            <p className="text-3xl font-bold mb-1">{whoLikedMeCount}</p>
            <p className="text-muted-foreground text-sm mb-6">
              {whoLikedMeCount === 1 ? "person liked you" : "people liked you"}
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowPaywall(true)}
              className="px-6 py-3.5 rounded-2xl text-white text-sm font-semibold shadow-lg"
              style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" }}
            >
              See what fate already started · £5 · 24h
            </motion.button>
          </div>
        </div>
      )}

      {/* Unlocked state */}
      {whoLikedMeCount > 0 && hasWhoLikedMeAccess && (
        <div className="space-y-1">
          {whoLikedMeExpiresAt && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 px-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Access active · {timeStr}</span>
            </div>
          )}
          {whoLikedMeProfiles.map((profile) => (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 pr-2 rounded-2xl border bg-card shadow-sm"
            >
              <div
                className="w-14 h-14 rounded-xl shrink-0 overflow-hidden flex items-center justify-center text-base font-bold text-white/70"
                style={{ background: profile.gradient }}
              >
                {profile.photo
                  ? <img src={profile.photo} alt={profile.name} className="w-full h-full object-cover" />
                  : profile.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm">{profile.name}, {profile.age}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{profile.bio}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => onPassLiker(profile)}
                  className="w-10 h-10 rounded-full border-2 border-destructive/30 text-destructive hover:bg-destructive/10 active:scale-95 transition-all flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onLikeBack(profile)}
                  className="w-10 h-10 rounded-full active:scale-95 transition-all flex items-center justify-center text-white"
                  style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" }}
                >
                  <Heart className="w-4 h-4 fill-white" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Paywall modal */}
      <AnimatePresence>
        {showPaywall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm px-4 pb-6"
            onClick={(e) => { if (e.target === e.currentTarget) setShowPaywall(false); }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="w-full max-w-md bg-background rounded-3xl px-6 pt-6 pb-8 space-y-5"
            >
              <div className="text-center space-y-1">
                <div
                  className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3"
                  style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" }}
                >
                  <Heart className="w-7 h-7 fill-white text-white" />
                </div>
                <h2 className="text-xl font-bold">See what fate already started</h2>
                <p className="text-sm text-muted-foreground">
                  {whoLikedMeCount} {whoLikedMeCount === 1 ? "person is" : "people are"} waiting for you to notice them
                </p>
              </div>

              <div className="space-y-2.5 text-sm">
                {[
                  "See every profile that liked you",
                  "Like them back for an instant match",
                  "Full 24-hour access",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2.5 text-muted-foreground">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" }}
                    >
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    {f}
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-1">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={unlocking}
                  onClick={handleUnlock}
                  className="w-full py-4 rounded-2xl text-white font-semibold text-sm disabled:opacity-60 transition-opacity"
                  style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" }}
                >
                  {unlocking ? "Processing…" : "Unlock for £5 · 24 hours"}
                </motion.button>
                <button
                  onClick={() => setShowPaywall(false)}
                  className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Not now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

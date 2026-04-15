import { myProfile, type Match, type CheckIn } from "@/lib/data";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MapPin, Zap, Wine, Beer, Coffee, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const locationIconMap: Record<string, React.ReactNode> = {
  wine:     <Wine className="w-4 h-4" />,
  beer:     <Beer className="w-4 h-4" />,
  coffee:   <Coffee className="w-4 h-4" />,
  sparkles: <Sparkles className="w-4 h-4" />,
};

const MAX_CREDITS = 5;
const BOOST_DURATION_MS = 30 * 60 * 1000;

function formatCheckInTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const d = new Date(ts);
  const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (diff < 60_000) return "Just now";
  if (diff < 86_400_000) return `Today, ${timeStr}`;
  if (diff < 172_800_000) return `Yesterday, ${timeStr}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${timeStr}`;
}

function formatBoostTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface ProfilePageProps {
  matches: Match[];
  checkIns: CheckIn[];
  boostCredits: number;
  isBoostActive: boolean;
  boostTimeLeft: number;
  onActivateBoost: () => void;
}

export default function ProfilePage({
  matches,
  checkIns,
  boostCredits,
  isBoostActive,
  boostTimeLeft,
  onActivateBoost,
}: ProfilePageProps) {
  const totalMatches = matches.length;
  const coincidenceMatches = matches.filter((m) => m.source !== "swipe").length;

  const matchesByLocation = matches.reduce<Record<string, number>>((acc, m) => {
    if (m.source !== "swipe") acc[m.source] = (acc[m.source] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] px-4 py-8 max-w-md mx-auto w-full">

      {/* Avatar + name */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="relative mb-4">
          {/* Boost aura ring */}
          <AnimatePresence>
            {isBoostActive && (
              <motion.div
                key="aura"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0.6, 0.2, 0.6], scale: [1, 1.08, 1] }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full bg-foreground"
                style={{ margin: "-6px" }}
              />
            )}
          </AnimatePresence>
          <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-foreground text-background text-3xl font-bold z-10">
            {myProfile.avatar}
            {isBoostActive && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-background border-2 border-foreground flex items-center justify-center z-20"
              >
                <Zap className="w-3.5 h-3.5 fill-foreground" />
              </motion.div>
            )}
          </div>
        </div>
        <h1 className="text-2xl font-bold">{myProfile.name}</h1>
        <p className="text-muted-foreground text-sm">{myProfile.age} years old</p>
        <p className="text-sm mt-2 max-w-xs text-foreground/80 leading-relaxed">{myProfile.bio}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <Heart className="w-5 h-5 mx-auto mb-1 fill-foreground" />
            <p className="text-2xl font-bold">{totalMatches}</p>
            <p className="text-xs text-muted-foreground">Matches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="w-5 h-5 mx-auto mb-1 fill-foreground" />
            <p className="text-2xl font-bold">{coincidenceMatches}</p>
            <p className="text-xs text-muted-foreground">Coincidences</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <MapPin className="w-5 h-5 mx-auto mb-1 fill-foreground" />
            <p className="text-2xl font-bold">{checkIns.length}</p>
            <p className="text-xs text-muted-foreground">Check-ins</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Boost section ── */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Boost
        </h2>

        {/* Credit pips */}
        <div className="flex items-center gap-1.5 mb-3">
          {Array.from({ length: MAX_CREDITS }).map((_, i) => (
            <motion.div
              key={i}
              animate={isBoostActive && i === 0 ? { scale: [1, 1.25, 1] } : {}}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
            >
              <Zap
                className={`w-5 h-5 transition-colors ${
                  i < boostCredits
                    ? "fill-foreground text-foreground"
                    : "text-muted-foreground/25"
                }`}
              />
            </motion.div>
          ))}
          <span className="ml-1 text-sm text-muted-foreground">
            {boostCredits} / {MAX_CREDITS} boost{boostCredits !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Active state or activate button */}
        <AnimatePresence mode="wait">
          {isBoostActive ? (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center justify-between p-4 rounded-xl bg-foreground text-background"
            >
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  <Zap className="w-4 h-4 fill-background" />
                </motion.div>
                <span className="text-sm font-semibold">Boost active</span>
              </div>
              <span className="text-sm font-mono tabular-nums">
                {formatBoostTime(boostTimeLeft)}
              </span>
            </motion.div>
          ) : (
            <motion.button
              key="idle"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              onClick={onActivateBoost}
              disabled={boostCredits === 0}
              className="w-full py-3.5 rounded-xl bg-foreground text-background text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-35 hover:bg-foreground/85 active:scale-[0.98] transition-all"
            >
              <Zap className="w-4 h-4 fill-background" />
              Activate Boost
              {boostCredits > 0 && (
                <span className="ml-1 text-background/60 text-xs font-normal">
                  · uses 1 of {boostCredits}
                </span>
              )}
            </motion.button>
          )}
        </AnimatePresence>

        <p className="text-xs text-muted-foreground text-center mt-2">
          {boostCredits < MAX_CREDITS
            ? "Earn boosts by checking into new places"
            : "Boost credits full — start swiping!"}
        </p>

        {/* Progress bar showing boost drain */}
        {isBoostActive && (
          <motion.div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-foreground rounded-full"
              initial={{ width: "100%" }}
              animate={{ width: `${(boostTimeLeft / BOOST_DURATION_MS) * 100}%` }}
              transition={{ duration: 0.5, ease: "linear" }}
            />
          </motion.div>
        )}
      </div>

      {/* Interests */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Interests
        </h2>
        <div className="flex flex-wrap gap-2">
          {myProfile.interests.map((interest) => (
            <span
              key={interest}
              className="px-3 py-1.5 rounded-full bg-muted text-foreground text-sm font-medium"
            >
              {interest}
            </span>
          ))}
        </div>
      </div>

      {/* Places I've been */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Places I've been
        </h2>
        {checkIns.length === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed text-muted-foreground">
            <MapPin className="w-5 h-5 opacity-40 shrink-0" />
            <p className="text-sm">Check in at locations to build your history</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...checkIns].reverse().map((ci) => {
              const metCount = matchesByLocation[ci.locationId] ?? 0;
              return (
                <div
                  key={`${ci.locationId}-${ci.checkedInAt}`}
                  className="flex items-center gap-3 p-3.5 rounded-xl border bg-card"
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-muted text-foreground shrink-0">
                    {locationIconMap[ci.locationIcon] ?? <MapPin className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{ci.locationName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatCheckInTime(ci.checkedInAt)}
                    </p>
                  </div>
                  {metCount > 0 && (
                    <span className="flex items-center gap-1 text-xs bg-foreground text-background px-2 py-1 rounded-full shrink-0">
                      <Heart className="w-2.5 h-2.5 fill-background" />
                      {metCount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tagline */}
      <div className="mt-auto pt-8 flex flex-col items-center gap-1">
        <svg width="40" height="32" viewBox="0 0 40 32" className="opacity-15">
          <path d="M 20 0 Q 6 16 20 32" stroke="#8B5E1A" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M 20 0 Q 34 16 20 32" stroke="#8B5E1A" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>
        <p className="text-xs text-muted-foreground italic">
          making the invisible string – visible
        </p>
      </div>
    </div>
  );
}

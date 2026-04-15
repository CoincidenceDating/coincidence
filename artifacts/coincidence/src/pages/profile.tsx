import { useState } from "react";
import { myProfile, type Match, type CheckIn } from "@/lib/data";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MapPin, Zap, Wine, Beer, Coffee, Sparkles, ShoppingBag, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StringIcon } from "@/components/StringIcon";

const locationIconMap: Record<string, React.ReactNode> = {
  wine:     <Wine className="w-4 h-4" />,
  beer:     <Beer className="w-4 h-4" />,
  coffee:   <Coffee className="w-4 h-4" />,
  sparkles: <Sparkles className="w-4 h-4" />,
};

const MAX_CREDITS = 5;
const BOOST_DURATION_MS = 30 * 60 * 1000;
const RADIUS_OPTIONS = [1, 5, 10, 25];

const STRING_PACKS = [
  { id: "s3",  count: 3,  label: "3 strings",  price: "$0.99",  tag: "" },
  { id: "s5",  count: 5,  label: "5 strings",  price: "$1.49",  tag: "Popular" },
  { id: "s10", count: 10, label: "10 strings", price: "$2.49",  tag: "Best value" },
];

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

function formatStringTime(ms: number): string {
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
  boostRadius: number;
  onBoostRadiusChange: (r: number) => void;
  onActivateBoost: () => void;
}

export default function ProfilePage({
  matches,
  checkIns,
  boostCredits,
  isBoostActive,
  boostTimeLeft,
  boostRadius,
  onBoostRadiusChange,
  onActivateBoost,
}: ProfilePageProps) {
  const [showStore, setShowStore] = useState(false);
  const [purchasedPack, setPurchasedPack] = useState<string | null>(null);

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
          {/* String aura ring */}
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
                <StringIcon className="w-3.5 h-3.5" />
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

      {/* ── String section ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            String
          </h2>
          <button
            onClick={() => setShowStore(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Get more
          </button>
        </div>

        {/* String pips */}
        <div className="flex items-center gap-1.5 mb-3">
          {Array.from({ length: MAX_CREDITS }).map((_, i) => (
            <motion.div
              key={i}
              animate={isBoostActive && i === 0 ? { scale: [1, 1.25, 1] } : {}}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
            >
              <StringIcon
                className={`w-5 h-5 transition-colors ${
                  i < boostCredits
                    ? "text-foreground"
                    : "text-muted-foreground/25"
                }`}
              />
            </motion.div>
          ))}
          <span className="ml-1 text-sm text-muted-foreground">
            {boostCredits} / {MAX_CREDITS} string{boostCredits !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Radius selector */}
        <div className="space-y-2 mb-3">
          <p className="text-xs text-muted-foreground">
            {isBoostActive
              ? `Visible to everyone within ${boostRadius} mi`
              : `Visible radius · select before pulling`}
          </p>
          <div className="flex gap-2">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => !isBoostActive && onBoostRadiusChange(r)}
                disabled={isBoostActive}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${
                  boostRadius === r
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
                } disabled:cursor-default`}
              >
                {r} mi
              </button>
            ))}
          </div>
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
                  <StringIcon className="w-4 h-4" />
                </motion.div>
                <span className="text-sm font-semibold">
                  Reaching {boostRadius} mi radius
                </span>
              </div>
              <span className="text-sm font-mono tabular-nums">
                {formatStringTime(boostTimeLeft)}
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
              <StringIcon className="w-4 h-4" />
              Pull your string
              {boostCredits > 0 && (
                <span className="ml-1 text-background/60 text-xs font-normal">
                  · {boostRadius} mi · uses 1 of {boostCredits}
                </span>
              )}
            </motion.button>
          )}
        </AnimatePresence>

        <p className="text-xs text-muted-foreground text-center mt-2">
          {isBoostActive
            ? "You're appearing to 3× more people nearby"
            : boostCredits < MAX_CREDITS
            ? "Earn strings by checking into new places"
            : "Strings full — start swiping!"}
        </p>

        {/* Progress bar showing string drain */}
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
      <div className="mt-auto pt-8 flex flex-col items-center gap-3">
        <img
          src="/logo.jpeg"
          alt="Coincidence"
          className="w-10 h-10 rounded-xl opacity-60"
        />
        <p className="text-xs text-muted-foreground italic">
          making the invisible string – visible
        </p>
      </div>

      {/* ── String Store overlay ── */}
      <AnimatePresence>
        {showStore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowStore(false); }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className="w-full max-w-md bg-background rounded-t-3xl px-6 pt-5 pb-10 space-y-6"
            >
              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-muted mx-auto" />

              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">Get more string</h2>
                  <p className="text-sm text-muted-foreground italic mt-0.5">
                    see what fate already started
                  </p>
                </div>
                <button
                  onClick={() => setShowStore(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* String illustration */}
              <div className="flex justify-center">
                <svg viewBox="0 0 120 40" className="w-48 opacity-70">
                  <path
                    d="M10 28 C 20 14, 30 10, 40 18 C 50 26, 50 34, 60 34 C 70 34, 70 18, 80 14 C 90 10, 100 18, 110 24"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d="M10 28 C 20 14, 30 10, 40 18 C 50 26, 50 34, 60 34 C 70 34, 70 18, 80 14 C 90 10, 100 18, 110 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeOpacity="0.25"
                    fill="none"
                    strokeLinecap="round"
                    transform="translate(0, 3)"
                  />
                </svg>
              </div>

              {/* Packs */}
              <div className="space-y-3">
                {STRING_PACKS.map((pack) => (
                  <motion.button
                    key={pack.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPurchasedPack(pack.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                      purchasedPack === pack.id
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex gap-0.5 ${purchasedPack === pack.id ? "text-background" : "text-foreground"}`}>
                        {Array.from({ length: Math.min(pack.count, 5) }).map((_, i) => (
                          <StringIcon key={i} className="w-4 h-4" />
                        ))}
                        {pack.count > 5 && <span className="text-xs font-bold ml-1">×{pack.count}</span>}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm">{pack.label}</p>
                        {pack.tag && (
                          <p className={`text-xs ${purchasedPack === pack.id ? "text-background/70" : "text-muted-foreground"}`}>
                            {pack.tag}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-sm">{pack.price}</span>
                  </motion.button>
                ))}
              </div>

              {/* Buy button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={!purchasedPack}
                className="w-full py-4 rounded-2xl bg-foreground text-background font-semibold text-sm disabled:opacity-30 transition-opacity"
                onClick={() => setShowStore(false)}
              >
                {purchasedPack
                  ? `Get ${STRING_PACKS.find((p) => p.id === purchasedPack)?.label}`
                  : "Choose a pack"}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

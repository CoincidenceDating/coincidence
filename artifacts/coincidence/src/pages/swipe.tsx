import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type Match, type Profile } from "@/lib/data";
import { isRealUserId } from "@/lib/db";
import { SwipeCard } from "@/components/SwipeCard";
import { StringIcon } from "@/components/StringIcon";
import { MapPin, User, Sparkles, Loader2, Navigation, LocateFixed, LockKeyhole } from "lucide-react";

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
  discoverRadius: number;
  gpsStatus: "idle" | "requesting" | "granted" | "denied";
  onRequestGps: () => void;
  onRadiusChange: (miles: number) => void;
  onReport: (profile: Profile, reason: string) => void;
}

const RADIUS_STEPS = [1, 5, 10, 15, 25, 50, 75, 100, 150, 200, 300];

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
  discoverRadius,
  gpsStatus,
  onRequestGps,
  onRadiusChange,
  onReport,
}: SwipePageProps) {
  const [pulse, setPulse] = useState(false);
  const [stringSentName, setStringSentName] = useState<string | null>(null);
  const [showRadiusPanel, setShowRadiusPanel] = useState(false);
  const [localRadius, setLocalRadius] = useState(discoverRadius);

  const hasGps = gpsStatus === "granted";

  // Auto-request GPS on mount so radius filter is always active
  useEffect(() => {
    if (gpsStatus === "idle") onRequestGps();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleRadiusCommit = useCallback((miles: number) => {
    setLocalRadius(miles);
    onRadiusChange(miles);
  }, [onRadiusChange]);

  const sliderIdx = RADIUS_STEPS.indexOf(localRadius) !== -1
    ? RADIUS_STEPS.indexOf(localRadius)
    : RADIUS_STEPS.findIndex(s => s >= localRadius) !== -1
      ? RADIUS_STEPS.findIndex(s => s >= localRadius)
      : RADIUS_STEPS.length - 1;

  return (
    <div className="relative flex flex-col items-center min-h-[calc(100vh-80px)] px-4 pt-0 pb-4">

      {/* ── Header ── */}
      <div className="w-full max-w-sm flex items-center justify-between py-4 mb-1">
        <button onClick={onGoToProfile} className="w-9 h-9 rounded-full bg-card border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <User className="w-4.5 h-4.5" />
        </button>

        <div className="flex flex-col items-start select-none" style={{ gap: 0 }}>
          <h1
            className="gradient-text font-bold tracking-tight"
            style={{ fontSize: "clamp(1.25rem, 5vw, 1.5rem)", fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: "italic", lineHeight: 1.1, marginBottom: 1 }}
          >
            Coincidence
          </h1>
          <svg
            width="100%" height="7" viewBox="0 0 130 7"
            preserveAspectRatio="none"
            style={{ display: "block", overflow: "visible" }}
          >
            <defs>
              <linearGradient id="c-underline-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#E8387D" />
                <stop offset="100%" stopColor="#9B5DE5" />
              </linearGradient>
            </defs>
            <path
              d="M 2 2 Q 0 7 6 7 L 129 7"
              stroke="url(#c-underline-grad)"
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

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

      {/* ── Distance filter bar ── */}
      <div className="w-full max-w-sm mb-3">
        <button
          onClick={() => setShowRadiusPanel(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-card/60 border border-white/8 hover:border-white/15 transition-all"
        >
          <div className="flex items-center gap-2">
            <Navigation className={`w-3.5 h-3.5 shrink-0 transition-colors ${hasGps ? "text-emerald-400" : "text-muted-foreground"}`} />
            <span className="text-xs text-muted-foreground">
              {hasGps ? "Within" : "Radius (no GPS yet)"}
            </span>
            <span className="text-xs font-semibold text-foreground">{localRadius} mi</span>
          </div>
          <motion.div
            animate={{ rotate: showRadiusPanel ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-muted-foreground/50 text-xs"
          >
            ▾
          </motion.div>
        </button>

        <AnimatePresence>
          {showRadiusPanel && (
            <motion.div
              key="radius-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="px-3 pt-4 pb-3 bg-card/60 border border-t-0 border-white/8 rounded-b-xl">
                {!hasGps && (
                  <button
                    onClick={onRequestGps}
                    className="w-full text-left text-[11px] text-amber-400/80 mb-3 leading-snug underline underline-offset-2 hover:text-amber-300 transition-colors"
                  >
                    Tap to enable location — required for radius filtering
                  </button>
                )}

                {/* Slider */}
                <div className="flex items-center gap-3">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 relative">
                    <input
                      type="range"
                      min={0}
                      max={RADIUS_STEPS.length - 1}
                      step={1}
                      value={sliderIdx}
                      onChange={(e) => {
                        const idx = Number(e.target.value);
                        setLocalRadius(RADIUS_STEPS[idx]);
                      }}
                      onMouseUp={(e) => {
                        const idx = Number((e.target as HTMLInputElement).value);
                        handleRadiusCommit(RADIUS_STEPS[idx]);
                      }}
                      onTouchEnd={(e) => {
                        const idx = Number((e.target as HTMLInputElement).value);
                        handleRadiusCommit(RADIUS_STEPS[idx]);
                      }}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #9B5DE5 0%, #E8387D ${(sliderIdx / (RADIUS_STEPS.length - 1)) * 100}%, rgba(255,255,255,0.12) ${(sliderIdx / (RADIUS_STEPS.length - 1)) * 100}%, rgba(255,255,255,0.12) 100%)`,
                      }}
                    />
                    {/* Step labels */}
                    <div className="flex justify-between mt-1.5 px-0.5">
                      {RADIUS_STEPS.map((s, i) => (
                        <span
                          key={s}
                          onClick={() => handleRadiusCommit(s)}
                          className={`text-[9px] cursor-pointer transition-colors ${i === sliderIdx ? "text-primary font-bold" : "text-muted-foreground/50"}`}
                        >
                          {s >= 100 ? `${s}` : s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-foreground w-12 text-right">{localRadius} mi</span>
                </div>

                <p className="text-[11px] text-muted-foreground/60 mt-3 text-center">
                  {hasGps
                    ? "Showing people within this distance · updates the feed"
                    : "Enable location in your browser to filter by distance"}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {/* ── GPS gate — blocks the deck until location is known ── */}
        {(gpsStatus === "idle" || gpsStatus === "requesting") ? (
          <motion.div
            key="gps-requesting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-5 text-center px-8 pt-16"
          >
            <motion.div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(155,93,229,0.15) 0%, rgba(232,56,125,0.15) 100%)" }}
              animate={{ scale: [1, 1.07, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <LocateFixed className="w-9 h-9 text-primary" />
            </motion.div>
            <div className="space-y-2">
              <p className="text-lg font-semibold" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Getting your location…
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Allow location access when your browser asks to start discovering people nearby.
              </p>
            </div>
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </motion.div>
        ) : gpsStatus === "denied" ? (
          <motion.div
            key="gps-denied"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex flex-col items-center gap-5 text-center px-8 pt-12"
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <LockKeyhole className="w-9 h-9 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Location required
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Discover uses your GPS to show only real people within your set radius. You must enable location to view or be visible to others.
              </p>
            </div>
            <button
              onClick={onRequestGps}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-opacity active:opacity-80"
              style={{ background: "linear-gradient(135deg, #9B5DE5 0%, #E8387D 100%)" }}
            >
              <LocateFixed className="w-4 h-4" />
              Enable Location
            </button>
            <p className="text-[11px] text-muted-foreground/50 max-w-[220px] leading-relaxed">
              You can also enable it in your browser's site settings, then tap the button above.
            </p>
          </motion.div>
        ) : isLoadingProfiles ? (
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
              onReport={(reason) => onReport(profile, reason)}
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
                Try increasing your radius, or check back later.
              </p>
            </div>

            <button
              onClick={() => setShowRadiusPanel(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/10 bg-card hover:border-primary/40 transition-colors text-muted-foreground hover:text-foreground"
            >
              <MapPin className="w-4 h-4" />
              Adjust distance radius
            </button>
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

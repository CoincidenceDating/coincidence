import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { locations, filterByLookingFor, type Profile, type Match, type CheckIn, type LocationData } from "@/lib/data";
import { type GeoStatus, type VenueStatus, type GeoCoords, haversineDistanceMiles, formatDistance, fetchNearbyVenues } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { SwipeCard } from "@/components/SwipeCard";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { MapPin, Zap, Wine, Beer, Coffee, Sparkles, User, CheckCircle2, LogIn, Heart, Flame, Navigation, LocateFixed, Loader2 } from "lucide-react";
import * as db from "@/lib/db";

const iconMap: Record<string, React.ReactNode> = {
  wine: <Wine className="w-4 h-4" />,
  beer: <Beer className="w-4 h-4" />,
  coffee: <Coffee className="w-4 h-4" />,
  sparkles: <Sparkles className="w-4 h-4" />,
};

interface CoincidencePageProps {
  onMatch: (match: Match) => void;
  onMaybe: (match: Match) => void;
  onCheckIn: (checkIn: CheckIn) => void;
  onSendMessage: (match: Match) => void;
  checkedInLocations: Set<string>;
  lookingFor: string;
  boostCredits: number;
  onDoubleStringCredit: () => void;
  blockedIds: string[];
}

export default function CoincidencePage({ onMatch, onMaybe, onCheckIn, onSendMessage, checkedInLocations, lookingFor, boostCredits, onDoubleStringCredit, blockedIds }: CoincidencePageProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [isActive, setIsActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [coincidenceMatch, setCoincidenceMatch] = useState<Match | null>(null);

  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [userCoords, setUserCoords] = useState<GeoCoords | null>(null);
  const [venueStatus, setVenueStatus] = useState<VenueStatus>("idle");
  const [nearbyLocations, setNearbyLocations] = useState<LocationData[] | null>(null);
  const [realUsers, setRealUsers] = useState<Profile[]>([]);
  const [isActivating, setIsActivating] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const allMockUsers = locations.flatMap((l) => l.users);

  const loadVenues = useCallback(async (lat: number, lng: number) => {
    setVenueStatus("loading");
    try {
      const fetched = await fetchNearbyVenues(lat, lng, allMockUsers);
      setNearbyLocations(fetched);
      setVenueStatus("ready");
    } catch {
      setVenueStatus("error");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGeoStatus("unavailable");
      return;
    }
    setGeoStatus("requesting");
    let firstFix = true;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        if (firstFix) {
          firstFix = false;
          setGeoStatus("granted");
          loadVenues(coords.lat, coords.lng);
        }
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
    watchIdRef.current = id;
  }, [loadVenues]);

  const activeLocations = nearbyLocations ?? [];
  const location = activeLocations.find((l) => l.id === selectedLocation);
  const filteredMockUsers = filterByLookingFor(location?.users ?? [], lookingFor)
    .filter((p) => !blockedIds.includes(p.id));
  const filteredRealUsers = realUsers.filter((p) => !blockedIds.includes(p.id));
  const users: Profile[] = [
    ...filteredRealUsers,
    ...filteredMockUsers.filter((p) => !filteredRealUsers.some((r) => r.id === p.id)),
  ];
  const currentUser = users[currentIndex];
  const alreadyCheckedIn = selectedLocation ? checkedInLocations.has(selectedLocation) : false;

  const ACTIVATE_RADIUS_MI = 0.15;
  const distanceToVenue =
    userCoords && location?.lat != null && location?.lng != null
      ? haversineDistanceMiles(userCoords.lat, userCoords.lng, location.lat, location.lng)
      : null;
  const tooFar = distanceToVenue !== null && distanceToVenue > ACTIVATE_RADIUS_MI;

  async function handleActivate() {
    if (!selectedLocation || !location) return;
    setIsActivating(true);
    try {
      const ownProfile = await db.getProfile();
      if (ownProfile) {
        const initials = ownProfile.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
        const gradients = [
          "linear-gradient(160deg,#1a1a2e 0%,#2d1b69 100%)",
          "linear-gradient(160deg,#141e30 0%,#243b55 100%)",
          "linear-gradient(160deg,#0f2027 0%,#2c5364 100%)",
          "linear-gradient(160deg,#232526 0%,#414345 100%)",
        ];
        const gradient = gradients[ownProfile.user_id.charCodeAt(0) % gradients.length];
        const snapshot: Profile = {
          id: ownProfile.user_id,
          name: ownProfile.name,
          age: ownProfile.age,
          bio: ownProfile.bio,
          avatar: initials,
          distance: "Here now",
          gradient,
          gender: "non-binary",
          photo: ownProfile.photos?.[0],
        };
        await db.upsertPresence(location.id, location.name, snapshot);
      }
      const real = await db.getActiveUsersAtVenue(location.id);
      setRealUsers(real);
    } finally {
      setIsActivating(false);
      setCurrentIndex(0);
      setDone(false);
      setIsActive(true);
      setJustCheckedIn(false);
    }
  }

  function handleHotSpotTap(locId: string) {
    setSelectedLocation(locId);
  }

  function handleDeactivate() {
    db.clearPresence();
    setRealUsers([]);
    setIsActive(false); setSelectedLocation(""); setCurrentIndex(0); setDone(false); setJustCheckedIn(false);
  }

  function handleStopLocation() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    db.clearPresence();
    setRealUsers([]);
    setGeoStatus("idle");
    setUserCoords(null);
    setVenueStatus("idle");
    setNearbyLocations(null);
    setSelectedLocation("");
  }

  function handleCheckIn() {
    if (!location || alreadyCheckedIn) return;
    onCheckIn({
      locationId: location.id,
      locationName: location.name,
      locationIcon: location.icon,
      checkedInAt: Date.now(),
    });
    setJustCheckedIn(true);
  }

  function handleSwipe(dir: "left" | "right" | "maybe") {
    if (currentUser && location) {
      const matchData: Match = {
        profile: currentUser, source: location.id,
        locationName: location.name, locationIcon: location.icon, matchedAt: Date.now(),
      };
      if (dir === "right") {
        onMatch(matchData);
        setCoincidenceMatch(matchData);
      } else if (dir === "maybe") {
        onMaybe(matchData);
      }
    }
    const next = currentIndex + 1;
    if (next >= users.length) setDone(true);
    else setCurrentIndex(next);
  }

  function handleDoubleString() {
    if (!currentUser || !location || boostCredits < 2) return;
    const matchData: Match = {
      profile: currentUser, source: location.id,
      locationName: location.name, locationIcon: location.icon,
      matchedAt: Date.now(), superLike: true,
    };
    onMatch(matchData);
    onDoubleStringCredit();
    setCoincidenceMatch(matchData);
    const next = currentIndex + 1;
    if (next >= users.length) setDone(true);
    else setCurrentIndex(next);
  }

  const showCheckedIn = alreadyCheckedIn || justCheckedIn;

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-80px)] px-4 py-8">

      {/* ── Coincidence match overlay ── */}
      <AnimatePresence>
        {coincidenceMatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-foreground/95 backdrop-blur-sm px-6 text-center"
          >
            {/* ── Stage 1: Full-screen rope draws itself across the screen first ── */}
            <svg
              aria-hidden
              viewBox="0 0 390 60"
              preserveAspectRatio="xMidYMid meet"
              style={{ position: "absolute", left: 0, width: "100%", height: 60, top: "44%", pointerEvents: "none" }}
            >
              <motion.path
                d="M -5 30 C 55 8, 110 52, 195 30 C 280 8, 335 52, 395 30"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 1 }}
                animate={{ pathLength: 1, opacity: [1, 1, 1, 0] }}
                transition={{
                  pathLength: { duration: 0.8, delay: 0.2, ease: "easeInOut" },
                  opacity: { duration: 0.35, delay: 1.1, ease: "easeOut" },
                }}
              />
              {/* Knot pops at center as rope finishes drawing */}
              <motion.circle
                cx={195} cy={30} r={6}
                fill="rgba(255,255,255,0.8)"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: [0, 1.5, 1], opacity: [1, 1, 0] }}
                transition={{
                  scale: { duration: 0.35, delay: 0.95, ease: "easeOut" },
                  opacity: { duration: 0.35, delay: 1.1 },
                }}
              />
            </svg>

            {/* Floating hearts — staggered after content appears */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 0, x: 0, scale: 0.5 }}
                animate={{ opacity: [0, 1, 0], y: -120 - i * 20, x: (i % 2 === 0 ? 1 : -1) * (20 + i * 14), scale: [0.5, 1.2, 0.8] }}
                transition={{ duration: 1.8, delay: 1.2 + i * 0.18, ease: "easeOut" }}
                className="absolute bottom-1/3 text-background"
              >
                <Heart className="w-5 h-5 fill-background" />
              </motion.div>
            ))}

            {/* ── Stage 2: Avatars reveal after rope completes ── */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 22, delay: 1.1 }}
              className="flex items-center gap-3 mb-8"
            >
              <ProfileAvatar profile={coincidenceMatch.profile} size={80} className="shadow-lg ring-2 ring-background" />
              <div className="flex flex-col items-center">
                <svg viewBox="0 0 80 28" className="w-20 text-background" fill="none">
                  {/* Main rope strand */}
                  <motion.path
                    d="M4 14 C 16 4, 24 24, 40 14 C 56 4, 64 24, 76 14"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.3, ease: "easeInOut" }}
                  />
                  {/* Shadow strand */}
                  <motion.path
                    d="M4 14 C 16 4, 24 24, 40 14 C 56 4, 64 24, 76 14"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeOpacity="0.3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transform="translate(0, 3)"
                    transition={{ duration: 0.8, delay: 0.35, ease: "easeInOut" }}
                  />
                  {/* Knot in the middle */}
                  <motion.circle
                    cx="40" cy="14" r="3.5"
                    fill="currentColor"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.9, type: "spring", stiffness: 400, damping: 18 }}
                  />
                </svg>
              </div>
              <div className="w-20 h-20 rounded-full bg-background/20 border-2 border-background text-background flex items-center justify-center text-lg font-bold">
                You
              </div>
            </motion.div>

            {/* Tagline — top */}
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.15 }}
              className="text-background/50 text-xs font-semibold uppercase tracking-[0.2em] mb-6 italic"
            >
              the invisible string is now visible
            </motion.p>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.25 }}
              className="space-y-2 mb-2"
            >
              <p className="text-background/60 text-sm font-medium uppercase tracking-widest">
                It happened
              </p>
              <h2 className="text-background text-3xl font-bold leading-tight">
                You matched<br />by coincidence
              </h2>
              <p className="text-background/60 text-sm mt-2">
                with <span className="text-background font-semibold">{coincidenceMatch.profile.name}</span>
                {" "}at {coincidenceMatch.locationName}
              </p>
            </motion.div>

            {/* Rope illustration */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.35 }}
              transition={{ delay: 1.4 }}
              className="my-6"
            >
              <svg viewBox="0 0 120 24" className="w-32 text-background">
                <path d="M10 12 C 25 4, 35 20, 60 12 C 85 4, 95 20, 110 12"
                  stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </svg>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.35 }}
              className="flex flex-col gap-3 w-full max-w-xs"
            >
              <button
                onClick={() => {
                  onSendMessage(coincidenceMatch);
                  setCoincidenceMatch(null);
                }}
                className="w-full py-3.5 rounded-2xl bg-background text-foreground font-semibold text-sm hover:bg-background/90 active:scale-[0.98] transition-all"
              >
                Send a message
              </button>
              <button
                onClick={() => setCoincidenceMatch(null)}
                className="w-full py-3 rounded-2xl border border-background/30 text-background/70 text-sm hover:text-background hover:border-background/60 transition-all"
              >
                Keep swiping
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="w-full max-w-sm">
        {!isActive ? (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <Zap className="w-8 h-8 text-foreground" />
              </div>
              <h1 className="text-2xl font-bold">Coincidence Mode</h1>
              <p className="text-muted-foreground text-sm mt-1">Pick a spot and see who is around</p>
            </div>

            {/* ── Hot Spots ── */}
            <div className="mb-6">
              <div className="flex items-center gap-1.5 mb-3">
                <Flame className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Hot Spots</span>
                {venueStatus === "ready" && (
                  <span className="ml-1 text-[9px] text-muted-foreground/50 font-normal normal-case tracking-normal">nearest first</span>
                )}
                {venueStatus === "ready" && (
                  <button
                    onClick={handleStopLocation}
                    className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors group"
                    title="Stop using location"
                  >
                    <LocateFixed className="w-3 h-3 group-hover:hidden" />
                    <span className="group-hover:hidden">Near you</span>
                    <span className="hidden group-hover:inline text-[10px]">Stop using location</span>
                  </button>
                )}
                {venueStatus === "error" && (
                  <button onClick={() => userCoords && loadVenues(userCoords.lat, userCoords.lng)} className="ml-auto text-[10px] text-muted-foreground hover:text-foreground underline">
                    Retry
                  </button>
                )}
              </div>

              {/* Idle — prompt to share location */}
              {geoStatus === "idle" && (
                <button
                  onClick={requestLocation}
                  className="w-full flex flex-col items-center gap-3 py-8 rounded-2xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-muted group-hover:bg-primary/10 transition-colors">
                    <Navigation className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">Use my location</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Find real hotspots near you</p>
                  </div>
                </button>
              )}

              {/* Denied / unavailable */}
              {(geoStatus === "denied" || geoStatus === "unavailable") && (
                <div className="w-full flex flex-col items-center gap-2 py-8 rounded-2xl border border-dashed border-border text-center">
                  <Navigation className="w-5 h-5 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    {geoStatus === "denied" ? "Location access was denied" : "GPS unavailable on this device"}
                  </p>
                  {geoStatus === "denied" && (
                    <p className="text-xs text-muted-foreground/60">Enable location in your browser settings and refresh</p>
                  )}
                </div>
              )}

              {/* Requesting / loading */}
              {(geoStatus === "requesting" || venueStatus === "loading") && (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-card animate-pulse">
                      <div className="w-4 h-4 rounded bg-muted shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 rounded bg-muted w-3/4" />
                        <div className="h-2 rounded bg-muted w-1/3" />
                      </div>
                      <div className="w-16 h-2 rounded bg-muted shrink-0" />
                    </div>
                  ))}
                  <p className="text-center text-xs text-muted-foreground pt-1">
                    {geoStatus === "requesting" ? "Getting your location…" : "Finding nearby spots…"}
                  </p>
                </div>
              )}

              {/* Real venue list */}
              {venueStatus === "ready" && activeLocations.length > 0 && (
                <div className="space-y-2">
                  {activeLocations.map((loc) => {
                    const distMi = userCoords && loc.lat != null && loc.lng != null
                      ? haversineDistanceMiles(userCoords.lat, userCoords.lng, loc.lat, loc.lng)
                      : null;
                    const count = loc.users.length;
                    const isSelected = selectedLocation === loc.id;
                    const heat = count >= 4
                      ? { dot: "bg-red-400", bar: "w-full" }
                      : count === 3
                      ? { dot: "bg-orange-400", bar: "w-3/4" }
                      : { dot: "bg-yellow-400", bar: "w-1/2" };
                    return (
                      <button
                        key={loc.id}
                        onClick={() => handleHotSpotTap(loc.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border active:scale-[0.98] transition-all text-left ${isSelected ? "bg-foreground text-background border-foreground" : "bg-card hover:bg-accent/40 border-border"}`}
                      >
                        <span className={`shrink-0 ${isSelected ? "text-background/70" : "text-muted-foreground"}`}>
                          {iconMap[loc.icon]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm block truncate">{loc.name}</span>
                          {distMi !== null && (
                            <span className={`text-[10px] ${isSelected ? "text-background/60" : "text-muted-foreground"}`}>
                              {formatDistance(distMi)} away
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-14 h-1 rounded-full overflow-hidden" style={{ background: isSelected ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)" }}>
                            <div className={`h-full rounded-full ${heat.bar}`} style={{ background: isSelected ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.28)" }} />
                          </div>
                          <span className={`w-1.5 h-1.5 rounded-full ${heat.dot} shrink-0`} />
                          <span className={`text-[10px] w-10 text-right ${isSelected ? "text-background/60" : "text-muted-foreground"}`}>
                            {count} {count === 1 ? "person" : "people"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* No venues found after GPS granted */}
              {venueStatus === "ready" && activeLocations.length === 0 && (
                <div className="w-full flex flex-col items-center gap-2 py-8 rounded-2xl border border-dashed border-border text-center">
                  <MapPin className="w-5 h-5 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No hotspots found nearby</p>
                  <p className="text-xs text-muted-foreground/60">Try again somewhere busier</p>
                </div>
              )}
            </div>

            <Button className="w-full" size="lg" disabled={!selectedLocation || isActivating || tooFar} onClick={handleActivate}>
              {isActivating
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Activating…</>
                : <><Zap className="w-4 h-4 mr-2" />Activate Coincidence Mode</>
              }
            </Button>
            {tooFar && distanceToVenue !== null && (
              <p className="text-center text-xs text-muted-foreground mt-2">
                You're {formatDistance(distanceToVenue)} away — you need to be at this spot to activate
              </p>
            )}

            {/* ── String Theory explanation ── */}
            <div className="mt-10 pt-8 border-t border-foreground/8">
              {/* Decorative rope */}
              <div className="flex items-center justify-center mb-6">
                <svg viewBox="0 0 160 32" className="w-36 text-foreground/20" fill="none">
                  <path d="M4 16 C 22 4, 32 28, 56 16 C 80 4, 90 28, 114 16 C 138 4, 148 28, 156 16"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M4 16 C 22 4, 32 28, 56 16 C 80 4, 90 28, 114 16 C 138 4, 148 28, 156 16"
                    stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeDasharray="4 6" opacity="0.6" />
                  {[56, 114].map((cx) => (
                    <circle key={cx} cx={cx} cy={16} r={3.5} fill="currentColor" opacity="0.5" />
                  ))}
                </svg>
              </div>

              {/* Heading */}
              <h3
                className="text-center font-semibold text-foreground/80 mb-3 leading-snug"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(1.15rem, 4.5vw, 1.4rem)", letterSpacing: "0.01em" }}
              >
                The Invisible String Theory
              </h3>

              {/* Body */}
              <p className="text-center text-sm text-muted-foreground leading-relaxed mb-6 px-2">
                Ancient wisdom holds that each of us is bound to the people we are meant to meet
                by an invisible string — pulled tighter across every near-miss, every shared space,
                every moment of almost. Coincidence mode plants you in the right place
                so the string can do the rest.
              </p>

              {/* Slogan */}
              <p
                className="text-center font-semibold text-foreground tracking-wide"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(1.05rem, 4vw, 1.25rem)", fontStyle: "italic" }}
              >
                Take Control Of Your Own Coincidence.
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Location header */}
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-foreground shrink-0" />
              <span className="text-sm font-medium truncate flex-1">{location?.name}</span>
              <button
                onClick={handleDeactivate}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 shrink-0"
              >
                Leave
              </button>
            </div>

            {/* Check In button */}
            <div className="mb-5">
              <AnimatePresence mode="wait">
                {!showCheckedIn ? (
                  <motion.button
                    key="check-in-btn"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    onClick={handleCheckIn}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-dashed border-foreground/20 text-sm font-medium text-foreground/60 hover:border-foreground/40 hover:text-foreground/80 hover:bg-muted/50 active:scale-[0.98] transition-all"
                  >
                    <LogIn className="w-4 h-4" />
                    Check in here
                  </motion.button>
                ) : (
                  <motion.div
                    key="checked-in"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-green-50 border border-green-200 text-sm font-medium text-green-700"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Checked in — stamped on your profile
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Swipe content */}
            {users.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No one here yet</p>
                <p className="text-xs mt-1">Check back soon</p>
              </div>
            ) : done ? (
              <div className="text-center py-16 text-muted-foreground">
                <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">You've seen everyone here</p>
                <p className="text-xs mt-1">Come back later for new faces</p>
                <Button variant="outline" size="sm" className="mt-6" onClick={handleDeactivate}>
                  Leave Location
                </Button>
              </div>
            ) : currentUser ? (
              <SwipeCard
                key={currentUser.id}
                profile={currentUser}
                onSwipe={handleSwipe}
                locationIcon={iconMap[location?.icon ?? "sparkles"]}
                locationName={location?.name}
                progress={`${currentIndex + 1} of ${users.length} people here`}
                blurName
                onDoubleString={handleDoubleString}
                boostCredits={boostCredits}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { locations, filterByLookingFor, type Profile, type Match, type CheckIn, type LocationData } from "@/lib/data";
import { type GeoStatus, type VenueStatus, type GeoCoords, haversineDistanceMiles, formatDistance, fetchNearbyVenues } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { SwipeCard } from "@/components/SwipeCard";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { MapPin, Wine, Beer, Coffee, Sparkles, User, CheckCircle2, LogIn, Heart, Flame, Navigation, LocateFixed, Loader2, ChevronDown, Check } from "lucide-react";
import { StringIcon } from "@/components/StringIcon";
import * as db from "@/lib/db";
import { supabase } from "@/lib/supabase";

const iconMap: Record<string, React.ReactNode> = {
  wine: <Wine className="w-4 h-4" />,
  beer: <Beer className="w-4 h-4" />,
  coffee: <Coffee className="w-4 h-4" />,
  sparkles: <Sparkles className="w-4 h-4" />,
};

interface CoincidencePageProps {
  onMatch: (match: Match) => void;
  onMaybe: (match: Match) => void;
  onRealLike: (profile: Profile, locationId: string, locationName: string, locationIcon: string) => Promise<Match | null>;
  onCheckIn: (checkIn: CheckIn) => void;
  onSendMessage: (match: Match) => void;
  checkedInLocations: Set<string>;
  lookingFor: string;
  boostCredits: number;
  onDoubleStringCredit: () => void;
  blockedIds: string[];
  incomingCoincidenceMatch?: Match | null;
  onClearIncomingCoincidenceMatch?: () => void;
  onReport: (profile: Profile, reason: string) => void;
  // GPS state owned by App.tsx — no separate watch needed here
  gpsStatus: "idle" | "requesting" | "granted" | "denied";
  userLat: number | null;
  userLng: number | null;
  onRequestGps: () => void;
}

export default function CoincidencePage({ onMatch, onMaybe, onRealLike, onCheckIn, onSendMessage, checkedInLocations, lookingFor, boostCredits, onDoubleStringCredit, blockedIds, incomingCoincidenceMatch, onClearIncomingCoincidenceMatch, onReport, gpsStatus, userLat, userLng, onRequestGps }: CoincidencePageProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [isActive, setIsActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [coincidenceMatch, setCoincidenceMatch] = useState<Match | null>(null);

  const [venueStatus, setVenueStatus] = useState<VenueStatus>("idle");
  const [nearbyLocations, setNearbyLocations] = useState<LocationData[] | null>(null);
  const [venueRealCounts, setVenueRealCounts] = useState<Record<string, number>>({});
  const [realUsers, setRealUsers] = useState<Profile[]>([]);
  const [isActivating, setIsActivating] = useState(false);
  const presenceSubRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const venueUsersSubRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastVenueLoadRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastVenueLoadTimeRef = useRef<number>(0);
  const VENUE_REFRESH_MIN_MS = 5 * 60 * 1000; // 5 minutes between background refreshes

  const [showVenueDropdown, setShowVenueDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Nudge banner — fires when someone at this venue likes the current user
  const [venueLikeNudge, setVenueLikeNudge] = useState(false);
  const venueLikeSubRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const realUsersRef = useRef<Profile[]>([]);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  // Keep realUsersRef current so the subscription callback can check it
  useEffect(() => { realUsersRef.current = realUsers; }, [realUsers]);

  useEffect(() => {
    return () => {
      if (presenceSubRef.current) {
        supabase.removeChannel(presenceSubRef.current);
      }
      if (venueUsersSubRef.current) {
        supabase.removeChannel(venueUsersSubRef.current);
      }
      if (venueLikeSubRef.current) {
        supabase.removeChannel(venueLikeSubRef.current);
      }
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
      db.clearPresence();
    };
  }, []);

  const allMockUsers = locations.flatMap((l) => l.users);


  const loadVenues = useCallback(async (lat: number, lng: number, isBackground = false) => {
    // Background refresh (we already have venues): stay in "ready" and fail silently
    // to avoid wiping the UI or hitting rate limits showing errors repeatedly.
    if (!isBackground) setVenueStatus("loading");
    try {
      const fetched = await fetchNearbyVenues(lat, lng, allMockUsers);
      setNearbyLocations(fetched);
      lastVenueLoadTimeRef.current = Date.now();
      const venueIds = fetched.map((v) => v.id);
      const counts = await db.getVenuePresenceCounts(venueIds);
      setVenueRealCounts(counts);

      if (presenceSubRef.current) supabase.removeChannel(presenceSubRef.current);
      presenceSubRef.current = db.subscribeToVenuePresence(venueIds, (venueId, delta) => {
        setVenueRealCounts((prev) => ({
          ...prev,
          [venueId]: Math.max(0, (prev[venueId] ?? 0) + delta),
        }));
      });

      setVenueStatus("ready");
    } catch {
      // On background refresh keep existing venues intact; only surface the error
      // state on first load (when the user has nothing to look at yet).
      if (!isBackground) setVenueStatus("error");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive userCoords from App.tsx props — no local watchPosition needed
  const userCoords = (userLat != null && userLng != null) ? { lat: userLat, lng: userLng } : null;

  // How far the user must move (in miles) before the venue list refreshes
  const VENUE_REFRESH_THRESHOLD_MI = 0.12; // ~200 m

  // Load / refresh venues whenever the GPS position from App.tsx changes.
  // Guards: (1) must have moved VENUE_REFRESH_THRESHOLD_MI since last load,
  //         (2) must be at least VENUE_REFRESH_MIN_MS since last successful load
  //             to avoid hammering OSM Overpass and triggering rate-limit errors.
  useEffect(() => {
    if (gpsStatus !== "granted" || userLat == null || userLng == null) return;
    const last = lastVenueLoadRef.current;
    if (!last) {
      // First fix ever — always load
      lastVenueLoadRef.current = { lat: userLat, lng: userLng };
      loadVenues(userLat, userLng, false);
    } else {
      const moved = haversineDistanceMiles(last.lat, last.lng, userLat, userLng);
      const timeSinceLoad = Date.now() - lastVenueLoadTimeRef.current;
      if (moved >= VENUE_REFRESH_THRESHOLD_MI && timeSinceLoad >= VENUE_REFRESH_MIN_MS) {
        lastVenueLoadRef.current = { lat: userLat, lng: userLng };
        loadVenues(userLat, userLng, true); // background: keep existing venues on failure
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLat, userLng, gpsStatus]);

  const activeLocations = [...(nearbyLocations ?? [])].sort((a, b) => (venueRealCounts[b.id] ?? 0) - (venueRealCounts[a.id] ?? 0));
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


  // Auto-open the dropdown the moment venues finish loading (if nothing is selected yet)
  useEffect(() => {
    if (venueStatus === "ready" && !selectedLocation && activeLocations.length > 0) {
      setShowVenueDropdown(true);
    }
  }, [venueStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const PROXIMITY_THRESHOLD_MI = 0.25; // ~400 m — generous enough for GPS + venue-coord inaccuracy

  function getSelectedVenueDistMi(): number | null {
    if (!userCoords || !location || location.lat == null || location.lng == null) return null;
    return haversineDistanceMiles(userCoords.lat, userCoords.lng, location.lat, location.lng);
  }

  async function handleActivate() {
    // Phase 1 — GPS not yet granted: ask App.tsx to start the watch
    if (gpsStatus === "idle" || gpsStatus === "denied") {
      onRequestGps();
      return;
    }
    // Phase 2 — still waiting for GPS or venues
    if (gpsStatus === "requesting" || venueStatus === "loading") return;

    // Phase 3 — venues ready but no venue chosen: open the dropdown
    if (!selectedLocation || !location) {
      setShowVenueDropdown(true);
      return;
    }

    // Phase 4 — proximity check: must be within ~160 m of the venue
    const distMi = getSelectedVenueDistMi();
    if (distMi !== null && distMi > PROXIMITY_THRESHOLD_MI) return; // button is visually disabled in this state

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
          photos: ownProfile.photos ?? [],
        };
        await db.upsertPresence(location.id, location.name, snapshot);

        // Subscribe to live join/leave events for this venue so the swipe deck
        // updates in real time when other users activate or leave.
        if (venueUsersSubRef.current) supabase.removeChannel(venueUsersSubRef.current);
        venueUsersSubRef.current = db.subscribeToVenueUsers(
          location.id,
          ownProfile.user_id,
          (profile) => {
            setRealUsers((prev) =>
              prev.some((p) => p.id === profile.id) ? prev : [...prev, profile]
            );
          },
          (userId) => {
            setRealUsers((prev) => prev.filter((p) => p.id !== userId));
          },
        );

        // Subscribe to incoming likes from other users at this venue.
        // Fires a nudge banner so the user knows to keep swiping.
        if (venueLikeSubRef.current) supabase.removeChannel(venueLikeSubRef.current);
        venueLikeSubRef.current = db.subscribeToIncomingVenueLikes(
          ownProfile.user_id,
          (fromUserId) => realUsersRef.current.some((p) => p.id === fromUserId),
          () => {
            setVenueLikeNudge(true);
            if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
            nudgeTimerRef.current = setTimeout(() => setVenueLikeNudge(false), 6000);
          },
        );
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
    setShowVenueDropdown(false);
  }


  function handleDeactivate() {
    db.clearPresence();
    if (venueUsersSubRef.current) {
      supabase.removeChannel(venueUsersSubRef.current);
      venueUsersSubRef.current = null;
    }
    if (venueLikeSubRef.current) {
      supabase.removeChannel(venueLikeSubRef.current);
      venueLikeSubRef.current = null;
    }
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    setRealUsers([]);
    setVenueLikeNudge(false);
    setIsActive(false); setSelectedLocation(""); setCurrentIndex(0); setDone(false); setJustCheckedIn(false);
  }

  function handleStopLocation() {
    // GPS watch is owned by App.tsx — just reset venue UI state here
    db.clearPresence();
    if (venueUsersSubRef.current) {
      supabase.removeChannel(venueUsersSubRef.current);
      venueUsersSubRef.current = null;
    }
    setRealUsers([]);
    setVenueStatus("idle");
    setNearbyLocations(null);
    setSelectedLocation("");
    lastVenueLoadRef.current = null;
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

  async function handleSwipe(dir: "left" | "right" | "maybe") {
    // Advance the card immediately so the UI feels responsive
    const next = currentIndex + 1;
    if (next >= users.length) setDone(true);
    else setCurrentIndex(next);

    if (!currentUser || !location) return;

    if (dir === "right") {
      if (db.isRealUserId(currentUser.id)) {
        // Real user — require mutual like before creating a match
        const match = await onRealLike(currentUser, location.id, location.name, location.icon);
        if (match) setCoincidenceMatch(match);
      } else {
        // Mock profile — immediate match for demo purposes
        const matchData: Match = {
          profile: currentUser, source: location.id,
          locationName: location.name, locationIcon: location.icon, matchedAt: Date.now(),
        };
        onMatch(matchData);
        setCoincidenceMatch(matchData);
      }
    } else if (dir === "maybe") {
      const matchData: Match = {
        profile: currentUser, source: location.id,
        locationName: location.name, locationIcon: location.icon, matchedAt: Date.now(),
      };
      onMaybe(matchData);
    }
  }

  async function handleDoubleString() {
    if (!currentUser || !location || boostCredits < 2) return;
    // Advance immediately
    const next = currentIndex + 1;
    if (next >= users.length) setDone(true);
    else setCurrentIndex(next);
    onDoubleStringCredit();

    if (db.isRealUserId(currentUser.id)) {
      // Real user — still requires mutuality (premium signal, not instant match)
      const match = await onRealLike(currentUser, location.id, location.name, location.icon);
      if (match) setCoincidenceMatch({ ...match, superLike: true });
    } else {
      const matchData: Match = {
        profile: currentUser, source: location.id,
        locationName: location.name, locationIcon: location.icon,
        matchedAt: Date.now(), superLike: true,
      };
      onMatch(matchData);
      setCoincidenceMatch(matchData);
    }
  }

  const showCheckedIn = alreadyCheckedIn || justCheckedIn;

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-80px)] px-4 py-8">

      {/* ── Coincidence match overlay (own swipe OR incoming mutual from other user) ── */}
      <AnimatePresence>
        {(coincidenceMatch ?? incomingCoincidenceMatch) && (
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
              <ProfileAvatar profile={(coincidenceMatch ?? incomingCoincidenceMatch)!.profile} size={80} className="shadow-lg ring-2 ring-background" />
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
                with <span className="text-background font-semibold">{(coincidenceMatch ?? incomingCoincidenceMatch)!.profile.name}</span>
                {" "}at {(coincidenceMatch ?? incomingCoincidenceMatch)!.locationName}
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
                  const m = (coincidenceMatch ?? incomingCoincidenceMatch)!;
                  onSendMessage(m);
                  setCoincidenceMatch(null);
                  onClearIncomingCoincidenceMatch?.();
                }}
                className="w-full py-3.5 rounded-2xl bg-background text-foreground font-semibold text-sm hover:bg-background/90 active:scale-[0.98] transition-all"
              >
                Send a message
              </button>
              <button
                onClick={() => {
                  setCoincidenceMatch(null);
                  onClearIncomingCoincidenceMatch?.();
                }}
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
                <StringIcon className="w-8 h-8 text-foreground" />
              </div>
              <h1 className="text-2xl font-bold">Coincidence Mode</h1>
              <p className="text-muted-foreground text-sm mt-1">Pick a spot and see who is around</p>
            </div>

            {/* ── Nearby Places ── */}
            <div className="mb-6">
              <div className="flex items-center gap-1.5 mb-3">
                <Flame className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nearby Places</span>
                {venueStatus === "ready" && (
                  <>
                    <span className="ml-1 text-[9px] text-muted-foreground/50 font-normal normal-case tracking-normal">within 2 km</span>
                    <button
                      onClick={handleStopLocation}
                      className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors group"
                    >
                      <LocateFixed className="w-3 h-3 group-hover:hidden" />
                      <span className="group-hover:hidden">GPS on</span>
                      <span className="hidden group-hover:inline">Stop GPS</span>
                    </button>
                  </>
                )}
                {venueStatus === "error" && (
                  <button onClick={() => userCoords && loadVenues(userCoords.lat, userCoords.lng)} className="ml-auto text-[10px] text-muted-foreground hover:text-foreground underline">
                    Retry
                  </button>
                )}
              </div>

              {/* GPS denied / unavailable */}
              {gpsStatus === "denied" && (
                <div className="w-full flex flex-col items-center gap-2 py-6 rounded-2xl border border-dashed border-border text-center">
                  <Navigation className="w-5 h-5 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Location access was denied</p>
                  <p className="text-xs text-muted-foreground/60">Enable location in your browser settings, then refresh</p>
                </div>
              )}

              {/* Idle — Activate button will trigger GPS */}
              {gpsStatus === "idle" && (
                <div className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl border border-dashed border-border bg-card/50">
                  <Navigation className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                  <p className="text-sm text-muted-foreground/70">Tap <span className="text-foreground/80 font-medium">Activate</span> below — we'll find real places near you</p>
                </div>
              )}

              {/* Requesting GPS / loading venues skeleton */}
              {(gpsStatus === "requesting" || venueStatus === "loading") && (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-card animate-pulse">
                      <div className="w-4 h-4 rounded bg-muted shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 rounded bg-muted w-3/4" />
                        <div className="h-2 rounded bg-muted w-1/3" />
                      </div>
                      <div className="w-12 h-2 rounded bg-muted shrink-0" />
                    </div>
                  ))}
                  <p className="text-center text-xs text-muted-foreground pt-1">
                    {gpsStatus === "requesting" ? "Getting your location…" : "Scanning nearby places…"}
                  </p>
                </div>
              )}


              {/* Venue dropdown — only shown once real GPS venues are loaded */}
              {venueStatus === "ready" && (
                <div className="relative" ref={dropdownRef}>
                  {/* Trigger */}
                  <button
                    onClick={() => setShowVenueDropdown((v) => !v)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-all text-left
                      ${selectedLocation
                        ? "border-primary/50 bg-primary/5"
                        : "border-border bg-card hover:border-primary/30 hover:bg-accent/30"
                      }`}
                  >
                    {(() => {
                      const sel = activeLocations.find((l) => l.id === selectedLocation);
                      if (sel) {
                        const dMi = userCoords && sel.lat != null && sel.lng != null
                          ? haversineDistanceMiles(userCoords.lat, userCoords.lng, sel.lat, sel.lng)
                          : null;
                        const inRange = dMi !== null && dMi <= PROXIMITY_THRESHOLD_MI;
                        return (
                          <>
                            <span className="text-primary shrink-0">{iconMap[sel.icon]}</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium block truncate">{sel.name}</span>
                              {dMi !== null && (
                                <span className={`text-[10px] ${inRange ? "text-green-400" : "text-amber-400"}`}>
                                  {inRange ? "You're here ✓" : `${formatDistance(dMi)} away — go here to activate`}
                                </span>
                              )}
                            </div>
                          </>
                        );
                      }
                      return (
                        <>
                          <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="flex-1 text-sm text-muted-foreground">
                            {activeLocations.length > 0 ? "Choose a nearby place…" : "No places found nearby"}
                          </span>
                        </>
                      );
                    })()}
                    <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${showVenueDropdown ? "rotate-180" : ""}`} />
                  </button>

                  {/* Dropdown panel */}
                  <AnimatePresence>
                    {showVenueDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
                        animate={{ opacity: 1, y: 0, scaleY: 1 }}
                        exit={{ opacity: 0, y: -6, scaleY: 0.95 }}
                        transition={{ duration: 0.15 }}
                        style={{ transformOrigin: "top" }}
                        className="absolute z-30 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto"
                      >
                        {activeLocations.length === 0 && (
                          <div className="px-4 py-6 text-center">
                            <MapPin className="w-5 h-5 text-muted-foreground/40 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No places found within 2 km</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">Try moving to a busier area</p>
                          </div>
                        )}
                        {activeLocations.map((loc) => {
                          const distMi = userCoords && loc.lat != null && loc.lng != null
                            ? haversineDistanceMiles(userCoords.lat, userCoords.lng, loc.lat, loc.lng)
                            : null;
                          const inRange = distMi !== null && distMi <= PROXIMITY_THRESHOLD_MI;
                          const count = venueRealCounts[loc.id] ?? 0;
                          const isSelected = selectedLocation === loc.id;
                          return (
                            <button
                              key={loc.id}
                              onClick={() => handleHotSpotTap(loc.id)}
                              className="w-full flex items-center gap-3 px-3 py-3 hover:bg-accent/40 transition-colors text-left border-b border-border/50 last:border-0"
                            >
                              <span className="text-muted-foreground shrink-0">{iconMap[loc.icon] ?? <MapPin className="w-4 h-4" />}</span>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium block truncate">{loc.name}</span>
                                {distMi !== null && (
                                  <span className={`text-[10px] ${inRange ? "text-green-400" : "text-muted-foreground"}`}>
                                    {inRange ? "You're here ✓" : `${formatDistance(distMi)} away`}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {/* activated count badge */}
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold leading-none
                                  ${count > 0
                                    ? "bg-primary/20 text-primary border border-primary/30"
                                    : "bg-muted/40 text-muted-foreground border border-border"
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${count > 0 ? "bg-primary animate-pulse" : "bg-muted-foreground/40"}`} />
                                  {count} activated
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                              </div>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Activate button — adapts through each phase */}
            {(() => {
              const distMi = getSelectedVenueDistMi();
              const tooFar = distMi !== null && distMi > PROXIMITY_THRESHOLD_MI;
              const isLoading = gpsStatus === "requesting" || venueStatus === "loading";
              const needsVenue = venueStatus === "ready" && !selectedLocation;

              let label: React.ReactNode;
              let disabled = false;

              if (isActivating) {
                label = <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Activating…</>;
                disabled = true;
              } else if (isLoading) {
                label = <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{gpsStatus === "requesting" ? "Getting location…" : "Finding places…"}</>;
                disabled = true;
              } else if (needsVenue) {
                label = <><MapPin className="w-4 h-4 mr-2" />Choose a place above</>;
                disabled = true;
              } else if (tooFar && location) {
                label = <><Navigation className="w-4 h-4 mr-2" />Go to {location.name} to activate</>;
                disabled = true;
              } else {
                label = <><StringIcon className="w-4 h-4 mr-2" />{gpsStatus === "idle" ? "Activate Coincidence Mode" : `Activate at ${location?.name ?? "…"}`}</>;
              }

              return (
                <Button className="w-full" size="lg" disabled={disabled} onClick={handleActivate}>
                  {label}
                </Button>
              );
            })()}

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

            {/* ── Nudge banner: someone at this venue just liked you ── */}
            <AnimatePresence>
              {venueLikeNudge && (
                <motion.button
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 340, damping: 26 }}
                  onClick={() => setVenueLikeNudge(false)}
                  className="w-full mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl text-white text-sm font-medium shadow-lg active:scale-[0.98] transition-transform"
                  style={{ background: "linear-gradient(135deg,#E8387D 0%,#9B5DE5 100%)" }}
                >
                  <Heart className="w-4 h-4 fill-white shrink-0" />
                  <span className="flex-1 text-left">Someone here just liked you — keep swiping!</span>
                  <span className="text-white/60 text-xs shrink-0">✕</span>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Swipe content */}
            {users.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No one here yet</p>
                <p className="text-xs mt-1">Check back soon</p>
              </div>
            ) : (done && currentIndex >= users.length) ? (
              <div className="text-center py-16 text-muted-foreground">
                <StringIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
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
                onReport={(reason) => onReport(currentUser, reason)}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

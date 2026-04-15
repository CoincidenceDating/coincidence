import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { locations, filterByLookingFor, type Profile, type Match, type CheckIn } from "@/lib/data";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SwipeCard } from "@/components/SwipeCard";
import { MapPin, Zap, Wine, Beer, Coffee, Sparkles, User, CheckCircle2, LogIn, Heart } from "lucide-react";

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
  checkedInLocations: Set<string>;
  lookingFor: string;
}

export default function CoincidencePage({ onMatch, onMaybe, onCheckIn, checkedInLocations, lookingFor }: CoincidencePageProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [isActive, setIsActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [coincidenceMatch, setCoincidenceMatch] = useState<{ profile: Profile; locationName: string } | null>(null);

  const location = locations.find((l) => l.id === selectedLocation);
  const users: Profile[] = filterByLookingFor(location?.users ?? [], lookingFor);
  const currentUser = users[currentIndex];
  const alreadyCheckedIn = selectedLocation ? checkedInLocations.has(selectedLocation) : false;

  function handleActivate() {
    if (!selectedLocation) return;
    setCurrentIndex(0); setDone(false); setIsActive(true); setJustCheckedIn(false);
  }

  function handleDeactivate() {
    setIsActive(false); setSelectedLocation(""); setCurrentIndex(0); setDone(false); setJustCheckedIn(false);
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
        setCoincidenceMatch({ profile: currentUser, locationName: location.name });
      } else if (dir === "maybe") {
        onMaybe(matchData);
      }
    }
    const next = currentIndex + 1;
    if (next >= users.length) setDone(true);
    else setCurrentIndex(next);
  }

  const showCheckedIn = alreadyCheckedIn || justCheckedIn;

  const matchInitials = coincidenceMatch?.profile.name
    .split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("") ?? "";

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-80px)] px-4 py-8">

      {/* ── Coincidence match overlay ── */}
      <AnimatePresence>
        {coincidenceMatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-foreground/95 backdrop-blur-sm px-6 text-center"
          >
            {/* Floating hearts */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 0, x: 0, scale: 0.5 }}
                animate={{ opacity: [0, 1, 0], y: -120 - i * 20, x: (i % 2 === 0 ? 1 : -1) * (20 + i * 14), scale: [0.5, 1.2, 0.8] }}
                transition={{ duration: 1.8, delay: i * 0.18, ease: "easeOut" }}
                className="absolute bottom-1/3 text-background"
              >
                <Heart className="w-5 h-5 fill-background" />
              </motion.div>
            ))}

            {/* Avatars */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.1 }}
              className="flex items-center gap-3 mb-8"
            >
              <div className="w-20 h-20 rounded-full bg-background text-foreground flex items-center justify-center text-2xl font-bold shadow-lg">
                {matchInitials}
              </div>
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

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
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
              transition={{ delay: 0.5 }}
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
              transition={{ delay: 0.4 }}
              className="flex flex-col gap-3 w-full max-w-xs"
            >
              <button
                onClick={() => setCoincidenceMatch(null)}
                className="w-full py-3.5 rounded-2xl bg-background text-foreground font-semibold text-sm hover:bg-background/90 active:scale-[0.98] transition-all"
              >
                Keep swiping
              </button>
              <button
                onClick={() => setCoincidenceMatch(null)}
                className="w-full py-3 rounded-2xl border border-background/30 text-background/70 text-sm hover:text-background hover:border-background/60 transition-all"
              >
                Send a message
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
            <div className="space-y-4">
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      <span className="flex items-center gap-2">{iconMap[loc.icon]}{loc.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="w-full" size="lg" disabled={!selectedLocation} onClick={handleActivate}>
                <Zap className="w-4 h-4 mr-2" />Activate Coincidence Mode
              </Button>
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
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

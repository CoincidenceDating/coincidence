import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { locations, type Profile, type Match, type CheckIn } from "@/lib/data";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SwipeCard } from "@/components/SwipeCard";
import { MapPin, Zap, Wine, Beer, Coffee, Sparkles, User, CheckCircle2, LogIn } from "lucide-react";

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
}

export default function CoincidencePage({ onMatch, onMaybe, onCheckIn, checkedInLocations }: CoincidencePageProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [isActive, setIsActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);

  const location = locations.find((l) => l.id === selectedLocation);
  const users: Profile[] = location?.users ?? [];
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
      if (dir === "right") onMatch(matchData);
      else if (dir === "maybe") onMaybe(matchData);
    }
    const next = currentIndex + 1;
    if (next >= users.length) setDone(true);
    else setCurrentIndex(next);
  }

  const showCheckedIn = alreadyCheckedIn || justCheckedIn;

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-80px)] px-4 py-8">
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

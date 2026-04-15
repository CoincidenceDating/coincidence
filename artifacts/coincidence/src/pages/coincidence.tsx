import { useState } from "react";
import { locations, type Profile, type Match } from "@/lib/data";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SwipeCard } from "@/components/SwipeCard";
import { MapPin, Zap, Wine, Beer, Coffee, Sparkles, User } from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  wine: <Wine className="w-4 h-4" />,
  beer: <Beer className="w-4 h-4" />,
  coffee: <Coffee className="w-4 h-4" />,
  sparkles: <Sparkles className="w-4 h-4" />,
};

interface CoincidencePageProps {
  onMatch: (match: Match) => void;
}

export default function CoincidencePage({ onMatch }: CoincidencePageProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [isActive, setIsActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [done, setDone] = useState(false);

  const location = locations.find((l) => l.id === selectedLocation);
  const users: Profile[] = location?.users ?? [];
  const currentUser = users[currentIndex];

  function handleActivate() {
    if (!selectedLocation) return;
    setCurrentIndex(0);
    setDone(false);
    setIsActive(true);
  }

  function handleDeactivate() {
    setIsActive(false);
    setSelectedLocation("");
    setCurrentIndex(0);
    setDone(false);
  }

  function handleSwipe(dir: "left" | "right") {
    if (dir === "right" && currentUser && location) {
      onMatch({
        profile: currentUser,
        source: location.id,
        locationName: location.name,
        locationIcon: location.icon,
        matchedAt: Date.now(),
      });
    }
    const next = currentIndex + 1;
    if (next >= users.length) {
      setDone(true);
    } else {
      setCurrentIndex(next);
    }
  }

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-80px)] px-4 py-8">
      <div className="w-full max-w-sm">
        {!isActive ? (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Coincidence Mode</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Pick a spot and see who is around
              </p>
            </div>

            <div className="space-y-4">
              <Select
                value={selectedLocation}
                onValueChange={setSelectedLocation}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      <span className="flex items-center gap-2">
                        {iconMap[loc.icon]}
                        {loc.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                className="w-full"
                size="lg"
                disabled={!selectedLocation}
                onClick={handleActivate}
              >
                <Zap className="w-4 h-4 mr-2" />
                Activate Coincidence Mode
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-6">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-primary truncate">
                {location?.name}
              </span>
              <button
                onClick={handleDeactivate}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 shrink-0"
              >
                Leave
              </button>
            </div>

            {users.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No one here yet</p>
                <p className="text-xs mt-1">Check back soon</p>
              </div>
            ) : done ? (
              <div className="text-center py-16 text-muted-foreground">
                <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">You have seen everyone here</p>
                <p className="text-xs mt-1">Come back later for new faces</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-6"
                  onClick={handleDeactivate}
                >
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

import { useState } from "react";
import { locations, type Profile } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Zap, Wine, Beer, Coffee, Sparkles, User } from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  wine: <Wine className="w-4 h-4" />,
  beer: <Beer className="w-4 h-4" />,
  coffee: <Coffee className="w-4 h-4" />,
  sparkles: <Sparkles className="w-4 h-4" />,
};

export default function CoincidencePage() {
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [isActive, setIsActive] = useState(false);

  const location = locations.find((l) => l.id === selectedLocation);

  function handleActivate() {
    if (!selectedLocation) return;
    setIsActive(true);
  }

  function handleDeactivate() {
    setIsActive(false);
    setSelectedLocation("");
  }

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-80px)] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Coincidence Mode</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pick a spot and see who is around
          </p>
        </div>

        {!isActive ? (
          <div className="space-y-4">
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
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
        ) : (
          <div className="space-y-4">
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-sm">You are at</p>
                  <p className="text-primary font-semibold">{location?.name}</p>
                </div>
              </CardContent>
            </Card>

            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                People here right now
              </h2>
              <div className="space-y-2">
                {location?.users.map((user: Profile) => (
                  <Card key={user.id}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
                        {user.avatar}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">
                          {user.name}, {user.age}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.bio}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {location?.users.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No one here yet</p>
                  </div>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={handleDeactivate}
            >
              Leave Location
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

import { myProfile, type Match, type CheckIn } from "@/lib/data";
import { Heart, MapPin, Zap, Wine, Beer, Coffee, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const locationIconMap: Record<string, React.ReactNode> = {
  wine:     <Wine className="w-4 h-4" />,
  beer:     <Beer className="w-4 h-4" />,
  coffee:   <Coffee className="w-4 h-4" />,
  sparkles: <Sparkles className="w-4 h-4" />,
};

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

interface ProfilePageProps {
  matches: Match[];
  checkIns: CheckIn[];
}

export default function ProfilePage({ matches, checkIns }: ProfilePageProps) {
  const totalMatches = matches.length;
  const coincidenceMatches = matches.filter((m) => m.source !== "swipe").length;

  // Count matches per location
  const matchesByLocation = matches.reduce<Record<string, number>>((acc, m) => {
    if (m.source !== "swipe") {
      acc[m.source] = (acc[m.source] ?? 0) + 1;
    }
    return acc;
  }, {});

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] px-4 py-8 max-w-md mx-auto w-full">
      {/* Avatar + name */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="relative mb-4">
          <div className="flex items-center justify-center w-28 h-28 rounded-full bg-foreground text-background text-3xl font-bold">
            {myProfile.avatar}
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-400 border-2 border-background flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-green-100" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">{myProfile.name}</h1>
        <p className="text-muted-foreground text-sm">{myProfile.age} years old</p>
        <p className="text-sm mt-2 max-w-xs text-foreground/80 leading-relaxed">
          {myProfile.bio}
        </p>
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

      {/* Invisible string tagline */}
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

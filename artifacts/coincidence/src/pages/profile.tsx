import { myProfile, type Match } from "@/lib/data";
import { Heart, MapPin, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ProfilePageProps {
  matches: Match[];
}

export default function ProfilePage({ matches }: ProfilePageProps) {
  const totalMatches = matches.length;
  const coincidenceMatches = matches.filter((m) => m.source !== "swipe").length;
  const locationsVisited = new Set(
    matches.filter((m) => m.source !== "swipe").map((m) => m.source)
  ).size;

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] px-4 py-8 max-w-md mx-auto w-full">
      {/* Avatar + name */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="relative mb-4">
          <div className="flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-primary/60 to-primary text-primary-foreground text-3xl font-bold">
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
            <Heart className="w-5 h-5 text-primary fill-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalMatches}</p>
            <p className="text-xs text-muted-foreground">Matches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{coincidenceMatches}</p>
            <p className="text-xs text-muted-foreground">Coincidences</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <MapPin className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{locationsVisited}</p>
            <p className="text-xs text-muted-foreground">Spots visited</p>
          </CardContent>
        </Card>
      </div>

      {/* Interests */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Interests
        </h2>
        <div className="flex flex-wrap gap-2">
          {myProfile.interests.map((interest) => (
            <span
              key={interest}
              className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
            >
              {interest}
            </span>
          ))}
        </div>
      </div>

      {/* Invisible string tagline */}
      <div className="mt-auto pt-8 flex flex-col items-center gap-1">
        <svg width="40" height="32" viewBox="0 0 40 32" className="opacity-20">
          <path
            d="M 20 0 Q 6 16 20 32"
            stroke="#8B5E1A"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 20 0 Q 34 16 20 32"
            stroke="#8B5E1A"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
        <p className="text-xs text-muted-foreground italic">
          making the invisible string – visible
        </p>
      </div>
    </div>
  );
}

import { type Match } from "@/lib/data";
import { HelpCircle, Check, X, MapPin } from "lucide-react";

interface UndecidedPageProps {
  undecided: Match[];
  onDecide: (match: Match, decision: "yes" | "no") => void;
}

export default function UndecidedPage({ undecided, onDecide }: UndecidedPageProps) {
  if (undecided.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <HelpCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">No maybes yet</h2>
        <p className="text-muted-foreground text-sm mt-1 max-w-xs">
          Press the ? button when you're not sure — you can decide later here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] px-4 py-6 max-w-md mx-auto w-full">
      <div className="flex items-center gap-2 mb-6">
        <Star className="w-5 h-5 text-foreground" />
        <h1 className="text-xl font-bold">On the fence</h1>
        <span className="ml-auto text-sm text-muted-foreground">
          {undecided.length} {undecided.length === 1 ? "profile" : "profiles"}
        </span>
      </div>

      <div className="space-y-3">
        {undecided.map((match) => (
          <div
            key={`${match.profile.id}-${match.matchedAt}`}
            className="flex items-center gap-3 p-3 pr-2 rounded-2xl border bg-card shadow-sm"
          >
            {/* Photo thumbnail */}
            <div
              className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center text-base font-bold text-white/30"
              style={{ background: match.profile.gradient }}
            >
              {match.profile.avatar}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">
                {match.profile.name}, {match.profile.age}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  {match.profile.distance}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {match.profile.bio}
              </p>
            </div>

            {/* Decision buttons */}
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => onDecide(match, "no")}
                className="w-10 h-10 rounded-full border-2 border-destructive/30 text-destructive hover:bg-destructive/10 active:scale-95 transition-all flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDecide(match, "yes")}
                className="w-10 h-10 rounded-full bg-foreground text-background hover:bg-foreground/80 active:scale-95 transition-all flex items-center justify-center"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-8">
        ✓ match them · ✕ let them go
      </p>
    </div>
  );
}

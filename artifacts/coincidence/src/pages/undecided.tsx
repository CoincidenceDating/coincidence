import { type Match } from "@/lib/data";
import { HelpCircle, Check, X, MapPin, Star } from "lucide-react";

interface UndecidedPageProps {
  undecided: Match[];
  onDecide: (match: Match, decision: "yes" | "no") => void;
}

export default function UndecidedPage({ undecided, onDecide }: UndecidedPageProps) {
  if (undecided.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 text-center">
        <svg viewBox="0 0 140 110" style={{ width: 128, height: 100, marginBottom: 8 }} aria-hidden>
          <path d="M 20 8 C 30 30, 55 28, 60 50 C 65 70, 45 80, 70 90" stroke="rgba(255,255,255,0.18)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 20 8 C 30 30, 55 28, 60 50 C 65 70, 45 80, 70 90" stroke="rgba(255,255,255,0.08)" strokeWidth="5.5" fill="none" strokeLinecap="round" />
          <path d="M 120 8 C 110 32, 88 30, 82 52 C 76 72, 95 80, 70 90" stroke="rgba(255,255,255,0.12)" strokeWidth="2" strokeDasharray="5 5" fill="none" strokeLinecap="round" />
          <path d="M 70 90 C 68 98, 65 105, 62 108" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M 70 90 C 72 98, 75 104, 74 108" stroke="rgba(255,255,255,0.10)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <circle cx="20" cy="8" r="5" fill="rgba(255,255,255,0.16)" />
          <circle cx="20" cy="8" r="2.5" fill="rgba(255,255,255,0.28)" />
          <circle cx="120" cy="8" r="5" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" strokeDasharray="3 2" />
          <text x="116" y="90" fontSize="22" fill="rgba(255,255,255,0.12)" fontFamily="Georgia, serif" fontStyle="italic">?</text>
        </svg>
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
            <div
              className="w-14 h-14 rounded-xl shrink-0 overflow-hidden flex items-center justify-center text-base font-bold text-white/30"
              style={{ background: match.profile.gradient }}
            >
              {match.profile.photo
                ? <img src={match.profile.photo} alt={match.profile.name} className="w-full h-full object-cover" />
                : match.profile.avatar}
            </div>
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
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => onDecide(match, "no")}
                className="w-10 h-10 rounded-full border-2 border-destructive/30 text-destructive hover:bg-destructive/10 active:scale-95 transition-all flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDecide(match, "yes")}
                className="w-10 h-10 rounded-full active:scale-95 transition-all flex items-center justify-center text-white"
                style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" }}
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

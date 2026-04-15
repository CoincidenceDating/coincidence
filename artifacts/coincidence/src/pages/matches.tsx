import { type Match } from "@/lib/data";
import { Sparkles, Heart, Wine, Beer, Coffee, Zap, MessageCircle } from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  wine: <Wine className="w-3.5 h-3.5" />,
  beer: <Beer className="w-3.5 h-3.5" />,
  coffee: <Coffee className="w-3.5 h-3.5" />,
  sparkles: <Sparkles className="w-3.5 h-3.5" />,
  swipe: <Heart className="w-3.5 h-3.5" />,
};

interface MatchesPageProps {
  matches: Match[];
  messageCounts: Record<string, number>;
  onOpenChat: (match: Match) => void;
}

export default function MatchesPage({ matches, messageCounts, onOpenChat }: MatchesPageProps) {
  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Heart className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">No matches yet</h2>
        <p className="text-muted-foreground text-sm mt-1 max-w-xs">
          Start swiping or activate Coincidence Mode to connect with people nearby.
        </p>
      </div>
    );
  }

  // Deduplicate: keep only the most recent match per profile
  const seen = new Set<string>();
  const deduped = matches.filter((m) => {
    if (seen.has(m.profile.id)) return false;
    seen.add(m.profile.id);
    return true;
  });

  // Group by source
  const groups = deduped.reduce<Record<string, Match[]>>((acc, match) => {
    const key = match.source;
    if (!acc[key]) acc[key] = [];
    acc[key].push(match);
    return acc;
  }, {});

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] px-4 py-6 max-w-md mx-auto w-full">
      <div className="flex items-center gap-2 mb-6">
        <Heart className="w-5 h-5 text-primary fill-primary" />
        <h1 className="text-xl font-bold">Your Matches</h1>
        <span className="ml-auto text-sm text-muted-foreground">
          {deduped.length} {deduped.length === 1 ? "match" : "matches"}
        </span>
      </div>

      <div className="space-y-6">
        {Object.entries(groups).map(([source, groupMatches]) => {
          const first = groupMatches[0];
          const label =
            source === "swipe"
              ? "From Swiping"
              : first.locationName ?? source;
          const icon = source === "swipe" ? "swipe" : (first.locationIcon ?? "sparkles");

          return (
            <div key={source}>
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-muted-foreground">{iconMap[icon]}</span>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {label}
                </h2>
                <span className="ml-auto text-xs text-muted-foreground">
                  {groupMatches.length}
                </span>
              </div>

              <div className="space-y-2">
                {groupMatches.map((match) => {
                  const msgCount = messageCounts[match.profile.id] ?? 0;
                  const hasMessages = msgCount > 0;
                  return (
                    <button
                      key={`${match.profile.id}-${match.matchedAt}`}
                      onClick={() => onOpenChat(match)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent/40 active:scale-[0.98] transition-all text-left"
                    >
                      <div className="relative shrink-0">
                        <div className="flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-br from-primary/70 to-primary text-primary-foreground text-sm font-bold">
                          {match.profile.avatar}
                        </div>
                        {hasMessages && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-background" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">
                          {match.profile.name},{" "}
                          <span className="text-muted-foreground font-normal">
                            {match.profile.age}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {hasMessages ? `${msgCount} message${msgCount > 1 ? "s" : ""}` : match.profile.bio}
                        </p>
                      </div>
                      <MessageCircle
                        className={`w-4 h-4 shrink-0 transition-colors ${hasMessages ? "text-primary" : "text-muted-foreground/40"}`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {deduped.length > 0 && (
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Zap className="w-3.5 h-3.5" />
          <span>
            {matches.filter((m) => m.source !== "swipe").length} from Coincidence
          </span>
          <span>·</span>
          <Heart className="w-3.5 h-3.5" />
          <span>
            {matches.filter((m) => m.source === "swipe").length} from Swiping
          </span>
        </div>
      )}
    </div>
  );
}

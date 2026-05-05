import { type Match, type CheckIn } from "@/lib/data";
import { type Message } from "@/pages/chat";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Sparkles, Heart, Wine, Beer, Coffee, MessageCircle, MapPin } from "lucide-react";

const locationIconMap: Record<string, React.ReactNode> = {
  wine:     <Wine     className="w-3 h-3" />,
  beer:     <Beer     className="w-3 h-3" />,
  coffee:   <Coffee   className="w-3 h-3" />,
  sparkles: <Sparkles className="w-3 h-3" />,
};

function starsAlignedOverlap(match: Match, checkIns: CheckIn[]): number {
  const visited = match.profile.visitedLocations ?? [];
  if (visited.length === 0) return 0;
  const myIds = checkIns.map((c) => c.locationId);
  return visited.filter((id) => myIds.includes(id)).length;
}

interface MatchesPageProps {
  matches: Match[];
  threads: Record<string, Message[]>;
  checkIns: CheckIn[];
  onOpenChat: (match: Match) => void;
}

export default function MatchesPage({ matches, threads = {}, checkIns, onOpenChat }: MatchesPageProps) {
  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 text-center">
        <svg viewBox="0 0 160 120" style={{ width: 140, height: 105, marginBottom: 8 }} aria-hidden>
          <path d="M 20 10 C 25 35, 45 45, 80 60" stroke="rgba(255,255,255,0.18)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 20 10 C 25 35, 45 45, 80 60" stroke="rgba(255,255,255,0.08)" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M 140 10 C 135 35, 115 45, 80 60" stroke="rgba(255,255,255,0.18)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 140 10 C 135 35, 115 45, 80 60" stroke="rgba(255,255,255,0.08)" strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="80" cy="60" r="10" fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="2" />
          <circle cx="80" cy="60" r="5.5" fill="rgba(255,255,255,0.12)" />
          <circle cx="80" cy="60" r="2.5" fill="rgba(255,255,255,0.28)" />
          <path d="M 80 70 C 78 85, 82 95, 80 110" stroke="rgba(255,255,255,0.14)" strokeWidth="2" strokeDasharray="4 5" fill="none" strokeLinecap="round" />
          <circle cx="20" cy="10" r="6" fill="rgba(255,255,255,0.14)" />
          <circle cx="20" cy="10" r="3" fill="rgba(255,255,255,0.26)" />
          <circle cx="140" cy="10" r="6" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeDasharray="3 3" />
        </svg>
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

  // Stars Aligned: 2+ shared locations
  const starsAligned = deduped.filter((m) => starsAlignedOverlap(m, checkIns) >= 2);
  const starsAlignedIds = new Set(starsAligned.map((m) => m.profile.id));

  const coincidenceMatches = deduped.filter((m) => m.source !== "swipe" && !starsAlignedIds.has(m.profile.id));
  const swipeMatches       = deduped.filter((m) => m.source === "swipe"  && !starsAlignedIds.has(m.profile.id));

  function MatchRow({ match }: { match: Match }) {
    const msgs        = threads[match.profile.id] ?? [];
    const lastMsg     = msgs[msgs.length - 1] ?? null;
    const hasMessages = msgs.length > 0;
    const overlap     = starsAlignedOverlap(match, checkIns);
    const isAligned   = overlap >= 2;
    const isCoincidence = match.source !== "swipe";
    const theyWrote   = lastMsg?.from === "them";

    function subline() {
      if (lastMsg) {
        return theyWrote
          ? <span className="text-foreground truncate">{lastMsg.text}</span>
          : <span className="text-muted-foreground truncate"><span className="text-muted-foreground/60">You: </span>{lastMsg.text}</span>;
      }
      if (isAligned) return <span className="text-muted-foreground">{overlap} places in common</span>;
      return null;
    }

    return (
      <button
        onClick={() => onOpenChat(match)}
        className="w-full flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent/40 active:scale-[0.98] transition-all text-left"
      >
        <div className="relative shrink-0">
          <ProfileAvatar profile={match.profile} size={44} />
          {theyWrote && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-background" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm">
              {match.profile.name},{" "}
              <span className="text-muted-foreground">{match.profile.age}</span>
            </p>
            {match.superLike && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-white text-[9px] font-semibold tracking-wide shrink-0" style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" }}>
                ✦✦ Double String
              </span>
            )}
            {isAligned && !match.superLike && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-foreground/8 border border-foreground/12 text-[9px] font-semibold tracking-wide text-foreground/70 shrink-0">
                ✦ Stars Aligned
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
            {isCoincidence && match.locationName && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
                {match.locationIcon && locationIconMap[match.locationIcon]
                  ? locationIconMap[match.locationIcon]
                  : <MapPin className="w-3 h-3" />}
                {match.locationName}
                <span className="mx-1 text-muted-foreground/30">·</span>
              </span>
            )}
            <p className="text-xs truncate min-w-0">{subline()}</p>
          </div>
        </div>

        <MessageCircle
          className={`w-4 h-4 shrink-0 transition-colors ${hasMessages ? "text-primary" : "text-muted-foreground/40"}`}
        />
      </button>
    );
  }

  function SectionHeader({ icon, label, count, sublabel }: { icon: React.ReactNode; label: string; count: number; sublabel?: string }) {
    return (
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</h2>
        {sublabel && (
          <span className="ml-1 text-[9px] text-muted-foreground/60 font-normal normal-case tracking-normal">{sublabel}</span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{count}</span>
      </div>
    );
  }

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

        {/* ── Stars Aligned ── */}
        {starsAligned.length > 0 && (
          <div>
            <SectionHeader
              icon={<span className="text-[13px]">✦</span>}
              label="Stars Aligned"
              count={starsAligned.length}
              sublabel="2+ places in common"
            />
            <div className="space-y-2">
              {starsAligned.map((m) => <MatchRow key={m.profile.id} match={m} />)}
            </div>
          </div>
        )}

        {/* ── Coincidence ── */}
        {coincidenceMatches.length > 0 && (
          <div>
            <SectionHeader
              icon={<MapPin className="w-3.5 h-3.5" />}
              label="Coincidence"
              count={coincidenceMatches.length}
              sublabel="met in person"
            />
            <div className="space-y-2">
              {coincidenceMatches.map((m) => <MatchRow key={m.profile.id} match={m} />)}
            </div>
          </div>
        )}

        {/* ── From Swiping ── */}
        {swipeMatches.length > 0 && (
          <div>
            <SectionHeader
              icon={<Heart className="w-3.5 h-3.5" />}
              label="From Swiping"
              count={swipeMatches.length}
            />
            <div className="space-y-2">
              {swipeMatches.map((m) => <MatchRow key={m.profile.id} match={m} />)}
            </div>
          </div>
        )}
      </div>

      {deduped.length > 0 && (
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5" />
          <span>{matches.filter((m) => m.source !== "swipe").length} from Coincidence</span>
          <span>·</span>
          <Heart className="w-3.5 h-3.5" />
          <span>{matches.filter((m) => m.source === "swipe").length} from Swiping</span>
        </div>
      )}
    </div>
  );
}

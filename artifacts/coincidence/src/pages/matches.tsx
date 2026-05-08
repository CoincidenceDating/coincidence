import { useState } from "react";
import { type Match, type CheckIn } from "@/lib/data";
import { type Message } from "@/pages/chat";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Sparkles, Heart, Wine, Beer, Coffee, MessageCircle, MapPin, MoreHorizontal, UserX } from "lucide-react";

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
  unreadIds: Set<string>;
  onOpenChat: (match: Match) => void;
  onUnmatch: (profileId: string) => void;
}

export default function MatchesPage({ matches, threads = {}, checkIns, unreadIds, onOpenChat, onUnmatch }: MatchesPageProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [confirmId, setConfirmId]   = useState<string | null>(null);

  function handleUnmatchConfirm(profileId: string) {
    setConfirmId(null);
    setMenuOpenId(null);
    onUnmatch(profileId);
  }

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
    const isUnread    = unreadIds.has(match.profile.id);
    const isMenuOpen  = menuOpenId === match.profile.id;
    const firstName   = match.profile.name.split(" ")[0];

    function subline() {
      if (lastMsg) {
        if (isUnread) {
          return (
            <span className="font-semibold truncate" style={{ color: "var(--foreground)" }}>
              {lastMsg.text}
            </span>
          );
        }
        return lastMsg.from === "me"
          ? <span className="text-muted-foreground truncate"><span className="text-muted-foreground/60">You: </span>{lastMsg.text}</span>
          : <span className="text-muted-foreground truncate">{lastMsg.text}</span>;
      }
      return null;
    }

    return (
      <div className="relative">
        <div
          className="w-full flex items-center gap-3 p-3 rounded-xl border bg-card transition-all"
          style={isUnread ? { borderColor: "rgba(232,56,125,0.35)", background: "rgba(232,56,125,0.05)" } : {}}
        >
          {/* Main tap area → open chat */}
          <button
            className="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-70 transition-opacity"
            onClick={() => { setMenuOpenId(null); onOpenChat(match); }}
          >
            <div className="relative shrink-0">
              <ProfileAvatar profile={match.profile} size={44} />
              {isUnread && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background"
                  style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" }}
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className={`text-sm ${isUnread ? "font-semibold" : ""}`}>
                  {match.profile.name},{" "}
                  <span className={isUnread ? "text-foreground/70" : "text-muted-foreground"}>{match.profile.age}</span>
                </p>
                {match.superLike && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-white text-[9px] font-semibold tracking-wide shrink-0" style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" }}>
                    ✦✦ Double String
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

              {/* Stars Aligned score — always visible when overlap > 0 */}
              {overlap > 0 && (
                <div className="mt-1.5 flex items-center gap-1">
                  {isAligned ? (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[9px] font-semibold tracking-wide"
                      style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" }}
                    >
                      ✦ Stars Aligned · {overlap} {overlap === 1 ? "place" : "places"} in common
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-foreground/6 border border-foreground/10 text-[9px] font-medium text-muted-foreground">
                      ✦ {overlap} {overlap === 1 ? "place" : "places"} in common
                    </span>
                  )}
                </div>
              )}
            </div>

            <MessageCircle
              className={`w-4 h-4 shrink-0 transition-colors ${isUnread ? "text-primary" : hasMessages ? "text-primary/50" : "text-muted-foreground/40"}`}
            />
          </button>

          {/* Three-dot menu button */}
          <button
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground/50 hover:text-muted-foreground hover:bg-white/5 transition-all"
            onClick={(e) => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : match.profile.id); }}
            aria-label="Match options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Dropdown menu */}
        {isMenuOpen && (
          <>
            {/* Backdrop to close */}
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
            <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
              <button
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                onClick={() => { setMenuOpenId(null); setConfirmId(match.profile.id); }}
              >
                <UserX className="w-4 h-4" />
                Unmatch {firstName}
              </button>
            </div>
          </>
        )}
      </div>
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

  const confirmMatch = confirmId ? deduped.find((m) => m.profile.id === confirmId) : null;

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

      {/* ── Unmatch confirmation modal ── */}
      {confirmMatch && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="text-center space-y-1">
              <p className="font-semibold text-sm">Unmatch {confirmMatch.profile.name.split(" ")[0]}?</p>
              <p className="text-xs text-muted-foreground">
                You'll both be removed from each other's matches and won't appear in Discover or Coincidence Mode.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-white/5 transition-colors"
                onClick={() => setConfirmId(null)}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" }}
                onClick={() => handleUnmatchConfirm(confirmMatch.profile.id)}
              >
                Unmatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

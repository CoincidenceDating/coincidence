import { useState } from "react";
import { type Match, type CheckIn } from "@/lib/data";
import { type Message } from "@/pages/chat";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Sparkles, Heart, Wine, Beer, Coffee, MapPin, MoreHorizontal, UserX, MessageCircle } from "lucide-react";

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

  // Split into conversations (has messages) vs new matches (no messages yet)
  const conversations = deduped
    .filter((m) => (threads[m.profile.id] ?? []).length > 0)
    .sort((a, b) => {
      const aLast = threads[a.profile.id]?.slice(-1)[0]?.timestamp ?? 0;
      const bLast = threads[b.profile.id]?.slice(-1)[0]?.timestamp ?? 0;
      return bLast - aLast;
    });

  const newMatches = deduped.filter((m) => (threads[m.profile.id] ?? []).length === 0);

  // Within new matches: Stars Aligned first, then Coincidence, then Swipe
  const sortedNewMatches = [
    ...newMatches.filter((m) => starsAlignedOverlap(m, checkIns) >= 2),
    ...newMatches.filter((m) => starsAlignedOverlap(m, checkIns) < 2 && m.source !== "swipe"),
    ...newMatches.filter((m) => starsAlignedOverlap(m, checkIns) < 2 && m.source === "swipe"),
  ];

  // ── Conversation row ─────────────────────────────────────────────────────────
  function ConversationRow({ match }: { match: Match }) {
    const msgs        = threads[match.profile.id] ?? [];
    const lastMsg     = msgs[msgs.length - 1] ?? null;
    const overlap     = starsAlignedOverlap(match, checkIns);
    const isAligned   = overlap >= 2;
    const isCoincidence = match.source !== "swipe";
    const isUnread    = unreadIds.has(match.profile.id);
    const isMenuOpen  = menuOpenId === match.profile.id;
    const firstName   = match.profile.name.split(" ")[0];

    return (
      <div className="relative">
        <div
          className="w-full flex items-center gap-3 p-3 rounded-xl border bg-card transition-all"
          style={isUnread ? { borderColor: "rgba(232,56,125,0.35)", background: "rgba(232,56,125,0.05)" } : {}}
        >
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
                {isAligned && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-white text-[9px] font-semibold shrink-0" style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" }}>
                    ✦ Stars Aligned
                  </span>
                )}
                {!isAligned && isCoincidence && match.locationName && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-foreground/6 border border-foreground/10 text-[9px] text-muted-foreground shrink-0">
                    {match.locationIcon && locationIconMap[match.locationIcon]
                      ? locationIconMap[match.locationIcon]
                      : <MapPin className="w-2.5 h-2.5" />}
                    {match.locationName}
                  </span>
                )}
              </div>

              {lastMsg && (
                <p className={`text-xs mt-0.5 truncate ${isUnread ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                  {lastMsg.from === "me" ? <span className="text-muted-foreground/60">You: </span> : null}
                  {lastMsg.text}
                </p>
              )}
            </div>

            <MessageCircle
              className={`w-4 h-4 shrink-0 transition-colors ${isUnread ? "text-primary" : "text-primary/40"}`}
            />
          </button>

          <button
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground/50 hover:text-muted-foreground hover:bg-white/5 transition-all"
            onClick={(e) => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : match.profile.id); }}
            aria-label="Match options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {isMenuOpen && (
          <>
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

  // ── New match bubble (horizontal scroll) ────────────────────────────────────
  function NewMatchBubble({ match }: { match: Match }) {
    const overlap     = starsAlignedOverlap(match, checkIns);
    const isAligned   = overlap >= 2;
    const isCoincidence = match.source !== "swipe";
    const firstName   = match.profile.name.split(" ")[0];
    const isMenuOpen  = menuOpenId === match.profile.id;

    return (
      <div className="relative flex flex-col items-center shrink-0 w-[72px]">
        <button
          className="relative active:opacity-70 transition-opacity"
          onClick={() => { setMenuOpenId(null); onOpenChat(match); }}
          onContextMenu={(e) => { e.preventDefault(); setMenuOpenId(isMenuOpen ? null : match.profile.id); }}
        >
          {/* Gradient ring for Stars Aligned */}
          {isAligned ? (
            <span
              className="absolute inset-0 rounded-full"
              style={{
                padding: 2,
                background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)",
                borderRadius: "50%",
                zIndex: 0,
              }}
            />
          ) : isCoincidence ? (
            <span
              className="absolute inset-0 rounded-full border-2"
              style={{ borderColor: "rgba(155,93,229,0.5)", borderRadius: "50%", zIndex: 0 }}
            />
          ) : null}
          <span className={`block relative z-10 ${isAligned ? "m-[2px]" : ""}`}>
            <ProfileAvatar profile={match.profile} size={52} />
          </span>
          {/* Badge for source type */}
          {isAligned ? (
            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[9px] z-20">✦</span>
          ) : isCoincidence ? (
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-background flex items-center justify-center z-20">
              <MapPin className="w-2.5 h-2.5 text-purple-400" />
            </span>
          ) : null}
        </button>
        <span className="mt-1.5 text-[11px] text-muted-foreground text-center truncate w-full px-0.5">
          {firstName}
        </span>

        {/* Long-press / right-click menu */}
        {isMenuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-20 w-40 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
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

  const confirmMatch = confirmId ? deduped.find((m) => m.profile.id === confirmId) : null;

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] pb-6 max-w-md mx-auto w-full">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-4 pt-6 pb-4">
        <Heart className="w-5 h-5 text-primary fill-primary" />
        <h1 className="text-xl font-bold">Your Matches</h1>
        <span className="ml-auto text-sm text-muted-foreground">
          {deduped.length} {deduped.length === 1 ? "match" : "matches"}
        </span>
      </div>

      {/* ── New Matches section (horizontal scroll) ── */}
      {sortedNewMatches.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-1.5 px-4 mb-3">
            <span className="text-[13px] text-muted-foreground">✨</span>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">New Matches</h2>
            <span className="ml-auto text-xs text-muted-foreground">{sortedNewMatches.length}</span>
          </div>
          <div
            className="overflow-x-auto pb-2 pt-1"
            style={{ scrollbarWidth: "none" }}
          >
            {(() => {
              const BUBBLE_W = 72;
              const GAP      = 16;
              const PAD      = 16;
              const AVATAR_W = 52;
              const AVATAR_OFFSET_X = (BUBBLE_W - AVATAR_W) / 2; // 10px
              const centerY  = 27; // pt-1 + half of 52px avatar
              const n        = sortedNewMatches.length;
              const totalW   = PAD + n * BUBBLE_W + (n - 1) * GAP + PAD;

              // Build SVG path: drooping segment between each pair of adjacent avatars
              let d = "";
              if (n > 1) {
                for (let i = 0; i < n - 1; i++) {
                  const x0 = PAD + i * (BUBBLE_W + GAP) + AVATAR_OFFSET_X + AVATAR_W; // right edge of avatar i
                  const x1 = PAD + (i + 1) * (BUBBLE_W + GAP) + AVATAR_OFFSET_X;      // left edge of avatar i+1
                  const cx = (x0 + x1) / 2;
                  const cy = centerY + 8;
                  d += `M ${x0} ${centerY} Q ${cx} ${cy} ${x1} ${centerY} `;
                }
              }

              return (
                <div className="relative flex gap-4 px-4" style={{ width: totalW }}>
                  {/* String SVG — behind all bubbles */}
                  {n > 1 && (
                    <svg
                      aria-hidden
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: totalW,
                        height: 60,
                        pointerEvents: "none",
                        zIndex: 0,
                        overflow: "visible",
                      }}
                    >
                      <defs>
                        <linearGradient id="bubble-string-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%"   stopColor="#E8387D" stopOpacity="0.6" />
                          <stop offset="50%"  stopColor="#C060B8" stopOpacity="0.6" />
                          <stop offset="100%" stopColor="#9B5DE5" stopOpacity="0.6" />
                        </linearGradient>
                      </defs>
                      <path
                        d={d}
                        fill="none"
                        stroke="url(#bubble-string-grad)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}

                  {/* Bubbles — on top of string */}
                  {sortedNewMatches.map((m) => (
                    <div key={m.profile.id} className="relative" style={{ zIndex: 1 }}>
                      <NewMatchBubble match={m} />
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
          {/* Divider */}
          <div className="mt-4 mx-4 h-px bg-border/50" />
        </div>
      )}

      {/* ── Conversations section ── */}
      {conversations.length > 0 && (
        <div className="px-4 mt-4">
          <div className="flex items-center gap-1.5 mb-3">
            <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Conversations</h2>
            <span className="ml-auto text-xs text-muted-foreground">{conversations.length}</span>
          </div>
          <div className="space-y-2">
            {conversations.map((m) => <ConversationRow key={m.profile.id} match={m} />)}
          </div>
        </div>
      )}

      {/* ── Empty conversations hint ── */}
      {sortedNewMatches.length > 0 && conversations.length === 0 && (
        <div className="px-4 mt-4 flex flex-col items-center gap-1 py-6 text-center">
          <MessageCircle className="w-8 h-8 text-muted-foreground/30 mb-1" />
          <p className="text-sm text-muted-foreground">No conversations yet</p>
          <p className="text-xs text-muted-foreground/60">Tap a match above to say hello</p>
        </div>
      )}

      {/* ── Footer stats ── */}
      {deduped.length > 0 && (
        <div className="mt-8 px-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
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

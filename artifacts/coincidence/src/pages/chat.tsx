import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, MoreVertical, UserX, Flag, X } from "lucide-react";
import type { Match } from "@/lib/data";
import { ProfileAvatar } from "@/components/ProfileAvatar";

export interface Message {
  id: string;
  text: string;
  from: "me" | "them";
  timestamp: number;
}

const AUTO_REPLIES = [
  "Haha, what are the odds!",
  "I was thinking the same thing 😊",
  "That's such a coincidence...",
  "We should grab coffee sometime ☕",
  "Totally! I feel like this was meant to happen",
  "Really? That's so interesting!",
  "I'm glad we connected 🙂",
  "You seem really cool, honestly",
  "Ha, small world right?",
  "I love that about you already",
];

function getOpeningMessage(match: Match): string {
  if (match.source === "swipe") {
    return "Hey! We matched 👋 How's your day going?";
  }
  const loc = match.locationName ?? "there";
  if (match.locationIcon === "coffee") return `This place has the best coffee, right? So glad we found each other at ${loc}!`;
  if (match.locationIcon === "wine") return `What a night at ${loc}! Really glad we connected 🍷`;
  if (match.locationIcon === "beer") return `${loc} is my favourite spot. Crazy we hadn't crossed paths before!`;
  return `What are the odds of running into you at ${loc}? Glad we did 😄`;
}

const REPORT_REASONS = [
  "Inappropriate messages",
  "Feels fake or spam",
  "Offensive behaviour",
  "Made me uncomfortable",
  "Other",
];

interface ChatPageProps {
  match: Match;
  messages: Message[];
  onSend: (profileId: string, text: string) => void;
  onBack: () => void;
  onUnmatch: () => void;
  onReport: (reason: string) => void;
}

export default function ChatPage({ match, messages, onSend, onBack, onUnmatch, onReport }: ChatPageProps) {
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [showMenu, setShowMenu] = useState(false);
  const [showUnmatchConfirm, setShowUnmatchConfirm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const firstName = match.profile.name.split(" ")[0];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    onSend(match.profile.id, text);

    // Simulate typing indicator then auto-reply
    setTimeout(() => setIsTyping(true), 800);
    const delay = 1400 + Math.random() * 800;
    setTimeout(() => {
      setIsTyping(false);
      const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
      onSend(`__them__${match.profile.id}`, reply);
    }, delay);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const locationTag = match.source !== "swipe" && match.locationName
    ? `Met at ${match.locationName}`
    : "Matched on Swipe";

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 32, stiffness: 320 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <ProfileAvatar profile={match.profile} size={40} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm leading-tight truncate">
            {match.profile.name}
          </p>
          <p className="text-xs text-muted-foreground truncate">{locationTag}</p>
        </div>
        <button
          onClick={() => setShowMenu(true)}
          className="p-1.5 rounded-full hover:bg-muted transition-colors shrink-0"
        >
          <MoreVertical className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">

        {/* ── String connection header ── */}
        <div className="flex flex-col items-center pt-3 pb-5">
          <div className="flex items-center">
            {/* Match avatar */}
            <ProfileAvatar profile={match.profile} size={38} />

            {/* Rope SVG — sags when no messages, ties when messages exist */}
            <svg viewBox="0 0 130 36" style={{ width: 130, height: 36, overflow: "visible" }} aria-hidden>
              <motion.path
                d={messages.length > 0
                  ? "M 5 18 C 42 14, 88 22, 125 18"
                  : "M 5 18 C 35 32, 95 32, 125 18"
                }
                stroke="rgba(0,0,0,0.28)"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                animate={{
                  d: messages.length > 0
                    ? "M 5 18 C 42 14, 88 22, 125 18"
                    : "M 5 18 C 35 32, 95 32, 125 18",
                }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
              {/* Texture strand */}
              <motion.path
                d={messages.length > 0
                  ? "M 5 18 C 42 14, 88 22, 125 18"
                  : "M 5 18 C 35 32, 95 32, 125 18"
                }
                stroke="rgba(0,0,0,0.10)"
                strokeWidth="1"
                strokeDasharray="5 7"
                fill="none"
                strokeLinecap="round"
                animate={{
                  d: messages.length > 0
                    ? "M 5 18 C 42 14, 88 22, 125 18"
                    : "M 5 18 C 35 32, 95 32, 125 18",
                }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
              {/* Knot — appears when tied */}
              <motion.circle
                cx={65} cy={18}
                r={4.5}
                fill="rgba(0,0,0,0.30)"
                initial={{ scale: 0, opacity: 0 }}
                animate={messages.length > 0
                  ? { scale: 1, opacity: 1, cy: 18 }
                  : { scale: 0, opacity: 0, cy: 25 }
                }
                transition={{ duration: 0.5, delay: messages.length > 0 ? 0.4 : 0, ease: "easeOut" }}
              />
              <motion.circle
                cx={65} cy={18}
                r={2}
                fill="rgba(0,0,0,0.55)"
                initial={{ scale: 0, opacity: 0 }}
                animate={messages.length > 0
                  ? { scale: 1, opacity: 1 }
                  : { scale: 0, opacity: 0 }
                }
                transition={{ duration: 0.4, delay: messages.length > 0 ? 0.5 : 0 }}
              />
            </svg>

            {/* You avatar */}
            <div
              style={{ width: 38, height: 38, borderRadius: "50%", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.45)", flexShrink: 0 }}
            >
              You
            </div>
          </div>
          <motion.p
            className="text-[11px] text-muted-foreground mt-2 italic"
            animate={{ opacity: 1 }}
            initial={{ opacity: 0 }}
            transition={{ delay: 0.3 }}
          >
            {messages.length > 0 ? "the string is tied" : "the invisible string"}
          </motion.p>
        </div>

        {messages.map((msg) => {
          const isMe = msg.from === "me";
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              {!isMe && (
                <ProfileAvatar profile={match.profile} size={28} className="mr-2 mt-1 self-end" />
              )}
              <div
                className={`max-w-[72%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-end gap-2"
          >
            <ProfileAvatar profile={match.profile} size={28} />
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-muted-foreground block"
                  animate={{ y: [0, -4, 0] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t bg-card shrink-0 flex gap-2 items-center">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          placeholder={`Message ${match.profile.name.split(" ")[0]}...`}
          className="flex-1 px-4 py-2.5 rounded-full bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          autoFocus
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim()}
          className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
        >
          <Send className="w-4 h-4 text-primary-foreground" />
        </button>
      </div>

      {/* ── Action menu sheet ── */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div
              className="absolute inset-0 bg-black/40 z-10"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowMenu(false)}
            />
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl z-20 p-5 space-y-3"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
            >
              <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />
              <button
                onClick={() => { setShowMenu(false); setShowUnmatchConfirm(true); }}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-muted transition-colors text-left"
              >
                <UserX className="w-5 h-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">Unmatch {firstName}</p>
                  <p className="text-xs text-muted-foreground">Remove this connection permanently</p>
                </div>
              </button>
              <button
                onClick={() => { setShowMenu(false); setShowReport(true); }}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-muted transition-colors text-left"
              >
                <Flag className="w-5 h-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">Report {firstName}</p>
                  <p className="text-xs text-muted-foreground">Let us know if something felt off</p>
                </div>
              </button>
              <button
                onClick={() => setShowMenu(false)}
                className="w-full py-3.5 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors font-medium"
              >
                Cancel
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Unmatch confirmation ── */}
      <AnimatePresence>
        {showUnmatchConfirm && (
          <>
            <motion.div
              className="absolute inset-0 bg-black/50 z-10"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowUnmatchConfirm(false)}
            />
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl z-20 p-6"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
            >
              <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-5" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <UserX className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Unmatch {firstName}?</p>
                  <p className="text-xs text-muted-foreground">Your connection and messages will be removed. This can't be undone.</p>
                </div>
              </div>
              <button
                onClick={() => { setShowUnmatchConfirm(false); onUnmatch(); }}
                className="w-full py-3.5 rounded-xl bg-foreground text-background text-sm font-semibold mb-2 active:scale-[0.98] transition-transform"
              >
                Unmatch
              </button>
              <button
                onClick={() => setShowUnmatchConfirm(false)}
                className="w-full py-3.5 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors font-medium"
              >
                Cancel
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Report flow ── */}
      <AnimatePresence>
        {showReport && (
          <>
            <motion.div
              className="absolute inset-0 bg-black/50 z-10"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { if (!reportSubmitted) setShowReport(false); }}
            />
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl z-20 p-6"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
            >
              <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-5" />
              <AnimatePresence mode="wait">
                {reportSubmitted ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center py-4 gap-3"
                  >
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Flag className="w-5 h-5 text-foreground" />
                    </div>
                    <p className="font-semibold text-sm">Report submitted</p>
                    <p className="text-xs text-muted-foreground text-center">Thanks for letting us know. We'll look into it and take action if needed.</p>
                    <button
                      onClick={() => { setShowReport(false); setReportSubmitted(false); setReportReason(null); onReport(reportReason!); }}
                      className="mt-2 w-full py-3.5 rounded-xl bg-foreground text-background text-sm font-semibold active:scale-[0.98] transition-transform"
                    >
                      Done
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-semibold text-sm">Report {firstName}</p>
                        <p className="text-xs text-muted-foreground">What's the reason?</p>
                      </div>
                      <button onClick={() => setShowReport(false)} className="p-1.5 rounded-full hover:bg-muted transition-colors">
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="space-y-2 mb-4">
                      {REPORT_REASONS.map((reason) => (
                        <button
                          key={reason}
                          onClick={() => setReportReason(reason)}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-all ${
                            reportReason === reason
                              ? "bg-foreground text-background border-foreground"
                              : "bg-transparent text-foreground border-border hover:border-foreground/40"
                          }`}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                    <button
                      disabled={!reportReason}
                      onClick={() => setReportSubmitted(true)}
                      className="w-full py-3.5 rounded-xl bg-foreground text-background text-sm font-semibold disabled:opacity-30 active:scale-[0.98] transition-all"
                    >
                      Submit report
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

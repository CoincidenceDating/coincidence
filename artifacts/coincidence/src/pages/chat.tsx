import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send } from "lucide-react";
import type { Match } from "@/lib/data";

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

interface ChatPageProps {
  match: Match;
  messages: Message[];
  onSend: (profileId: string, text: string) => void;
  onBack: () => void;
}

export default function ChatPage({ match, messages, onSend, onBack }: ChatPageProps) {
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary/70 to-primary text-primary-foreground text-sm font-bold shrink-0">
          {match.profile.avatar}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">
            {match.profile.name}
          </p>
          <p className="text-xs text-muted-foreground truncate">{locationTag}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
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
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-primary/60 to-primary text-primary-foreground text-xs font-bold shrink-0 mr-2 mt-1 self-end">
                  {match.profile.avatar}
                </div>
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
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-primary/60 to-primary text-primary-foreground text-xs font-bold shrink-0">
              {match.profile.avatar}
            </div>
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
    </motion.div>
  );
}

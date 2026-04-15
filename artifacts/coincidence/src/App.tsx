import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SwipePage from "@/pages/swipe";
import CoincidencePage from "@/pages/coincidence";
import MatchesPage from "@/pages/matches";
import ProfilePage from "@/pages/profile";
import ChatPage, { type Message } from "@/pages/chat";
import { Heart, Zap, Sparkles, User } from "lucide-react";
import type { Match } from "@/lib/data";

const queryClient = new QueryClient();

type Tab = "swipe" | "coincidence" | "matches" | "profile";

function getOpeningText(match: Match): string {
  if (match.source === "swipe") return "Hey! We matched 👋 How's your day going?";
  const loc = match.locationName ?? "there";
  if (match.locationIcon === "coffee") return `This place has the best coffee, right? So glad we found each other at ${loc}!`;
  if (match.locationIcon === "wine") return `What a night at ${loc}! Really glad we connected 🍷`;
  if (match.locationIcon === "beer") return `${loc} is my favourite spot. Crazy we hadn't crossed paths before!`;
  return `What are the odds of running into you at ${loc}? Glad we did 😄`;
}

function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFading(true), 1800);
    const done = setTimeout(() => onDone(), 2300);
    return () => { clearTimeout(timer); clearTimeout(done); };
  }, [onDone]);

  return (
    <div
      onClick={() => { setFading(true); setTimeout(onDone, 400); }}
      style={{
        position: "fixed", inset: 0, height: "100vh",
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        backgroundColor: "#0f0f0f", color: "white",
        textAlign: "center", cursor: "pointer",
        zIndex: 9999, transition: "opacity 0.5s ease",
        opacity: fading ? 0 : 1,
      }}
    >
      <h1 style={{ fontSize: "3rem", marginBottom: "1rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
        Coincidence
      </h1>
      <p style={{ fontSize: "1.2rem", opacity: 0.6, fontStyle: "italic" }}>
        making the invisible string – visible
      </p>
    </div>
  );
}

function AppShell() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("swipe");
  const [matches, setMatches] = useState<Match[]>([]);
  const [newMatchCount, setNewMatchCount] = useState(0);
  const [activeChat, setActiveChat] = useState<Match | null>(null);
  // messages keyed by profile id
  const [threads, setThreads] = useState<Record<string, Message[]>>({});

  const messageCounts = Object.fromEntries(
    Object.entries(threads).map(([id, msgs]) => [id, msgs.length])
  );

  function handleMatch(match: Match) {
    setMatches((prev) => {
      // avoid exact duplicate (same profile + same source)
      const exists = prev.some(
        (m) => m.profile.id === match.profile.id && m.source === match.source
      );
      return exists ? prev : [...prev, match];
    });
    if (activeTab !== "matches") {
      setNewMatchCount((c) => c + 1);
    }
  }

  function handleTabChange(tab: Tab) {
    if (tab === "matches") setNewMatchCount(0);
    setActiveTab(tab);
  }

  function handleOpenChat(match: Match) {
    // Seed opening message the first time
    setThreads((prev) => {
      if (prev[match.profile.id]) return prev;
      const opening: Message = {
        id: `open-${match.profile.id}`,
        text: getOpeningText(match),
        from: "them",
        timestamp: Date.now(),
      };
      return { ...prev, [match.profile.id]: [opening] };
    });
    setActiveChat(match);
  }

  function handleSend(profileId: string, text: string) {
    const isTheirReply = profileId.startsWith("__them__");
    const realId = isTheirReply ? profileId.replace("__them__", "") : profileId;

    const msg: Message = {
      id: `${realId}-${Date.now()}-${Math.random()}`,
      text,
      from: isTheirReply ? "them" : "me",
      timestamp: Date.now(),
    };

    setThreads((prev) => ({
      ...prev,
      [realId]: [...(prev[realId] ?? []), msg],
    }));
  }

  if (showSplash) return <SplashScreen onDone={() => setShowSplash(false)} />;

  const tabs: { id: Tab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
    {
      id: "swipe",
      label: "Swipe",
      icon: (a) => <Heart className={`w-5 h-5 ${a ? "fill-primary" : ""}`} />,
    },
    {
      id: "coincidence",
      label: "Coincidence",
      icon: (a) => <Zap className={`w-5 h-5 ${a ? "fill-primary" : ""}`} />,
    },
    {
      id: "matches",
      label: "Matches",
      icon: (a) => (
        <div className="relative">
          <Sparkles className={`w-5 h-5 ${a ? "fill-primary" : ""}`} />
          {newMatchCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none">
              {newMatchCount > 9 ? "9+" : newMatchCount}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "profile",
      label: "Profile",
      icon: (a) => <User className={`w-5 h-5 ${a ? "fill-primary" : ""}`} />,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1">
        {activeTab === "swipe" && <SwipePage onMatch={handleMatch} />}
        {activeTab === "coincidence" && <CoincidencePage onMatch={handleMatch} />}
        {activeTab === "matches" && (
          <MatchesPage
            matches={matches}
            messageCounts={messageCounts}
            onOpenChat={handleOpenChat}
          />
        )}
        {activeTab === "profile" && <ProfilePage matches={matches} />}
      </main>

      <nav className="sticky bottom-0 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex max-w-lg mx-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon(activeTab === tab.id)}
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Chat overlay — slides up over everything */}
      <AnimatePresence>
        {activeChat && (
          <ChatPage
            key={activeChat.profile.id}
            match={activeChat}
            messages={threads[activeChat.profile.id] ?? []}
            onSend={handleSend}
            onBack={() => setActiveChat(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppShell />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

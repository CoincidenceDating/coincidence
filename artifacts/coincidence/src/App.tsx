import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SwipePage from "@/pages/swipe";
import CoincidencePage from "@/pages/coincidence";
import MatchesPage from "@/pages/matches";
import UndecidedPage from "@/pages/undecided";
import ProfilePage from "@/pages/profile";
import ChatPage, { type Message } from "@/pages/chat";
import SetupPage, { type SetupData } from "@/pages/setup";
import { Heart, Zap, Sparkles, HelpCircle, User } from "lucide-react";
import { StringIcon } from "@/components/StringIcon";
import type { Match, CheckIn } from "@/lib/data";

const queryClient = new QueryClient();

type Tab = "swipe" | "coincidence" | "matches" | "undecided" | "profile";

function getOpeningText(match: Match): string {
  if (match.source === "swipe") return "Hey! We matched 👋 How's your day going?";
  const loc = match.locationName ?? "there";
  if (match.locationIcon === "coffee") return `This place has the best coffee, right? So glad we found each other at ${loc}!`;
  if (match.locationIcon === "wine") return `What a night at ${loc}! Really glad we connected 🍷`;
  if (match.locationIcon === "beer") return `${loc} is my favourite spot. Crazy we hadn't crossed paths before!`;
  return `What are the odds of running into you at ${loc}? Glad we did 😄`;
}

function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 60);
    const t2 = setTimeout(() => setPhase("out"), 2600);
    const t3 = setTimeout(() => onDone(), 3150);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  const ready = phase === "hold";
  const gone  = phase === "out";

  return (
    <div
      onClick={() => { setPhase("out"); setTimeout(onDone, 550); }}
      style={{
        position: "fixed", inset: 0, height: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center",
        backgroundColor: "#ffffff",
        textAlign: "center", cursor: "pointer",
        zIndex: 9999,
        transition: "opacity 0.6s ease",
        opacity: gone ? 0 : 1,
        paddingTop: "6vh",
        paddingBottom: "8vh",
      }}
    >
      {/* Logo — fills most of screen */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        transform: ready ? "scale(1)" : "scale(0.88)",
        opacity: ready ? 1 : 0,
        transition: "transform 0.85s cubic-bezier(0.34,1.4,0.64,1), opacity 0.6s ease",
      }}>
        <img
          src="/logo.jpeg"
          alt="Coincidence"
          style={{
            width: "min(78vw, 340px)",
            height: "min(78vw, 340px)",
            objectFit: "contain",
          }}
        />
      </div>

      {/* Wordmark */}
      <div style={{
        transform: ready ? "translateY(0)" : "translateY(14px)",
        opacity: ready ? 1 : 0,
        transition: "transform 0.7s cubic-bezier(0.34,1.2,0.64,1) 0.15s, opacity 0.6s ease 0.15s",
        paddingBottom: "4px",
      }}>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "clamp(2.4rem, 8vw, 3.2rem)",
          fontWeight: 600,
          letterSpacing: "0.04em",
          color: "#0a0a0a",
          margin: 0,
          lineHeight: 1,
        }}>
          Coincidence
        </h1>
        <p style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "clamp(0.95rem, 3.5vw, 1.1rem)",
          fontWeight: 400,
          fontStyle: "italic",
          color: "#888",
          marginTop: "12px",
          letterSpacing: "0.01em",
        }}>
          making the invisible string – visible
        </p>
      </div>
    </div>
  );
}

const SETUP_FLAG = "coincidence_setup_complete";
const PROFILE_KEY = "coincidence_profile";

function AppShell() {
  const [showSplash, setShowSplash]   = useState(true);
  const [showSetup, setShowSetup]     = useState(() => !localStorage.getItem(SETUP_FLAG));
  const [activeTab, setActiveTab]     = useState<Tab>("swipe");

  function readLookingFor(): string {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) return JSON.parse(raw).lookingFor ?? "Everyone";
    } catch {}
    return "Everyone";
  }
  const [lookingFor, setLookingFor] = useState<string>(readLookingFor);
  const [matches, setMatches] = useState<Match[]>([]);
  const [undecided, setUndecided] = useState<Match[]>([]);
  const [newMatchCount, setNewMatchCount] = useState(0);
  const [newUndecidedCount, setNewUndecidedCount] = useState(0);
  const [activeChat, setActiveChat] = useState<Match | null>(null);
  const [threads, setThreads] = useState<Record<string, Message[]>>({});
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [boostCredits, setBoostCredits] = useState(3);
  const [boostActiveUntil, setBoostActiveUntil] = useState<number | null>(null);
  const [boostTimeLeft, setBoostTimeLeft] = useState(0);
  const [boostRadius, setBoostRadius] = useState(5);

  const BOOST_DURATION_MS = 30 * 60 * 1000;
  const MAX_BOOST_CREDITS = 5;
  const isBoostActive = boostActiveUntil !== null && boostTimeLeft > 0;

  const checkedInLocations = new Set(checkIns.map((c) => c.locationId));

  // Countdown tick
  useEffect(() => {
    if (!boostActiveUntil) return;
    const tick = () => {
      const left = boostActiveUntil - Date.now();
      if (left <= 0) {
        setBoostTimeLeft(0);
        setBoostActiveUntil(null);
      } else {
        setBoostTimeLeft(left);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [boostActiveUntil]);

  function handleActivateBoost() {
    if (boostCredits <= 0 || isBoostActive) return;
    setBoostCredits((c) => c - 1);
    const until = Date.now() + BOOST_DURATION_MS;
    setBoostActiveUntil(until);
    setBoostTimeLeft(BOOST_DURATION_MS);
  }

  function handleSetupComplete(data: SetupData) {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({
        name: data.name,
        age: data.age,
        bio: data.bio,
        hometown: data.hometown,
        height: data.height,
        hobbies: data.hobbies,
        lookingFor: data.lookingFor,
        ageMin: data.ageMin,
        ageMax: data.ageMax,
      }));
      localStorage.setItem(SETUP_FLAG, "1");
    } catch {}
    setLookingFor(data.lookingFor ?? "Everyone");
    setShowSetup(false);
  }

  function handleResetSetup() {
    try {
      localStorage.removeItem(SETUP_FLAG);
      localStorage.removeItem(PROFILE_KEY);
    } catch {}
    setShowSetup(true);
  }

  function handleCheckIn(checkIn: CheckIn) {
    setCheckIns((prev) => {
      if (prev.some((c) => c.locationId === checkIn.locationId)) return prev;
      // Earn 1 boost credit for a new location
      setBoostCredits((c) => Math.min(c + 1, MAX_BOOST_CREDITS));
      return [...prev, checkIn];
    });
  }

  const messageCounts = Object.fromEntries(
    Object.entries(threads).map(([id, msgs]) => [id, msgs.length])
  );

  function handleMatch(match: Match) {
    setMatches((prev) => {
      const exists = prev.some(
        (m) => m.profile.id === match.profile.id && m.source === match.source
      );
      return exists ? prev : [...prev, match];
    });
    if (activeTab !== "matches") setNewMatchCount((c) => c + 1);
  }

  function handleMaybe(match: Match) {
    setUndecided((prev) => {
      const exists = prev.some((m) => m.profile.id === match.profile.id);
      return exists ? prev : [...prev, match];
    });
    if (activeTab !== "undecided") setNewUndecidedCount((c) => c + 1);
  }

  function handleUndecidedDecision(match: Match, decision: "yes" | "no") {
    setUndecided((prev) => prev.filter((m) => m.profile.id !== match.profile.id));
    if (decision === "yes") handleMatch(match);
  }

  function handleTabChange(tab: Tab) {
    if (tab === "matches") setNewMatchCount(0);
    if (tab === "undecided") setNewUndecidedCount(0);
    if (tab === "swipe" || tab === "coincidence") setLookingFor(readLookingFor());
    setActiveTab(tab);
  }

  function handleOpenChat(match: Match) {
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
      text, from: isTheirReply ? "them" : "me", timestamp: Date.now(),
    };
    setThreads((prev) => ({ ...prev, [realId]: [...(prev[realId] ?? []), msg] }));
  }

  if (showSplash) return <SplashScreen onDone={() => setShowSplash(false)} />;
  if (showSetup) return (
    <AnimatePresence>
      <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
        <SetupPage onComplete={handleSetupComplete} />
      </motion.div>
    </AnimatePresence>
  );

  const tabs: { id: Tab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
    {
      id: "swipe",
      label: "Swipe",
      icon: (a) => (
        <div className="relative">
          <Heart className={`w-5 h-5 ${a ? "fill-foreground" : ""}`} />
          {isBoostActive && (
            <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-foreground border-2 border-background flex items-center justify-center">
              <StringIcon className="w-2 h-2 text-background" />
            </span>
          )}
        </div>
      ),
    },
    {
      id: "coincidence",
      label: "Coincidence",
      icon: (a) => <Zap className={`w-5 h-5 ${a ? "fill-foreground" : ""}`} />,
    },
    {
      id: "matches",
      label: "Matches",
      icon: (a) => (
        <div className="relative">
          <Sparkles className={`w-5 h-5 ${a ? "fill-foreground" : ""}`} />
          {newMatchCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center leading-none">
              {newMatchCount > 9 ? "9+" : newMatchCount}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "undecided",
      label: "Maybe",
      icon: (a) => (
        <div className="relative">
          <HelpCircle className={`w-5 h-5 ${a ? "fill-foreground" : ""}`} />
          {newUndecidedCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-400 text-black text-[10px] font-bold flex items-center justify-center leading-none">
              {newUndecidedCount > 9 ? "9+" : newUndecidedCount}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "profile",
      label: "Profile",
      icon: (a) => <User className={`w-5 h-5 ${a ? "fill-foreground" : ""}`} />,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1">
        {activeTab === "swipe" && <SwipePage onMatch={handleMatch} onMaybe={handleMaybe} isBoostActive={isBoostActive} boostTimeLeft={boostTimeLeft} boostRadius={boostRadius} boostCredits={boostCredits} onActivateBoost={handleActivateBoost} lookingFor={lookingFor} />}
        {activeTab === "coincidence" && <CoincidencePage onMatch={handleMatch} onMaybe={handleMaybe} onCheckIn={handleCheckIn} checkedInLocations={checkedInLocations} lookingFor={lookingFor} />}
        {activeTab === "matches" && (
          <MatchesPage matches={matches} messageCounts={messageCounts} onOpenChat={handleOpenChat} />
        )}
        {activeTab === "undecided" && (
          <UndecidedPage undecided={undecided} onDecide={handleUndecidedDecision} />
        )}
        {activeTab === "profile" && <ProfilePage matches={matches} checkIns={checkIns} boostCredits={boostCredits} isBoostActive={isBoostActive} boostTimeLeft={boostTimeLeft} boostRadius={boostRadius} onBoostRadiusChange={setBoostRadius} onActivateBoost={handleActivateBoost} onResetSetup={handleResetSetup} />}
      </main>

      <nav className="sticky bottom-0 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex max-w-lg mx-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors ${
                activeTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon(activeTab === tab.id)}
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

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

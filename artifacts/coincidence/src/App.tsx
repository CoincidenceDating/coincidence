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

function LoggedOutScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background px-6 gap-8">
      <img src="/logo.jpeg" alt="Coincidence" className="w-20 h-20 rounded-2xl object-cover shadow-md" />
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          You're logged out
        </h1>
        <p className="text-sm text-muted-foreground italic">making the invisible string – visible.</p>
      </div>
      <button
        onClick={onLogin}
        className="w-full max-w-xs py-3.5 rounded-2xl bg-foreground text-background font-semibold text-sm hover:bg-foreground/90 active:scale-[0.98] transition-all"
      >
        Log back in
      </button>
    </div>
  );
}

function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 80);
    const t2 = setTimeout(() => setPhase("out"), 3400);
    const t3 = setTimeout(() => onDone(), 4100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  const ready = phase === "hold";
  const gone  = phase === "out";

  return (
    <div
      onClick={() => { setPhase("out"); setTimeout(onDone, 700); }}
      style={{
        position: "fixed", inset: 0,
        background: "#0a0a0a",
        cursor: "pointer",
        zIndex: 9999,
        transition: "opacity 0.8s ease",
        opacity: gone ? 0 : 1,
        overflow: "hidden",
      }}
    >
      {/* Full-bleed logo — fades in as the entire backdrop */}
      <img
        src="/logo.jpeg"
        alt=""
        aria-hidden
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          opacity: ready ? 1 : 0,
          transition: "opacity 1.4s ease",
        }}
      />

      {/* Gradient vignette — keeps edges dark so text pops */}
      <div style={{
        position: "absolute", inset: 0,
        background: [
          "linear-gradient(to bottom,",
          "  rgba(10,10,10,0.55) 0%,",
          "  rgba(10,10,10,0.08) 30%,",
          "  rgba(10,10,10,0.05) 55%,",
          "  rgba(10,10,10,0.60) 82%,",
          "  rgba(10,10,10,0.92) 100%",
          ")",
        ].join(" "),
      }} />

      {/* "oincidence" — flows out of the C in the logo at screen centre */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: `translateY(-50%) translateX(${ready ? "0px" : "22px"})`,
        opacity: ready ? 1 : 0,
        transition: "opacity 1s ease 0.55s, transform 0.9s cubic-bezier(0.16,1,0.3,1) 0.55s",
        pointerEvents: "none",
      }}>
        <span style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "clamp(2.4rem, 9.5vw, 4.2rem)",
          fontWeight: 600,
          color: "#ffffff",
          letterSpacing: "0.06em",
          lineHeight: 1,
          display: "block",
          whiteSpace: "nowrap",
          textShadow: "0 2px 32px rgba(0,0,0,0.7), 0 0 80px rgba(0,0,0,0.4)",
        }}>
          oincidence
        </span>
      </div>

      {/* Slogan — bottom */}
      <div style={{
        position: "absolute",
        bottom: "11vh",
        left: 0, right: 0,
        textAlign: "center",
        opacity: ready ? 1 : 0,
        transform: `translateY(${ready ? "0px" : "10px"})`,
        transition: "opacity 0.9s ease 0.95s, transform 0.8s ease 0.95s",
        pointerEvents: "none",
      }}>
        <p style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "clamp(0.75rem, 3vw, 0.95rem)",
          fontWeight: 400,
          fontStyle: "italic",
          color: "rgba(255,255,255,0.5)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          margin: 0,
        }}>
          Making The Invisible String Visible.
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
  const [isLoggedOut, setIsLoggedOut] = useState(false);
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

  function handleLogout() {
    setMatches([]);
    setUndecided([]);
    setNewMatchCount(0);
    setNewUndecidedCount(0);
    setActiveChat(null);
    setThreads({});
    setCheckIns([]);
    setBoostCredits(3);
    setBoostActiveUntil(null);
    setBoostTimeLeft(0);
    setActiveTab("swipe");
    setIsLoggedOut(true);
  }

  function handleDeleteAccount() {
    try { localStorage.clear(); } catch {}
    setMatches([]);
    setUndecided([]);
    setNewMatchCount(0);
    setNewUndecidedCount(0);
    setThreads({});
    setCheckIns([]);
    setBoostCredits(3);
    setBoostActiveUntil(null);
    setBoostTimeLeft(0);
    setLookingFor("Everyone");
    setShowSplash(true);
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

  if (isLoggedOut) return <LoggedOutScreen onLogin={() => setIsLoggedOut(false)} />;
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
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <main className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === "swipe" && <SwipePage onMatch={handleMatch} onMaybe={handleMaybe} isBoostActive={isBoostActive} boostTimeLeft={boostTimeLeft} boostRadius={boostRadius} boostCredits={boostCredits} onActivateBoost={handleActivateBoost} lookingFor={lookingFor} />}
        {activeTab === "coincidence" && <CoincidencePage onMatch={handleMatch} onMaybe={handleMaybe} onCheckIn={handleCheckIn} onSendMessage={handleOpenChat} checkedInLocations={checkedInLocations} lookingFor={lookingFor} />}
        {activeTab === "matches" && (
          <MatchesPage matches={matches} messageCounts={messageCounts} onOpenChat={handleOpenChat} />
        )}
        {activeTab === "undecided" && (
          <UndecidedPage undecided={undecided} onDecide={handleUndecidedDecision} />
        )}
        {activeTab === "profile" && <ProfilePage matches={matches} checkIns={checkIns} boostCredits={boostCredits} isBoostActive={isBoostActive} boostTimeLeft={boostTimeLeft} boostRadius={boostRadius} onBoostRadiusChange={setBoostRadius} onActivateBoost={handleActivateBoost} onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} />}
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

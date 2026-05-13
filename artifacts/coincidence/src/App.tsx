import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import LandingPage from "@/pages/landing";
import AnimatedSplash from "@/pages/splash-animated";
import SwipePage from "@/pages/swipe";
import CoincidencePage from "@/pages/coincidence";
import MatchesPage from "@/pages/matches";
import UndecidedPage from "@/pages/undecided";
import LikedPage from "@/pages/liked";
import ProfilePage from "@/pages/profile";
import ChatPage, { type Message } from "@/pages/chat";
import SetupPage, { type SetupData } from "@/pages/setup";
import AuthPage, { type AccountData } from "@/pages/auth";
import ReloginPage from "@/pages/relogin";
import { Heart, Sparkles, HelpCircle, User, Loader2, Eye, MessageCircle, Settings } from "lucide-react";
import { StringIcon } from "@/components/StringIcon";
import MatchOverlay from "@/components/MatchOverlay";
import type { Match, CheckIn, Profile } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import * as db from "@/lib/db";

const queryClient = new QueryClient();

function PasswordRecoveryScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setDone(true);
    setTimeout(onDone, 2200);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#E8387D 0%,#9B5DE5 100%)" }}>
            {done
              ? <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              : <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
            }
          </div>
          <h1 className="text-2xl font-bold text-foreground">{done ? "Password updated!" : "Set new password"}</h1>
          <p className="text-sm text-muted-foreground mt-1">{done ? "Taking you back to log in…" : "Choose a strong password for your account"}</p>
        </div>

        {!done && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">New password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="At least 8 characters"
                autoFocus
                className="w-full px-4 py-3 rounded-2xl bg-card border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="Same as above"
                className="w-full px-4 py-3 rounded-2xl bg-card border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="mt-2 w-full py-3.5 rounded-2xl font-semibold text-sm text-white active:scale-[0.98] transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#E8387D 0%,#9B5DE5 100%)" }}
            >
              {loading
                ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving…</span>
                : "Save new password"
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

type Tab = "swipe" | "coincidence" | "matches" | "liked" | "undecided" | "profile";

function getOpeningText(match: Match): string {
  if (match.source === "swipe") return "Hey! We matched 👋 How's your day going?";
  const loc = match.locationName ?? "there";
  if (match.locationIcon === "coffee") return `This place has the best coffee, right? So glad we found each other at ${loc}!`;
  if (match.locationIcon === "wine") return `What a night at ${loc}! Really glad we connected 🍷`;
  if (match.locationIcon === "beer") return `${loc} is my favourite spot. Crazy we hadn't crossed paths before!`;
  return `What are the odds of running into you at ${loc}? Glad we did 😄`;
}

function AppShell() {
  const { toast } = useToast();

  const [sessionChecked, setSessionChecked] = useState(false);
  const [dataLoading, setDataLoading]   = useState(false);
  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false);
  const [showSetup, setShowSetup]       = useState(false);
  const [account, setAccount]           = useState<AccountData | null>(null);
  const [isLoggedOut, setIsLoggedOut]   = useState(false);
  const [activeTab, setActiveTab]       = useState<Tab>("swipe");
  const [settingsPending, setSettingsPending] = useState(false);

  const hasAccount = !!localStorage.getItem("coincidence-has-account");
  const [showLanding, setShowLanding]   = useState(!hasAccount);
  const [showSplash, setShowSplash]     = useState(true);

  const [lookingFor, setLookingFor]     = useState("Everyone");
  const [myProfileSnapshot, setMyProfileSnapshot] = useState<Profile | null>(null);
  const [discoverProfiles, setDiscoverProfiles] = useState<Profile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [profilePrefs, setProfilePrefs] = useState({ ageMin: 18, ageMax: 50 });
  const [matches, setMatches]           = useState<Match[]>([]);
  const [undecided, setUndecided]       = useState<Match[]>([]);
  const [newMatchCount, setNewMatchCount]       = useState(0);
  const [newUndecidedCount, setNewUndecidedCount] = useState(0);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());
  const [pendingMatch, setPendingMatch]               = useState<Match | null>(null);
  const [coincidenceIncomingMatch, setCoincidenceIncomingMatch] = useState<Match | null>(null);
  const [activeChat, setActiveChat]     = useState<Match | null>(null);
  const [threads, setThreads]           = useState<Record<string, Message[]>>({});
  const [checkIns, setCheckIns]         = useState<CheckIn[]>([]);
  const [boostCredits, setBoostCredits]       = useState(3);
  const [boostActiveUntil, setBoostActiveUntil] = useState<number | null>(null);
  const [boostTimeLeft, setBoostTimeLeft]       = useState(0);
  const [boostRadius, setBoostRadius]           = useState(5);
  const [discoverRadius, setDiscoverRadius]     = useState(() => {
    try { const v = localStorage.getItem("coincidence-radius"); if (v) return Number(v); } catch {}
    return 25;
  });
  const [userLat, setUserLat]   = useState<number | null>(null);
  const [userLng, setUserLng]   = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [blockedIds, setBlockedIds]     = useState<string[]>([]);
  const [swipedIds, setSwipedIds]       = useState<string[]>([]);
  const [whoLikedMeCount, setWhoLikedMeCount]         = useState(0);
  const [whoLikedMeProfiles, setWhoLikedMeProfiles]   = useState<Profile[]>([]);
  const [hasWhoLikedMeAccess, setHasWhoLikedMeAccess] = useState(false);
  const [whoLikedMeExpiresAt, setWhoLikedMeExpiresAt] = useState<number | null>(null);
  const [likesPulse, setLikesPulse] = useState(false);

  const matchesSubRef  = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const unmatchSubRef  = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const inboxSubRef    = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const boostSubRef    = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const likesSubRef    = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const inRecoveryRef  = useRef(false);
  // Kept as a ref so refreshDiscoverProfiles always has the latest value
  // without needing to be in the dependency chain.
  const myHobbiesRef   = useRef<string[]>([]);
  const activeTabRef   = useRef<Tab>("swipe");
  const activeChatRef  = useRef<Match | null>(null);
  const matchesRef     = useRef<Match[]>([]);
  // GPS watch
  const gpsWatchRef       = useRef<number | null>(null);
  const lastWrittenLatRef = useRef<number | null>(null);
  const lastWrittenLngRef = useRef<number | null>(null);

  const BOOST_DURATION_MS = 30 * 60 * 1000;
  const MAX_BOOST_CREDITS = 5;
  const isBoostActive = boostActiveUntil !== null && boostTimeLeft > 0;

  const checkedInLocations = new Set(checkIns.map((c) => c.locationId));

  // Keep refs in sync so subscription callbacks always see current values
  useEffect(() => { matchesRef.current = matches; }, [matches]);
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  // ── Session management ──────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        const acct: AccountData = {
          id: u.id,
          email: u.email ?? "",
          phone: (u.user_metadata?.phone as string) ?? "",
        };
        localStorage.setItem("coincidence-has-account", "1");
        setShowLanding(false);
        setAccount(acct);
        setIsLoggedOut(false);
        loadUserData();
      }
      setSessionChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setAccount(null);
        setIsLoggedOut(true);
      } else if (event === "PASSWORD_RECOVERY") {
        inRecoveryRef.current = true;
        setShowPasswordRecovery(true);
        setAccount(null);
      } else if (event === "SIGNED_IN" && session?.user) {
        if (inRecoveryRef.current) return;
        const u = session.user;
        setAccount({
          id: u.id,
          email: u.email ?? "",
          phone: (u.user_metadata?.phone as string) ?? "",
        });
        setIsLoggedOut(false);
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment_success") !== "1") return;
    window.history.replaceState({}, "", "/");
    toast({ title: "Payment successful", description: "Your purchase has been added to your account." });
    // Read immediately, then re-read after 4 s to catch the Stripe webhook update
    const refresh = () => {
      db.getBoost().then((b) => setBoostCredits(b.credits));
      Promise.all([db.hasWhoLikedMeAccess(), db.getWhoLikedMeExpiry()]).then(([access, expiry]) => {
        setHasWhoLikedMeAccess(access);
        setWhoLikedMeExpiresAt(expiry);
        if (access) db.getWhoLikedMe().then(setWhoLikedMeProfiles);
      });
    };
    refresh();
    const t = setTimeout(refresh, 4000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function subscribeToIncomingMatches(userId: string) {
    if (matchesSubRef.current) {
      supabase.removeChannel(matchesSubRef.current);
    }
    matchesSubRef.current = db.subscribeToNewMatches(userId, (row) => {
      const profile = row.profileData as Match["profile"];
      const match: Match = {
        profile,
        source: row.source,
        locationName: row.locationName ?? undefined,
        locationIcon: row.locationIcon ?? undefined,
        matchedAt: row.matchedAt,
      };
      setMatches((prev) => {
        const exists = prev.some((m) => m.profile.id === row.profileId);
        if (exists) return prev;
        return [...prev, match];
      });
      setNewMatchCount((c) => c + 1);
      // If the match came from a venue (coincidence) and the user is currently
      // on the Places tab, show the coincidence overlay instead of the generic one.
      if (row.source !== "swipe" && activeTabRef.current === "coincidence") {
        setCoincidenceIncomingMatch(match);
      } else {
        setPendingMatch(match);
      }
    });

    // Subscribe to Supabase Broadcast on channel "unmatch-notify:{myId}".
    // Broadcast bypasses RLS entirely — no SQL migrations needed.
    // unmatch() sends to this channel BEFORE touching the DB, so the
    // other device's UI updates the moment the unmatch button is tapped.
    if (unmatchSubRef.current) {
      supabase.removeChannel(unmatchSubRef.current);
    }
    unmatchSubRef.current = db.subscribeToUnmatches(userId, (profileId) => {
      // Close chat if open with this person
      setActiveChat((prev) => {
        if (prev?.profile.id === profileId) {
          activeChatRef.current = null;
          return null;
        }
        return prev;
      });
      // Remove from matches and undecided
      setMatches((prev) => prev.filter((m) => m.profile.id !== profileId));
      setUndecided((prev) => prev.filter((m) => m.profile.id !== profileId));
      // Remove from who-liked-me (in case they were visible there)
      setWhoLikedMeProfiles((prev) => prev.filter((p) => p.id !== profileId));
      // Add to local blocked so Discover/Coincidence filter them out immediately
      setBlockedIds((prev) => prev.includes(profileId) ? prev : [...prev, profileId]);
    });

    if (inboxSubRef.current) {
      supabase.removeChannel(inboxSubRef.current);
    }
    inboxSubRef.current = db.subscribeToAllIncomingMessages(userId, async (senderId, msg) => {
      setThreads((prev) => ({
        ...prev,
        [senderId]: [...(prev[senderId] ?? []), msg],
      }));

      // If sender is a real user not yet in our matches list, the match row was
      // likely inserted by create_mutual_match but the INSERT event was missed.
      // Refresh matches from DB so the user can navigate to the conversation.
      const inCurrentMatches = matchesRef.current.some((m) => m.profile.id === senderId);
      if (!inCurrentMatches && db.isRealUserId(senderId)) {
        const freshMatches = await db.getMatches(false);
        setMatches((prev) => {
          // Merge: add any matches from DB that aren't already in state
          const existingIds = new Set(prev.map((m) => m.profile.id));
          const toAdd = freshMatches.filter((m) => !existingIds.has(m.profile.id));
          return toAdd.length ? [...prev, ...toAdd] : prev;
        });
      }

      // Mark conversation as unread when not currently viewing that chat
      const chatIsOpen = activeChatRef.current?.profile.id === senderId;
      if (!chatIsOpen) {
        setUnreadIds((prev) => {
          if (prev.has(senderId)) return prev;
          const next = new Set(prev);
          next.add(senderId);
          return next;
        });
      }
      if (!chatIsOpen) {
        const senderName = matchesRef.current.find((m) => m.profile.id === senderId)?.profile.name ?? "Someone";
        toast({
          title: senderName,
          description: msg.text,
          duration: 4000,
        });
      }
    });
  }

  async function loadUserData() {
    setDataLoading(true);
    // Fire-and-forget: remove matches pointing to deleted accounts before loading
    db.cleanStaleMatches().catch(() => {});
    try {
      const [m, u, t, c, boost, blocked, swiped, profile, likedMeCount, access, expiry] = await Promise.all([
        db.getMatches(false),
        db.getMatches(true),
        db.getThreads(),
        db.getCheckins(),
        db.getBoost(),
        db.getBlocked(),
        db.getSwiped(),
        db.getProfile(),
        db.getWhoLikedMeCount(),
        db.hasWhoLikedMeAccess(),
        db.getWhoLikedMeExpiry(),
      ]);
      setWhoLikedMeCount(likedMeCount);
      setHasWhoLikedMeAccess(access);
      setWhoLikedMeExpiresAt(expiry);
      if (access) {
        db.getWhoLikedMe().then(setWhoLikedMeProfiles);
      }
      setMatches(m);
      setUndecided(u);

      // Merge last real-user message into threads so the Matches preview is
      // populated on first load (real messages live in `messages`, not user_threads).
      const realPartnerIds = m
        .map((match) => match.profile.id)
        .filter((id) => db.isRealUserId(id));
      const lastReal = realPartnerIds.length > 0
        ? await db.getLastRealMessagePerPartner(realPartnerIds)
        : {};
      const mergedThreads = { ...t };
      for (const [pid, msg] of Object.entries(lastReal)) {
        // Only seed threads if there's no existing entry for this partner
        if (!mergedThreads[pid] || mergedThreads[pid].length === 0) {
          mergedThreads[pid] = [msg];
        }
      }
      setThreads(mergedThreads);

      setCheckIns(c);
      setBoostCredits(boost.credits);
      setBoostActiveUntil(boost.until && boost.until > Date.now() ? boost.until : null);
      setBoostRadius(boost.radius);
      setBlockedIds(blocked);
      setSwipedIds(swiped);
      if (profile) {
        const lf   = profile.looking_for ?? "Everyone";
        const amin = profile.age_min ?? 18;
        const amax = profile.age_max ?? 50;
        setLookingFor(lf);
        setProfilePrefs({ ageMin: amin, ageMax: amax });
        setShowSetup(!profile.setup_complete);
        if (profile.setup_complete) {
          myHobbiesRef.current = profile.hobbies ?? [];
          setMyProfileSnapshot(db.buildProfileSnapshot(profile));
          // Persist current radius to DB on every load so mutual-radius SQL
          // always reflects the user's real preference (not the column default).
          db.updateDiscoverRadius(discoverRadius * 1.60934).catch(() => {});
          // Never fetch profiles before GPS — pass preferences through so the
          // first GPS-gated fetch uses them even before React state settles.
          requestGpsLocation(lf, amin, amax);
        } else {
          // Setup not yet complete — start the GPS watch immediately so the
          // first fix is written to the DB during the wizard, not after.
          requestGpsLocation();
        }
      } else {
        // No profile row at all (brand new account) — start GPS straight away
        setShowSetup(true);
        requestGpsLocation();
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        subscribeToIncomingMatches(user.id);
        if (boostSubRef.current) supabase.removeChannel(boostSubRef.current);
        boostSubRef.current = db.subscribeToBoostCredits(user.id, (credits) => {
          setBoostCredits(credits);
        });
        if (likesSubRef.current) supabase.removeChannel(likesSubRef.current);
        likesSubRef.current = db.subscribeToIncomingLikes(user.id, () => {
          setWhoLikedMeCount((c) => c + 1);
          setLikesPulse(true);
        });
      }
    } finally {
      setDataLoading(false);
    }
  }

  function spreadBoostedProfiles(profiles: Profile[], boostedIds: string[]): Profile[] {
    if (!boostedIds.length) return profiles;
    const boosted = profiles.filter((p) => boostedIds.includes(p.id));
    const rest    = profiles.filter((p) => !boostedIds.includes(p.id));
    return [...boosted, ...rest];
  }

  async function refreshDiscoverProfiles(lf?: string, amin?: number, amax?: number, lat?: number | null, lng?: number | null, radiusMi?: number) {
    setIsLoadingProfiles(true);
    try {
      const [profiles, boostedIds] = await Promise.all([
        db.getDiscoverProfiles(
          lf  ?? lookingFor,
          amin ?? profilePrefs.ageMin,
          amax ?? profilePrefs.ageMax,
          lat  !== undefined ? lat  : userLat,
          lng  !== undefined ? lng  : userLng,
          radiusMi !== undefined ? radiusMi : discoverRadius,
          myHobbiesRef.current,
        ),
        db.getBoostedProfileIds(),
      ]);
      setDiscoverProfiles(spreadBoostedProfiles(profiles, boostedIds));
    } finally {
      setIsLoadingProfiles(false);
    }
  }

  const GPS_CACHE_KEY = "coincidence-gps";
  const GPS_CACHE_TTL = 3 * 60 * 1000; // 3 minutes — short so stale coords expire quickly

  // How far the device must move before we bother writing to DB again (~100 m)
  const GPS_WRITE_THRESHOLD_KM = 0.1;

  function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function stopGpsWatch() {
    if (gpsWatchRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
    }
  }

  function startGpsWatch(overrideLf?: string, overrideAmin?: number, overrideAmax?: number) {
    if (!navigator.geolocation) {
      setGpsStatus("denied");
      // Last known fix stays in DB — user remains visible at their last location
      return;
    }
    // Clear any existing watch before starting a new one
    stopGpsWatch();

    let firstFix = true;

    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;

        // Always update React state so UI coords stay current
        setUserLat(lat);
        setUserLng(lng);
        setGpsStatus("granted");

        // Cache the latest fix
        try {
          localStorage.setItem(GPS_CACHE_KEY, JSON.stringify({ lat, lng, ts: Date.now() }));
        } catch {}

        // Throttle DB writes — only push when we've moved meaningfully or it's the first fix
        const movedEnough = lastWrittenLatRef.current === null ||
          haversineKm(lastWrittenLatRef.current, lastWrittenLngRef.current!, lat, lng) >= GPS_WRITE_THRESHOLD_KM;

        if (firstFix || movedEnough) {
          lastWrittenLatRef.current = lat;
          lastWrittenLngRef.current = lng;
          db.updateUserLocation(lat, lng, discoverRadius * 1.60934);
          // On the very first fix, also refresh the discover list
          if (firstFix) {
            refreshDiscoverProfiles(overrideLf, overrideAmin, overrideAmax, lat, lng, discoverRadius);
          } else {
            // Subsequent fixes: refresh discover silently so stale profiles drop off
            refreshDiscoverProfiles(undefined, undefined, undefined, lat, lng, discoverRadius);
          }
          firstFix = false;
        }
      },
      () => {
        // GPS denied/unavailable — mark denied but keep last known fix in DB
        // so the user remains visible at their last stored location.
        setGpsStatus("denied");
        stopGpsWatch();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  function requestGpsLocation(overrideLf?: string, overrideAmin?: number, overrideAmax?: number) {
    if (!navigator.geolocation) {
      setGpsStatus("denied");
      // Last known fix stays in DB — user remains visible at their last location
      return;
    }

    // Seed UI with a recent cached fix instantly (avoids blank state while watch fires first fix)
    try {
      const raw = localStorage.getItem(GPS_CACHE_KEY);
      if (raw) {
        const { lat, lng, ts } = JSON.parse(raw) as { lat: number; lng: number; ts: number };
        if (Date.now() - ts < GPS_CACHE_TTL) {
          setUserLat(lat);
          setUserLng(lng);
          setGpsStatus("granted");
          // Don't return — still start the watch so live updates flow in
        }
      }
    } catch {}

    setGpsStatus((s) => s === "idle" ? "requesting" : s);
    startGpsWatch(overrideLf, overrideAmin, overrideAmax);
  }

  // Pause the GPS watch when the tab is hidden, resume when visible again
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        stopGpsWatch();
      } else if (document.visibilityState === "visible" && gpsStatus === "granted") {
        startGpsWatch();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsStatus]);

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
    const newCredits = boostCredits - 1;
    const until = Date.now() + BOOST_DURATION_MS;
    setBoostCredits(newCredits);
    setBoostActiveUntil(until);
    setBoostTimeLeft(BOOST_DURATION_MS);
    db.upsertBoost(newCredits, until, boostRadius);
  }

  async function handleReport(profile: import("./lib/data").Profile, reason: string) {
    await db.reportUser(profile.id, reason);
    setBlockedIds((prev) => prev.includes(profile.id) ? prev : [...prev, profile.id]);
    setDiscoverProfiles((prev) => prev.filter(p => db.baseProfileId(p.id) !== db.baseProfileId(profile.id)));
  }

  function handleCreateAccount(data: AccountData) {
    localStorage.setItem("coincidence-has-account", "1");
    setAccount(data);
    setIsLoggedOut(false);
    loadUserData();
  }

  function handleLogin() {
    setIsLoggedOut(false);
    loadUserData();
  }

  function handleSetupComplete(data: SetupData) {
    const lf   = data.lookingFor ?? "Everyone";
    const amin = data.ageMin ?? 18;
    const amax = data.ageMax ?? 50;
    const profileFields = {
      name: data.name, age: data.age, bio: data.bio,
      hometown: data.hometown, height: data.height,
      hobbies: data.hobbies,
      gender: data.gender ?? "prefer-not-to-say",
      looking_for: lf,
      age_min: amin, age_max: amax,
      setup_complete: true,
      photos: data.photos ?? [],
    };
    db.upsertProfile(profileFields);
    setLookingFor(lf);
    setProfilePrefs({ ageMin: amin, ageMax: amax });
    myHobbiesRef.current = data.hobbies ?? [];
    setMyProfileSnapshot(db.buildProfileSnapshot({
      user_id: account?.id ?? "",
      name: data.name,
      age: data.age,
      bio: data.bio,
      photos: data.photos ?? [],
      gender: data.gender ?? "prefer-not-to-say",
      hobbies: data.hobbies ?? [],
    }));
    setShowSetup(false);
    // (Re-)start the GPS watch with final prefs so the discover feed loads
    // correctly. If GPS was already granted during the wizard this is instant;
    // if not, it prompts the user now.
    requestGpsLocation(lf, amin, amax);
  }

  function handleProfileUpdate(updated: { name: string; age: number; bio: string; hometown: string; height: string; hobbies: string[]; lookingFor?: string }) {
    const lf = updated.lookingFor ?? "Everyone";
    setLookingFor(lf);
    myHobbiesRef.current = updated.hobbies ?? [];
    setMyProfileSnapshot(db.buildProfileSnapshot({
      user_id: account?.id ?? "",
      name: updated.name,
      age: updated.age,
      bio: updated.bio,
      photos: myProfileSnapshot?.photos ?? [],
      gender: myProfileSnapshot?.gender ?? "",
      hobbies: updated.hobbies ?? [],
    }));
    refreshDiscoverProfiles(lf, profilePrefs.ageMin, profilePrefs.ageMax);
  }

  function handleResetSetup() {
    db.upsertProfile({ setup_complete: false });
    setShowSetup(true);
  }

  async function handleLogout() {
    try { localStorage.removeItem(GPS_CACHE_KEY); } catch {}
    stopGpsWatch();
    lastWrittenLatRef.current = null;
    lastWrittenLngRef.current = null;
    if (matchesSubRef.current) {
      supabase.removeChannel(matchesSubRef.current);
      matchesSubRef.current = null;
    }
    if (unmatchSubRef.current) {
      supabase.removeChannel(unmatchSubRef.current);
      unmatchSubRef.current = null;
    }
    if (boostSubRef.current) {
      supabase.removeChannel(boostSubRef.current);
      boostSubRef.current = null;
    }
    if (likesSubRef.current) {
      supabase.removeChannel(likesSubRef.current);
      likesSubRef.current = null;
    }
    await supabase.auth.signOut();
    setUndecided([]);
    setMatches([]);
    setNewMatchCount(0);
    setNewUndecidedCount(0);
    setUnreadIds(new Set());
    setActiveChat(null);
    activeChatRef.current = null;
    setThreads({});
    setCheckIns([]);
    setBoostCredits(3);
    setBoostActiveUntil(null);
    setBoostTimeLeft(0);
    setBlockedIds([]);
    setSwipedIds([]);
    setDiscoverProfiles([]);
    setMyProfileSnapshot(null);
    setActiveTab("swipe");
    setIsLoggedOut(true);
  }

  async function handleDeleteAccount() {
    stopGpsWatch();
    lastWrittenLatRef.current = null;
    lastWrittenLngRef.current = null;
    if (matchesSubRef.current) {
      supabase.removeChannel(matchesSubRef.current);
      matchesSubRef.current = null;
    }
    if (unmatchSubRef.current) {
      supabase.removeChannel(unmatchSubRef.current);
      unmatchSubRef.current = null;
    }
    if (boostSubRef.current) {
      supabase.removeChannel(boostSubRef.current);
      boostSubRef.current = null;
    }
    if (likesSubRef.current) {
      supabase.removeChannel(likesSubRef.current);
      likesSubRef.current = null;
    }
    await db.deleteAllUserData();
    await supabase.auth.signOut();
    setAccount(null);
    setMatches([]);
    setUndecided([]);
    setNewMatchCount(0);
    setNewUndecidedCount(0);
    setUnreadIds(new Set());
    setThreads({});
    setCheckIns([]);
    setBoostCredits(3);
    setBoostActiveUntil(null);
    setBoostTimeLeft(0);
    setBlockedIds([]);
    setSwipedIds([]);
    setDiscoverProfiles([]);
    setMyProfileSnapshot(null);
    setLookingFor("Everyone");
    setShowSetup(true);
    setIsLoggedOut(false);
  }

  async function handleUnlockWhoLikedMe() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const resp = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, type: "who_liked_me" }),
      });
      const data = await resp.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Checkout unavailable", description: data.error ?? "Please try again later.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Something went wrong", description: "Could not start checkout. Please try again.", variant: "destructive" });
    }
  }

  async function handlePurchaseStrings(packId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const quantityMap: Record<string, number> = { s1: 1, s5: 5, s10: 10 };
    const quantity = quantityMap[packId] ?? 1;
    try {
      const resp = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, type: "strings", quantity }),
      });
      const data = await resp.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Checkout unavailable", description: data.error ?? "Please try again later.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Something went wrong", description: "Could not start checkout. Please try again.", variant: "destructive" });
    }
  }

  async function handleLikeBack(profile: Profile) {
    setWhoLikedMeProfiles((prev) => prev.filter((p) => p.id !== profile.id));
    setWhoLikedMeCount((c) => Math.max(0, c - 1));
    await handleRealRightSwipe(profile);
  }

  async function handlePassLiker(profile: Profile) {
    setWhoLikedMeProfiles((prev) => prev.filter((p) => p.id !== profile.id));
    setWhoLikedMeCount((c) => Math.max(0, c - 1));
    await db.addSwiped(profile.id, false);
  }

  function handleCheckIn(checkIn: CheckIn) {
    setCheckIns((prev) => {
      if (prev.some((c) => c.locationId === checkIn.locationId)) return prev;
      db.addCheckin(checkIn);
      const next = [...prev, checkIn];
      const newCount = next.length;
      if (newCount % 3 === 0) {
        setBoostCredits((c) => {
          const updated = Math.min(c + 1, MAX_BOOST_CREDITS);
          db.upsertBoost(updated, boostActiveUntil, boostRadius);
          return updated;
        });
        toast({
          title: "You earned a string! 🎉",
          description: `${newCount} check-ins and counting — a string has been added to your stash.`,
        });
      }
      return next;
    });
  }

  function handleDoubleStringCredit() {
    setBoostCredits((c) => {
      const next = Math.max(0, c - 2);
      db.upsertBoost(next, boostActiveUntil, boostRadius);
      return next;
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
      if (exists) return prev;
      db.addMatch(match, false);
      return [...prev, match];
    });
    if (activeTab !== "matches") setNewMatchCount((c) => c + 1);
    // Show the rich match overlay
    setPendingMatch(match);
  }

  function handleMaybe(match: Match) {
    setUndecided((prev) => {
      const exists = prev.some((m) => m.profile.id === match.profile.id);
      if (exists) return prev;
      db.addMatch(match, true);
      return [...prev, match];
    });
    if (activeTab !== "undecided") setNewUndecidedCount((c) => c + 1);
  }

  async function handleRealRightSwipe(profile: Profile) {
    const baseId = db.baseProfileId(profile.id);
    setSwipedIds((prev) => prev.includes(baseId) ? prev : [...prev, baseId]);
    setDiscoverProfiles((prev) => prev.filter((p) => db.baseProfileId(p.id) !== baseId));
    await db.addSwiped(baseId, true);
    if (!myProfileSnapshot) return;
    const mutual = await db.createMutualMatch(profile.id, profile, myProfileSnapshot);
    if (mutual) {
      handleMatch({ profile, source: "swipe", matchedAt: Date.now() });
    }
  }

  // Used by CoincidencePage for real-user right-swipes: checks mutuality before
  // creating a match. Returns the Match object if mutual, null if pending.
  // Does NOT call setPendingMatch — CoincidencePage shows its own overlay.
  async function handleCoincidenceRealLike(
    profile: Profile,
    locationId: string,
    locationName: string,
    locationIcon: string,
  ): Promise<Match | null> {
    if (!myProfileSnapshot) return null;
    await db.addSwiped(profile.id, true);
    const mutual = await db.createMutualMatch(
      profile.id, profile, myProfileSnapshot,
      locationId, locationName, locationIcon,
    );
    if (!mutual) return null;
    const match: Match = { profile, source: locationId, locationName, locationIcon, matchedAt: Date.now() };
    // Record in state + DB without triggering the App-level overlay
    setMatches((prev) => {
      const exists = prev.some((m) => m.profile.id === match.profile.id && m.source === match.source);
      if (exists) return prev;
      db.addMatch(match, false);
      return [...prev, match];
    });
    if (activeTab !== "matches") setNewMatchCount((c) => c + 1);
    return match;
  }

  function handleUndecidedDecision(match: Match, decision: "yes" | "no") {
    setUndecided((prev) => prev.filter((m) => m.profile.id !== match.profile.id));
    if (decision === "yes") {
      // promote_and_notify: promotes User B's row AND writes the reciprocal
      // match row for User A so they see it in their matches tab immediately.
      db.promoteUndecided(match.profile.id, myProfileSnapshot ?? {});
      handleMatch(match);
    } else {
      db.removeMatch(match.profile.id);
    }
  }

  function handleTabChange(tab: Tab) {
    if (tab === "matches") { setNewMatchCount(0); }
    if (tab === "undecided") setNewUndecidedCount(0);
    if (tab === "liked") setLikesPulse(false);
    activeTabRef.current = tab;
    if (tab === "swipe") {
      db.getProfile().then((p) => {
        if (p?.looking_for) {
          const lf   = p.looking_for;
          const amin = p.age_min ?? 18;
          const amax = p.age_max ?? 50;
          setLookingFor(lf);
          setProfilePrefs({ ageMin: amin, ageMax: amax });
          refreshDiscoverProfiles(lf, amin, amax);
        }
      });
    } else if (tab === "coincidence") {
      db.getProfile().then((p) => { if (p?.looking_for) setLookingFor(p.looking_for); });
    }
    setActiveTab(tab);
  }

  function handleOpenChat(match: Match) {
    if (!db.isRealUserId(match.profile.id)) {
      setThreads((prev) => {
        if (prev[match.profile.id]) { return prev; }
        const opening: Message = {
          id: `open-${match.profile.id}`,
          text: getOpeningText(match),
          from: "them",
          timestamp: Date.now(),
        };
        const updated = { ...prev, [match.profile.id]: [opening] };
        db.upsertThread(match.profile.id, updated[match.profile.id]);
        return updated;
      });
    }
    setActiveChat(match);
    activeChatRef.current = match;
    // Mark this conversation as read
    setUnreadIds((prev) => {
      if (!prev.has(match.profile.id)) return prev;
      const next = new Set(prev);
      next.delete(match.profile.id);
      return next;
    });
  }

  function handleSend(profileId: string, text: string) {
    const isTheirReply = profileId.startsWith("__them__");
    const realId = isTheirReply ? profileId.replace("__them__", "") : profileId;
    const isReal = db.isRealUserId(realId);
    const msg: Message = {
      id: `${realId}-${Date.now()}-${Math.random()}`,
      text, from: isTheirReply ? "them" : "me", timestamp: Date.now(),
    };
    setThreads((prev) => {
      const updated = { ...prev, [realId]: [...(prev[realId] ?? []), msg] };
      // Real-user messages are stored in the `messages` table by sendRealMessage;
      // only persist mock-user threads to user_threads.
      if (!isReal) db.upsertThread(realId, updated[realId]);
      return updated;
    });
  }

  if (!sessionChecked) return (
    <div className="h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
  if (showLanding && !account) return (
    <AnimatePresence>
      <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
        <LandingPage onGetStarted={() => setShowLanding(false)} />
      </motion.div>
    </AnimatePresence>
  );
  if (showSplash && (!!account || hasAccount)) return (
    <AnimatePresence>
      <motion.div key="splash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
        <AnimatedSplash onDone={() => setShowSplash(false)} />
      </motion.div>
    </AnimatePresence>
  );
  if (showPasswordRecovery) return <PasswordRecoveryScreen onDone={async () => {
    inRecoveryRef.current = false;
    setShowPasswordRecovery(false);
    await supabase.auth.signOut();
    setAccount(null);
    setIsLoggedOut(true);
  }} />;

  if (isLoggedOut) return (
    <AnimatePresence>
      <motion.div key="relogin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
        <ReloginPage onLogin={handleLogin} />
      </motion.div>
    </AnimatePresence>
  );
  if (!account) return (
    <AnimatePresence>
      <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
        <AuthPage
          defaultMode="create"
          existingAccount={null}
          onCreateAccount={handleCreateAccount}
          onLogin={handleLogin}
        />
      </motion.div>
    </AnimatePresence>
  );
  if (showSetup) return (
    <AnimatePresence>
      <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
        <SetupPage onComplete={handleSetupComplete} onRequestGps={() => requestGpsLocation()} />
      </motion.div>
    </AnimatePresence>
  );

  const tabs: { id: Tab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
    {
      id: "swipe",
      label: "Discover",
      icon: (a) => (
        <div className="relative">
          <Sparkles className={`w-5 h-5 ${a ? "fill-primary text-primary" : ""}`} />
          {isBoostActive && (
            <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full gradient-btn border-2 border-background" />
          )}
        </div>
      ),
    },
    {
      id: "coincidence",
      label: "Coincidence",
      icon: (a) => <StringIcon className={`w-5 h-5 ${a ? "text-primary" : ""}`} />,
    },
    {
      id: "matches",
      label: "Matches",
      icon: (a) => (
        <div className="relative">
          <Heart className={`w-5 h-5 ${a ? "fill-primary text-primary" : ""}`} />
          {(newMatchCount > 0 || unreadIds.size > 0) && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full gradient-btn text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {(newMatchCount + unreadIds.size) > 9 ? "9+" : newMatchCount + unreadIds.size}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "liked",
      label: "Liked",
      icon: (a) => (
        <div className="relative">
          <Eye className={`w-5 h-5 ${a ? "text-primary" : ""}`} />
          {whoLikedMeCount > 0 && !hasWhoLikedMeAccess && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full gradient-btn text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {likesPulse && (
                <span className="absolute inset-0 rounded-full bg-pink-500 opacity-75 animate-ping" />
              )}
              <span className="relative">{whoLikedMeCount > 9 ? "9+" : whoLikedMeCount}</span>
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
          <HelpCircle className={`w-5 h-5 ${a ? "fill-primary text-primary" : ""}`} />
          {newUndecidedCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full gradient-btn text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {newUndecidedCount > 9 ? "9+" : newUndecidedCount}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden relative bg-background">

      {/* ── Ambient glow orbs — faint radial blobs behind all content ── */}
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-25%", left: "-15%", width: "75%", height: "75%", borderRadius: "50%", background: "radial-gradient(circle, rgba(232,56,125,0.09) 0%, transparent 68%)", filter: "blur(50px)" }} />
        <div style={{ position: "absolute", bottom: "-15%", right: "-20%", width: "70%", height: "70%", borderRadius: "50%", background: "radial-gradient(circle, rgba(155,93,229,0.11) 0%, transparent 68%)", filter: "blur(50px)" }} />
        <div style={{ position: "absolute", top: "38%", right: "0%", width: "45%", height: "45%", borderRadius: "50%", background: "radial-gradient(circle, rgba(232,56,125,0.07) 0%, transparent 68%)", filter: "blur(35px)" }} />
      </div>

      {/* ── Global settings icon — top-right on every tab except Discover ── */}
      {activeTab !== "swipe" && (
        <button
          onClick={() => {
            setSettingsPending(true);
            if (activeTab !== "profile") handleTabChange("profile");
          }}
          style={{
            position: "fixed",
            top: "max(env(safe-area-inset-top, 0px) + 12px, 14px)",
            right: "max(env(safe-area-inset-right, 0px) + 16px, 16px)",
            zIndex: 50,
            width: "clamp(2rem, 9vw, 2.75rem)",
            height: "clamp(2rem, 9vw, 2.75rem)",
            background: "rgba(13,14,26,0.55)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
          className="rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Open settings"
        >
          <Settings style={{ width: "clamp(0.9rem, 4vw, 1.15rem)", height: "clamp(0.9rem, 4vw, 1.15rem)" }} />
        </button>
      )}

      {/* ── "Profile" label — top-left on the profile tab ── */}
      {activeTab === "profile" && (
        <span
          style={{
            position: "fixed",
            top: "max(env(safe-area-inset-top, 0px) + 12px, 14px)",
            left: "max(env(safe-area-inset-left, 0px) + 16px, 16px)",
            zIndex: 50,
            lineHeight: "clamp(2rem, 9vw, 2.75rem)",
          }}
          className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        >
          Profile
        </span>
      )}

      {/* ── Global profile icon — top-left on every tab except profile ── */}
      {activeTab !== "profile" && (
        <button
          onClick={() => handleTabChange("profile")}
          style={{
            position: "fixed",
            top: "max(env(safe-area-inset-top, 0px) + 12px, 14px)",
            left: "max(env(safe-area-inset-left, 0px) + 16px, 16px)",
            zIndex: 50,
            width: "clamp(2rem, 9vw, 2.75rem)",
            height: "clamp(2rem, 9vw, 2.75rem)",
            background: "rgba(13,14,26,0.55)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
          className="rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Open profile"
        >
          <User style={{ width: "clamp(0.9rem, 4vw, 1.15rem)", height: "clamp(0.9rem, 4vw, 1.15rem)" }} />
        </button>
      )}

      <main className="flex-1 min-h-0 overflow-y-auto relative" style={{ zIndex: 1 }}>
        {activeTab === "swipe" && (
          <SwipePage
            onMatch={handleMatch}
            onMaybe={handleMaybe}
            isBoostActive={isBoostActive}
            boostTimeLeft={boostTimeLeft}
            boostRadius={boostRadius}
            boostCredits={boostCredits}
            onActivateBoost={handleActivateBoost}
            onDoubleStringCredit={handleDoubleStringCredit}
            blockedIds={blockedIds}
            onSwiped={(id, liked) => {
              const baseId = db.baseProfileId(id);
              setSwipedIds((prev) => prev.includes(baseId) ? prev : [...prev, baseId]);
              setDiscoverProfiles((prev) => prev.filter(p => db.baseProfileId(p.id) !== baseId));
              db.addSwiped(baseId, liked);
            }}
            onRealRightSwipe={handleRealRightSwipe}
            discoverProfiles={discoverProfiles}
            isLoadingProfiles={isLoadingProfiles}
            discoverRadius={discoverRadius}
            gpsStatus={gpsStatus}
            onRequestGps={requestGpsLocation}
            onRadiusChange={(r) => {
              setDiscoverRadius(r);
              try { localStorage.setItem("coincidence-radius", String(r)); } catch {}
              db.updateDiscoverRadius(r * 1.60934);
              refreshDiscoverProfiles(undefined, undefined, undefined, userLat, userLng, r);
            }}
            onReport={handleReport}
          />
        )}
        {activeTab === "coincidence" && (
          <CoincidencePage
            onMatch={handleMatch}
            onMaybe={handleMaybe}
            onRealLike={handleCoincidenceRealLike}
            onCheckIn={handleCheckIn}
            onSendMessage={handleOpenChat}
            checkedInLocations={checkedInLocations}
            lookingFor={lookingFor}
            boostCredits={boostCredits}
            onDoubleStringCredit={handleDoubleStringCredit}
            blockedIds={blockedIds}
            incomingCoincidenceMatch={coincidenceIncomingMatch}
            onClearIncomingCoincidenceMatch={() => setCoincidenceIncomingMatch(null)}
            onReport={handleReport}
            gpsStatus={gpsStatus}
            userLat={userLat}
            userLng={userLng}
            onRequestGps={() => requestGpsLocation()}
          />
        )}
        {activeTab === "matches" && (
          <MatchesPage
            matches={matches}
            threads={threads}
            checkIns={checkIns}
            unreadIds={unreadIds}
            onOpenChat={handleOpenChat}
            onUnmatch={(id) => {
              setMatches((prev) => prev.filter((m) => m.profile.id !== id));
              setUndecided((prev) => prev.filter((m) => m.profile.id !== id));
              setWhoLikedMeProfiles((prev) => prev.filter((p) => p.id !== id));
              setWhoLikedMeCount((c) => Math.max(0, c - 1));
              setBlockedIds((prev) => prev.includes(id) ? prev : [...prev, id]);
              db.unmatch(id);
            }}
          />
        )}
        {activeTab === "liked" && (
          <LikedPage
            whoLikedMeCount={whoLikedMeCount}
            whoLikedMeProfiles={whoLikedMeProfiles}
            hasWhoLikedMeAccess={hasWhoLikedMeAccess}
            whoLikedMeExpiresAt={whoLikedMeExpiresAt}
            onUnlockWhoLikedMe={handleUnlockWhoLikedMe}
            onLikeBack={handleLikeBack}
            onPassLiker={handlePassLiker}
          />
        )}
        {activeTab === "undecided" && (
          <UndecidedPage undecided={undecided} onDecide={handleUndecidedDecision} />
        )}
        {activeTab === "profile" && (
          <ProfilePage
            matches={matches}
            checkIns={checkIns}
            boostCredits={boostCredits}
            isBoostActive={isBoostActive}
            boostTimeLeft={boostTimeLeft}
            boostRadius={boostRadius}
            onBoostRadiusChange={(r) => { setBoostRadius(r); db.upsertBoost(boostCredits, boostActiveUntil, r); }}
            onActivateBoost={handleActivateBoost}
            onAddCredits={(n) => {
              setBoostCredits((c) => {
                const next = c + n;
                db.upsertBoost(next, boostActiveUntil, boostRadius);
                return next;
              });
            }}
            onPurchaseStrings={handlePurchaseStrings}
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
            onProfileUpdate={handleProfileUpdate}
            account={account}
            autoOpenSettings={settingsPending}
            onSettingsAutoOpened={() => setSettingsPending(false)}
          />
        )}
      </main>

      {/* Nav bar */}
      <div className="sticky bottom-0" style={{ zIndex: 1 }}>
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent 0%, #E8387D 35%, #9B5DE5 65%, transparent 100%)", opacity: 0.7 }} />
        <nav className="bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 pb-safe">
          <div className="flex max-w-lg mx-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold transition-colors ${
                  activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground/70"
                }`}
              >
                {tab.icon(activeTab === tab.id)}
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* ── Match overlay ── */}
      <AnimatePresence>
        {pendingMatch && myProfileSnapshot && (
          <MatchOverlay
            key={pendingMatch.profile.id + pendingMatch.matchedAt}
            match={pendingMatch}
            myProfile={myProfileSnapshot}
            onMessage={(m) => {
              setPendingMatch(null);
              handleOpenChat(m);
            }}
            onDismiss={() => setPendingMatch(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeChat && (
          <ChatPage
            key={activeChat.profile.id}
            match={activeChat}
            messages={threads[activeChat.profile.id] ?? []}
            onSend={handleSend}
            onBack={() => { setActiveChat(null); activeChatRef.current = null; }}
            onUnmatch={() => {
              const id = activeChat.profile.id;
              setActiveChat(null); activeChatRef.current = null;
              // Remove from all local lists immediately
              setMatches((prev) => prev.filter((m) => m.profile.id !== id));
              setUndecided((prev) => prev.filter((m) => m.profile.id !== id));
              setWhoLikedMeProfiles((prev) => prev.filter((p) => p.id !== id));
              setWhoLikedMeCount((c) => Math.max(0, c - 1));
              // Add to local blocked state so Discover/Coincidence filter them out
              setBlockedIds((prev) => prev.includes(id) ? prev : [...prev, id]);
              // Single RPC: deletes both match rows, mutual block, cleans swiped rows
              db.unmatch(id);
            }}
            onReport={() => {
              const id = activeChat.profile.id;
              setActiveChat(null); activeChatRef.current = null;
              setMatches((prev) => prev.filter((m) => m.profile.id !== id));
              setUndecided((prev) => prev.filter((m) => m.profile.id !== id));
              setWhoLikedMeProfiles((prev) => prev.filter((p) => p.id !== id));
              setWhoLikedMeCount((c) => Math.max(0, c - 1));
              setBlockedIds((prev) => prev.includes(id) ? prev : [...prev, id]);
              // Report still uses the separate report + block path (no mutual block needed)
              db.reportUser(id, "reported");
              db.removeMatch(id);
            }}
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

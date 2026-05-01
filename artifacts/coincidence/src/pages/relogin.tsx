import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Loader2, Lock, AtSign } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ReloginPageProps {
  onLogin: () => void;
}

export default function ReloginPage({ onLogin }: ReloginPageProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword]     = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);

  async function handleSignIn() {
    if (!identifier.trim() || !password) { setError("Please fill in all fields."); return; }
    setError(null);
    setLoading(true);
    try {
      const isEmail = identifier.includes("@");
      let emailToUse = identifier.trim();

      if (!isEmail) {
        const { data } = await supabase
          .from("usernames")
          .select("email")
          .eq("username", identifier.trim().toLowerCase())
          .maybeSingle();
        if (!data?.email) { setError("Username not found."); setLoading(false); return; }
        emailToUse = data.email as string;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email: emailToUse, password });
      if (signInError) { setError(signInError.message); setLoading(false); return; }
      onLogin();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-6"
      style={{ background: "#08080f" }}
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10 text-center"
      >
        <h1
          className="gradient-text font-bold select-none leading-none"
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "clamp(2rem, 10vw, 2.8rem)",
            letterSpacing: "-0.01em",
          }}
        >
          ✦ coincidence
        </h1>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="w-full max-w-sm bg-card border border-border rounded-3xl px-6 py-8 shadow-2xl"
      >
        <h2 className="text-xl font-bold text-foreground mb-1">Welcome back</h2>
        <p className="text-sm text-muted-foreground mb-6">Sign in to continue your coincidences</p>

        <div className="space-y-4">
          {/* Identifier */}
          <div>
            <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">
              Email or username
            </label>
            <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl border-2 border-border focus-within:border-foreground bg-card transition-colors">
              <AtSign className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                placeholder="you@example.com or username"
                autoComplete="username"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl border-2 border-border focus-within:border-foreground bg-card transition-colors">
              <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                autoComplete="current-password"
                className="flex-1 bg-transparent text-sm text-foreground outline-none"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-xs text-red-400 font-medium"
          >
            {error}
          </motion.p>
        )}

        <button
          onClick={handleSignIn}
          disabled={loading}
          className="mt-7 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm text-white active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" }}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
            : <>Sign in <ArrowRight className="w-4 h-4" /></>}
        </button>
      </motion.div>
    </div>
  );
}

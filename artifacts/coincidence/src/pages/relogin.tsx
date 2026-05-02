import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Loader2, Lock, Mail, ChevronLeft, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ReloginPageProps {
  onLogin: () => void;
}

export default function ReloginPage({ onLogin }: ReloginPageProps) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const [resetMode, setResetMode]   = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent]   = useState(false);
  const [resetError, setResetError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startResendCooldown() {
    setResendCooldown(30);
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    resendTimerRef.current = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(resendTimerRef.current!); resendTimerRef.current = null; return 0; }
        return c - 1;
      });
    }, 1000);
  }

  function openReset() {
    setResetEmail(email);
    setResetError("");
    setResetSent(false);
    setResendCooldown(0);
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    setResetMode(true);
  }

  function closeReset() {
    setResetMode(false);
    setResetSent(false);
    setResetError("");
    setResendCooldown(0);
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
  }

  async function sendResetEmail(emailAddr: string) {
    const redirectTo = window.location.href.split("#")[0].split("?")[0];
    return supabase.auth.resetPasswordForEmail(emailAddr.trim().toLowerCase(), { redirectTo });
  }

  async function handleSendReset() {
    if (!resetEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail.trim())) {
      setResetError("Enter a valid email address");
      return;
    }
    setLoading(true);
    setResetError("");
    const { error: err } = await sendResetEmail(resetEmail);
    setLoading(false);
    if (err) { setResetError(err.message); return; }
    setResetSent(true);
    startResendCooldown();
  }

  async function handleResend() {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    const { error: err } = await sendResetEmail(resetEmail);
    setLoading(false);
    if (!err) startResendCooldown();
  }

  async function handleSignIn() {
    if (!email.trim() || !password) { setError("Please fill in all fields."); return; }
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) { setError(signInError.message); setLoading(false); return; }
      onLogin();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center px-6" style={{ background: "#08080f" }}>
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
        <AnimatePresence mode="wait">
          {!resetMode ? (
            <motion.div key="login" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
              <h2 className="text-xl font-bold text-foreground mb-1">Welcome back</h2>
              <p className="text-sm text-muted-foreground mb-6">Sign in to continue your coincidences</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">Email</label>
                  <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl border-2 border-border focus-within:border-foreground bg-card transition-colors">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-foreground/70 uppercase tracking-wide">Password</label>
                    <button
                      type="button"
                      onClick={openReset}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                    >
                      Forgot password?
                    </button>
                  </div>
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
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-xs text-red-400 font-medium">
                  {error}
                </motion.p>
              )}

              <button
                onClick={handleSignIn}
                disabled={loading}
                className="mt-7 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm text-white active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" }}
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : <>Sign in <ArrowRight className="w-4 h-4" /></>}
              </button>
            </motion.div>
          ) : (
            <motion.div key="reset" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
              {resetSent ? (
                <div className="flex flex-col items-center gap-5 py-2 text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" }}>
                    <Check className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Check your email</h2>
                    <p className="text-sm text-muted-foreground mt-2">
                      We sent a reset link to <span className="font-medium text-foreground">{resetEmail}</span>. Click it to set a new password.
                    </p>
                  </div>
                  <button
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || loading}
                    className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" }}
                  >
                    {loading
                      ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Sending…</span>
                      : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend email"
                    }
                  </button>
                  <button onClick={closeReset} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Back to log in
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={closeReset}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-5 -ml-1 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <h2 className="text-xl font-bold text-foreground mb-1">Reset password</h2>
                  <p className="text-sm text-muted-foreground mb-6">We'll send you a link to set a new one</p>

                  <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl border-2 border-border focus-within:border-foreground bg-card transition-colors">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendReset()}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
                    />
                  </div>

                  {resetError && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-xs text-red-400 font-medium">
                      {resetError}
                    </motion.p>
                  )}

                  <button
                    onClick={handleSendReset}
                    disabled={loading}
                    className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm text-white active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" }}
                  >
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <>Send reset link <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

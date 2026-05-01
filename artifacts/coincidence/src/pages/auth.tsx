import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight, ChevronLeft, Check, Phone, Mail, AtSign, Lock } from "lucide-react";

export interface AccountData {
  username: string;
  email: string;
  phone: string;
  passwordEncoded: string;
}

interface AuthPageProps {
  defaultMode?: "create" | "login";
  existingAccount: AccountData | null;
  onCreateAccount: (data: AccountData) => void;
  onLogin: () => void;
}

function encodePassword(pw: string): string {
  return btoa(encodeURIComponent(pw));
}

function validateEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
function validatePhone(v: string) {
  return /^\+?[\d\s\-().]{7,15}$/.test(v.trim());
}
function validateUsername(v: string) {
  return /^[a-zA-Z0-9_.]{3,20}$/.test(v.trim());
}
function validatePassword(v: string) {
  return v.length >= 8;
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir * 40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -40, opacity: 0 }),
};

export default function AuthPage({ defaultMode = "create", existingAccount, onCreateAccount, onLogin }: AuthPageProps) {
  const [mode, setMode] = useState<"create" | "login">(defaultMode);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loginError, setLoginError] = useState("");

  const totalSteps = 3;

  function goNext() { setDir(1); setErrors({}); setStep((s) => s + 1); }
  function goBack() { setDir(-1); setErrors({}); setStep((s) => s - 1); }

  function switchMode(m: "create" | "login") {
    setErrors({}); setLoginError(""); setStep(0); setDir(1);
    setEmail(""); setPhone(""); setUsername(""); setPassword(""); setConfirmPassword("");
    setLoginIdentifier(""); setLoginPassword("");
    setMode(m);
  }

  function validateStep0() {
    const e: Record<string, string> = {};
    if (!validateEmail(email)) e.email = "Enter a valid email address";
    if (!validatePhone(phone)) e.phone = "Enter a valid phone number";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep1() {
    const e: Record<string, string> = {};
    if (!validateUsername(username)) e.username = "3–20 characters, letters, numbers, _ or .";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2() {
    const e: Record<string, string> = {};
    if (!validatePassword(password)) e.password = "At least 8 characters";
    if (password !== confirmPassword) e.confirm = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNextStep() {
    if (step === 0 && validateStep0()) goNext();
    else if (step === 1 && validateStep1()) goNext();
    else if (step === 2 && validateStep2()) {
      onCreateAccount({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        passwordEncoded: encodePassword(password),
      });
    }
  }

  function handleLogin() {
    setLoginError("");
    if (!existingAccount) { setLoginError("No account found. Please create one."); return; }
    const id = loginIdentifier.trim().toLowerCase();
    const matchesEmail = existingAccount.email === id;
    const matchesUsername = existingAccount.username.toLowerCase() === id;
    if (!matchesEmail && !matchesUsername) {
      setLoginError("Email or username not found");
      return;
    }
    if (existingAccount.passwordEncoded !== encodePassword(loginPassword)) {
      setLoginError("Incorrect password");
      return;
    }
    onLogin();
  }

  const stepTitles = ["Your contact info", "Pick a username", "Create a password"];
  const stepSubtitles = [
    "How we'll keep your account secure",
    "This is how others will find you",
    "Keep it strong and secret",
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-10">
      {/* Logo / wordmark */}
      <div className="flex flex-col items-center mb-10 pt-4">
        <img src="/logo.jpeg" alt="Coincidence" className="w-14 h-14 rounded-2xl object-cover shadow mb-4" />
        <p className="text-xs text-muted-foreground italic tracking-wide" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          making the invisible string – visible.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-2xl border border-border overflow-hidden mb-8 max-w-xs mx-auto w-full">
        {(["create", "login"] as const).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              mode === m ? "bg-foreground text-background" : "bg-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "create" ? "Create account" : "Log in"}
          </button>
        ))}
      </div>

      <div className="flex-1 max-w-xs mx-auto w-full">
        {/* ── CREATE ACCOUNT ── */}
        {mode === "create" && (
          <>
            {/* Step progress */}
            <div className="flex items-center gap-1.5 mb-6">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full flex-1 transition-all duration-400 ${
                    i < step ? "bg-foreground" : i === step ? "bg-foreground/60" : "bg-muted"
                  }`}
                />
              ))}
            </div>

            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={step}
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeInOut" }}
              >
                {/* Step header */}
                <div className="mb-7">
                  {step > 0 && (
                    <button onClick={goBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 -ml-1 transition-colors">
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                  )}
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1">
                    Step {step + 1} of {totalSteps}
                  </p>
                  <h2 className="text-2xl font-bold text-foreground leading-tight">{stepTitles[step]}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{stepSubtitles[step]}</p>
                </div>

                {/* Step 0 — Email + Phone */}
                {step === 0 && (
                  <div className="space-y-4">
                    <Field
                      label="Email address"
                      icon={<Mail className="w-4 h-4" />}
                      type="email"
                      value={email}
                      onChange={setEmail}
                      placeholder="you@example.com"
                      error={errors.email}
                      autoComplete="email"
                    />
                    <Field
                      label="Phone number"
                      icon={<Phone className="w-4 h-4" />}
                      type="tel"
                      value={phone}
                      onChange={setPhone}
                      placeholder="+1 555 000 0000"
                      error={errors.phone}
                      autoComplete="tel"
                    />
                  </div>
                )}

                {/* Step 1 — Username */}
                {step === 1 && (
                  <div className="space-y-4">
                    <Field
                      label="Username"
                      icon={<AtSign className="w-4 h-4" />}
                      type="text"
                      value={username}
                      onChange={setUsername}
                      placeholder="your_username"
                      error={errors.username}
                      hint="Letters, numbers, _ and . only. 3–20 characters."
                      autoComplete="username"
                    />
                  </div>
                )}

                {/* Step 2 — Password */}
                {step === 2 && (
                  <div className="space-y-4">
                    <PasswordField
                      label="Password"
                      value={password}
                      onChange={setPassword}
                      show={showPw}
                      onToggle={() => setShowPw((v) => !v)}
                      error={errors.password}
                      hint="Minimum 8 characters"
                      autoComplete="new-password"
                    />
                    <PasswordField
                      label="Confirm password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      show={showConfirm}
                      onToggle={() => setShowConfirm((v) => !v)}
                      error={errors.confirm}
                      autoComplete="new-password"
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <button
              onClick={handleNextStep}
              className="mt-8 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-foreground text-background font-semibold text-sm hover:bg-foreground/90 active:scale-[0.98] transition-all"
            >
              {step === totalSteps - 1 ? (
                <><Check className="w-4 h-4" /> Create account</>
              ) : (
                <>Continue <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </>
        )}

        {/* ── LOG IN ── */}
        {mode === "login" && (
          <motion.div key="login" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-foreground leading-tight">Welcome back</h2>
              <p className="text-sm text-muted-foreground mt-1">Sign in to continue your coincidences</p>
            </div>

            <div className="space-y-4">
              <Field
                label="Email or username"
                icon={<AtSign className="w-4 h-4" />}
                type="text"
                value={loginIdentifier}
                onChange={setLoginIdentifier}
                placeholder="you@example.com or username"
                autoComplete="username"
              />
              <PasswordField
                label="Password"
                value={loginPassword}
                onChange={setLoginPassword}
                show={showLoginPw}
                onToggle={() => setShowLoginPw((v) => !v)}
                autoComplete="current-password"
              />
            </div>

            {loginError && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 text-xs text-red-500 font-medium"
              >
                {loginError}
              </motion.p>
            )}

            <button
              onClick={handleLogin}
              className="mt-8 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-foreground text-background font-semibold text-sm hover:bg-foreground/90 active:scale-[0.98] transition-all"
            >
              Log in <ArrowRight className="w-4 h-4" />
            </button>

            {!existingAccount && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                No account yet?{" "}
                <button onClick={() => switchMode("create")} className="underline underline-offset-2 text-foreground font-medium">
                  Create one
                </button>
              </p>
            )}
          </motion.div>
        )}
      </div>

      {/* Footer rope decoration */}
      <div className="flex items-center justify-center mt-10 opacity-20">
        <svg viewBox="0 0 140 20" className="w-28 text-foreground" fill="none">
          <path d="M5 10 C 20 3, 30 17, 50 10 C 70 3, 80 17, 100 10 C 120 3, 130 17, 135 10"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="50" cy="10" r="2.5" fill="currentColor" />
          <circle cx="100" cy="10" r="2.5" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  icon?: React.ReactNode;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  autoComplete?: string;
}

function Field({ label, icon, type, value, onChange, placeholder, error, hint, autoComplete }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">{label}</label>
      <div className={`flex items-center gap-2.5 px-3.5 py-3 rounded-2xl border-2 transition-colors ${
        error ? "border-red-400 bg-red-50/50" : "border-border focus-within:border-foreground bg-card"
      }`}>
        {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
        />
      </div>
      {error && (
        <motion.p initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-xs text-red-500 font-medium">
          {error}
        </motion.p>
      )}
      {hint && !error && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  error?: string;
  hint?: string;
  autoComplete?: string;
}

function PasswordField({ label, value, onChange, show, onToggle, error, hint, autoComplete }: PasswordFieldProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">{label}</label>
      <div className={`flex items-center gap-2.5 px-3.5 py-3 rounded-2xl border-2 transition-colors ${
        error ? "border-red-400 bg-red-50/50" : "border-border focus-within:border-foreground bg-card"
      }`}>
        <span className="text-muted-foreground shrink-0"><Lock className="w-4 h-4" /></span>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent text-sm text-foreground outline-none"
        />
        <button type="button" onClick={onToggle} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && (
        <motion.p initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-xs text-red-500 font-medium">
          {error}
        </motion.p>
      )}
      {hint && !error && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

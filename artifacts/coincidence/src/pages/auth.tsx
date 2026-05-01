import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight, ChevronLeft, Check, Mail, Lock, ChevronDown, Search, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export interface AccountData {
  id: string;
  email: string;
  phone: string;
}

interface AuthPageProps {
  defaultMode?: "create" | "login";
  existingAccount: AccountData | null;
  onCreateAccount: (data: AccountData) => void;
  onLogin: () => void;
}

function validateEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
function validatePhone(v: string) {
  return /^\d{4,14}$/.test(v.replace(/[\s\-().]/g, ""));
}
function validateUsername(v: string) {
  return /^[a-zA-Z0-9_.]{3,20}$/.test(v.trim());
}
function validatePassword(v: string) {
  return v.length >= 8;
}

interface Country {
  flag: string;
  name: string;
  dialCode: string;
  code: string;
}

const COUNTRIES: Country[] = [
  { flag: "🇦🇫", name: "Afghanistan", dialCode: "+93", code: "AF" },
  { flag: "🇦🇱", name: "Albania", dialCode: "+355", code: "AL" },
  { flag: "🇩🇿", name: "Algeria", dialCode: "+213", code: "DZ" },
  { flag: "🇦🇩", name: "Andorra", dialCode: "+376", code: "AD" },
  { flag: "🇦🇴", name: "Angola", dialCode: "+244", code: "AO" },
  { flag: "🇦🇬", name: "Antigua & Barbuda", dialCode: "+1268", code: "AG" },
  { flag: "🇦🇷", name: "Argentina", dialCode: "+54", code: "AR" },
  { flag: "🇦🇲", name: "Armenia", dialCode: "+374", code: "AM" },
  { flag: "🇦🇺", name: "Australia", dialCode: "+61", code: "AU" },
  { flag: "🇦🇹", name: "Austria", dialCode: "+43", code: "AT" },
  { flag: "🇦🇿", name: "Azerbaijan", dialCode: "+994", code: "AZ" },
  { flag: "🇧🇸", name: "Bahamas", dialCode: "+1242", code: "BS" },
  { flag: "🇧🇭", name: "Bahrain", dialCode: "+973", code: "BH" },
  { flag: "🇧🇩", name: "Bangladesh", dialCode: "+880", code: "BD" },
  { flag: "🇧🇧", name: "Barbados", dialCode: "+1246", code: "BB" },
  { flag: "🇧🇾", name: "Belarus", dialCode: "+375", code: "BY" },
  { flag: "🇧🇪", name: "Belgium", dialCode: "+32", code: "BE" },
  { flag: "🇧🇿", name: "Belize", dialCode: "+501", code: "BZ" },
  { flag: "🇧🇯", name: "Benin", dialCode: "+229", code: "BJ" },
  { flag: "🇧🇹", name: "Bhutan", dialCode: "+975", code: "BT" },
  { flag: "🇧🇴", name: "Bolivia", dialCode: "+591", code: "BO" },
  { flag: "🇧🇦", name: "Bosnia & Herzegovina", dialCode: "+387", code: "BA" },
  { flag: "🇧🇼", name: "Botswana", dialCode: "+267", code: "BW" },
  { flag: "🇧🇷", name: "Brazil", dialCode: "+55", code: "BR" },
  { flag: "🇧🇳", name: "Brunei", dialCode: "+673", code: "BN" },
  { flag: "🇧🇬", name: "Bulgaria", dialCode: "+359", code: "BG" },
  { flag: "🇧🇫", name: "Burkina Faso", dialCode: "+226", code: "BF" },
  { flag: "🇧🇮", name: "Burundi", dialCode: "+257", code: "BI" },
  { flag: "🇨🇻", name: "Cabo Verde", dialCode: "+238", code: "CV" },
  { flag: "🇰🇭", name: "Cambodia", dialCode: "+855", code: "KH" },
  { flag: "🇨🇲", name: "Cameroon", dialCode: "+237", code: "CM" },
  { flag: "🇨🇦", name: "Canada", dialCode: "+1", code: "CA" },
  { flag: "🇨🇫", name: "Central African Rep.", dialCode: "+236", code: "CF" },
  { flag: "🇹🇩", name: "Chad", dialCode: "+235", code: "TD" },
  { flag: "🇨🇱", name: "Chile", dialCode: "+56", code: "CL" },
  { flag: "🇨🇳", name: "China", dialCode: "+86", code: "CN" },
  { flag: "🇨🇴", name: "Colombia", dialCode: "+57", code: "CO" },
  { flag: "🇰🇲", name: "Comoros", dialCode: "+269", code: "KM" },
  { flag: "🇨🇬", name: "Congo", dialCode: "+242", code: "CG" },
  { flag: "🇨🇩", name: "Congo (DRC)", dialCode: "+243", code: "CD" },
  { flag: "🇨🇷", name: "Costa Rica", dialCode: "+506", code: "CR" },
  { flag: "🇭🇷", name: "Croatia", dialCode: "+385", code: "HR" },
  { flag: "🇨🇺", name: "Cuba", dialCode: "+53", code: "CU" },
  { flag: "🇨🇾", name: "Cyprus", dialCode: "+357", code: "CY" },
  { flag: "🇨🇿", name: "Czech Republic", dialCode: "+420", code: "CZ" },
  { flag: "🇩🇰", name: "Denmark", dialCode: "+45", code: "DK" },
  { flag: "🇩🇯", name: "Djibouti", dialCode: "+253", code: "DJ" },
  { flag: "🇩🇲", name: "Dominica", dialCode: "+1767", code: "DM" },
  { flag: "🇩🇴", name: "Dominican Republic", dialCode: "+1809", code: "DO" },
  { flag: "🇪🇨", name: "Ecuador", dialCode: "+593", code: "EC" },
  { flag: "🇪🇬", name: "Egypt", dialCode: "+20", code: "EG" },
  { flag: "🇸🇻", name: "El Salvador", dialCode: "+503", code: "SV" },
  { flag: "🇬🇶", name: "Equatorial Guinea", dialCode: "+240", code: "GQ" },
  { flag: "🇪🇷", name: "Eritrea", dialCode: "+291", code: "ER" },
  { flag: "🇪🇪", name: "Estonia", dialCode: "+372", code: "EE" },
  { flag: "🇸🇿", name: "Eswatini", dialCode: "+268", code: "SZ" },
  { flag: "🇪🇹", name: "Ethiopia", dialCode: "+251", code: "ET" },
  { flag: "🇫🇯", name: "Fiji", dialCode: "+679", code: "FJ" },
  { flag: "🇫🇮", name: "Finland", dialCode: "+358", code: "FI" },
  { flag: "🇫🇷", name: "France", dialCode: "+33", code: "FR" },
  { flag: "🇬🇦", name: "Gabon", dialCode: "+241", code: "GA" },
  { flag: "🇬🇲", name: "Gambia", dialCode: "+220", code: "GM" },
  { flag: "🇬🇪", name: "Georgia", dialCode: "+995", code: "GE" },
  { flag: "🇩🇪", name: "Germany", dialCode: "+49", code: "DE" },
  { flag: "🇬🇭", name: "Ghana", dialCode: "+233", code: "GH" },
  { flag: "🇬🇷", name: "Greece", dialCode: "+30", code: "GR" },
  { flag: "🇬🇩", name: "Grenada", dialCode: "+1473", code: "GD" },
  { flag: "🇬🇹", name: "Guatemala", dialCode: "+502", code: "GT" },
  { flag: "🇬🇳", name: "Guinea", dialCode: "+224", code: "GN" },
  { flag: "🇬🇼", name: "Guinea-Bissau", dialCode: "+245", code: "GW" },
  { flag: "🇬🇾", name: "Guyana", dialCode: "+592", code: "GY" },
  { flag: "🇭🇹", name: "Haiti", dialCode: "+509", code: "HT" },
  { flag: "🇭🇳", name: "Honduras", dialCode: "+504", code: "HN" },
  { flag: "🇭🇺", name: "Hungary", dialCode: "+36", code: "HU" },
  { flag: "🇮🇸", name: "Iceland", dialCode: "+354", code: "IS" },
  { flag: "🇮🇳", name: "India", dialCode: "+91", code: "IN" },
  { flag: "🇮🇩", name: "Indonesia", dialCode: "+62", code: "ID" },
  { flag: "🇮🇷", name: "Iran", dialCode: "+98", code: "IR" },
  { flag: "🇮🇶", name: "Iraq", dialCode: "+964", code: "IQ" },
  { flag: "🇮🇪", name: "Ireland", dialCode: "+353", code: "IE" },
  { flag: "🇮🇱", name: "Israel", dialCode: "+972", code: "IL" },
  { flag: "🇮🇹", name: "Italy", dialCode: "+39", code: "IT" },
  { flag: "🇯🇲", name: "Jamaica", dialCode: "+1876", code: "JM" },
  { flag: "🇯🇵", name: "Japan", dialCode: "+81", code: "JP" },
  { flag: "🇯🇴", name: "Jordan", dialCode: "+962", code: "JO" },
  { flag: "🇰🇿", name: "Kazakhstan", dialCode: "+7", code: "KZ" },
  { flag: "🇰🇪", name: "Kenya", dialCode: "+254", code: "KE" },
  { flag: "🇰🇮", name: "Kiribati", dialCode: "+686", code: "KI" },
  { flag: "🇽🇰", name: "Kosovo", dialCode: "+383", code: "XK" },
  { flag: "🇰🇼", name: "Kuwait", dialCode: "+965", code: "KW" },
  { flag: "🇰🇬", name: "Kyrgyzstan", dialCode: "+996", code: "KG" },
  { flag: "🇱🇦", name: "Laos", dialCode: "+856", code: "LA" },
  { flag: "🇱🇻", name: "Latvia", dialCode: "+371", code: "LV" },
  { flag: "🇱🇧", name: "Lebanon", dialCode: "+961", code: "LB" },
  { flag: "🇱🇸", name: "Lesotho", dialCode: "+266", code: "LS" },
  { flag: "🇱🇷", name: "Liberia", dialCode: "+231", code: "LR" },
  { flag: "🇱🇾", name: "Libya", dialCode: "+218", code: "LY" },
  { flag: "🇱🇮", name: "Liechtenstein", dialCode: "+423", code: "LI" },
  { flag: "🇱🇹", name: "Lithuania", dialCode: "+370", code: "LT" },
  { flag: "🇱🇺", name: "Luxembourg", dialCode: "+352", code: "LU" },
  { flag: "🇲🇬", name: "Madagascar", dialCode: "+261", code: "MG" },
  { flag: "🇲🇼", name: "Malawi", dialCode: "+265", code: "MW" },
  { flag: "🇲🇾", name: "Malaysia", dialCode: "+60", code: "MY" },
  { flag: "🇲🇻", name: "Maldives", dialCode: "+960", code: "MV" },
  { flag: "🇲🇱", name: "Mali", dialCode: "+223", code: "ML" },
  { flag: "🇲🇹", name: "Malta", dialCode: "+356", code: "MT" },
  { flag: "🇲🇭", name: "Marshall Islands", dialCode: "+692", code: "MH" },
  { flag: "🇲🇷", name: "Mauritania", dialCode: "+222", code: "MR" },
  { flag: "🇲🇺", name: "Mauritius", dialCode: "+230", code: "MU" },
  { flag: "🇲🇽", name: "Mexico", dialCode: "+52", code: "MX" },
  { flag: "🇫🇲", name: "Micronesia", dialCode: "+691", code: "FM" },
  { flag: "🇲🇩", name: "Moldova", dialCode: "+373", code: "MD" },
  { flag: "🇲🇨", name: "Monaco", dialCode: "+377", code: "MC" },
  { flag: "🇲🇳", name: "Mongolia", dialCode: "+976", code: "MN" },
  { flag: "🇲🇪", name: "Montenegro", dialCode: "+382", code: "ME" },
  { flag: "🇲🇦", name: "Morocco", dialCode: "+212", code: "MA" },
  { flag: "🇲🇿", name: "Mozambique", dialCode: "+258", code: "MZ" },
  { flag: "🇲🇲", name: "Myanmar", dialCode: "+95", code: "MM" },
  { flag: "🇳🇦", name: "Namibia", dialCode: "+264", code: "NA" },
  { flag: "🇳🇷", name: "Nauru", dialCode: "+674", code: "NR" },
  { flag: "🇳🇵", name: "Nepal", dialCode: "+977", code: "NP" },
  { flag: "🇳🇱", name: "Netherlands", dialCode: "+31", code: "NL" },
  { flag: "🇳🇿", name: "New Zealand", dialCode: "+64", code: "NZ" },
  { flag: "🇳🇮", name: "Nicaragua", dialCode: "+505", code: "NI" },
  { flag: "🇳🇪", name: "Niger", dialCode: "+227", code: "NE" },
  { flag: "🇳🇬", name: "Nigeria", dialCode: "+234", code: "NG" },
  { flag: "🇰🇵", name: "North Korea", dialCode: "+850", code: "KP" },
  { flag: "🇲🇰", name: "North Macedonia", dialCode: "+389", code: "MK" },
  { flag: "🇳🇴", name: "Norway", dialCode: "+47", code: "NO" },
  { flag: "🇴🇲", name: "Oman", dialCode: "+968", code: "OM" },
  { flag: "🇵🇰", name: "Pakistan", dialCode: "+92", code: "PK" },
  { flag: "🇵🇼", name: "Palau", dialCode: "+680", code: "PW" },
  { flag: "🇵🇦", name: "Panama", dialCode: "+507", code: "PA" },
  { flag: "🇵🇬", name: "Papua New Guinea", dialCode: "+675", code: "PG" },
  { flag: "🇵🇾", name: "Paraguay", dialCode: "+595", code: "PY" },
  { flag: "🇵🇪", name: "Peru", dialCode: "+51", code: "PE" },
  { flag: "🇵🇭", name: "Philippines", dialCode: "+63", code: "PH" },
  { flag: "🇵🇱", name: "Poland", dialCode: "+48", code: "PL" },
  { flag: "🇵🇹", name: "Portugal", dialCode: "+351", code: "PT" },
  { flag: "🇶🇦", name: "Qatar", dialCode: "+974", code: "QA" },
  { flag: "🇷🇴", name: "Romania", dialCode: "+40", code: "RO" },
  { flag: "🇷🇺", name: "Russia", dialCode: "+7", code: "RU" },
  { flag: "🇷🇼", name: "Rwanda", dialCode: "+250", code: "RW" },
  { flag: "🇰🇳", name: "Saint Kitts & Nevis", dialCode: "+1869", code: "KN" },
  { flag: "🇱🇨", name: "Saint Lucia", dialCode: "+1758", code: "LC" },
  { flag: "🇻🇨", name: "Saint Vincent", dialCode: "+1784", code: "VC" },
  { flag: "🇼🇸", name: "Samoa", dialCode: "+685", code: "WS" },
  { flag: "🇸🇲", name: "San Marino", dialCode: "+378", code: "SM" },
  { flag: "🇸🇹", name: "São Tomé & Príncipe", dialCode: "+239", code: "ST" },
  { flag: "🇸🇦", name: "Saudi Arabia", dialCode: "+966", code: "SA" },
  { flag: "🇸🇳", name: "Senegal", dialCode: "+221", code: "SN" },
  { flag: "🇷🇸", name: "Serbia", dialCode: "+381", code: "RS" },
  { flag: "🇸🇨", name: "Seychelles", dialCode: "+248", code: "SC" },
  { flag: "🇸🇱", name: "Sierra Leone", dialCode: "+232", code: "SL" },
  { flag: "🇸🇬", name: "Singapore", dialCode: "+65", code: "SG" },
  { flag: "🇸🇰", name: "Slovakia", dialCode: "+421", code: "SK" },
  { flag: "🇸🇮", name: "Slovenia", dialCode: "+386", code: "SI" },
  { flag: "🇸🇧", name: "Solomon Islands", dialCode: "+677", code: "SB" },
  { flag: "🇸🇴", name: "Somalia", dialCode: "+252", code: "SO" },
  { flag: "🇿🇦", name: "South Africa", dialCode: "+27", code: "ZA" },
  { flag: "🇸🇸", name: "South Sudan", dialCode: "+211", code: "SS" },
  { flag: "🇪🇸", name: "Spain", dialCode: "+34", code: "ES" },
  { flag: "🇱🇰", name: "Sri Lanka", dialCode: "+94", code: "LK" },
  { flag: "🇸🇩", name: "Sudan", dialCode: "+249", code: "SD" },
  { flag: "🇸🇷", name: "Suriname", dialCode: "+597", code: "SR" },
  { flag: "🇸🇪", name: "Sweden", dialCode: "+46", code: "SE" },
  { flag: "🇨🇭", name: "Switzerland", dialCode: "+41", code: "CH" },
  { flag: "🇸🇾", name: "Syria", dialCode: "+963", code: "SY" },
  { flag: "🇹🇼", name: "Taiwan", dialCode: "+886", code: "TW" },
  { flag: "🇹🇯", name: "Tajikistan", dialCode: "+992", code: "TJ" },
  { flag: "🇹🇿", name: "Tanzania", dialCode: "+255", code: "TZ" },
  { flag: "🇹🇭", name: "Thailand", dialCode: "+66", code: "TH" },
  { flag: "🇹🇱", name: "Timor-Leste", dialCode: "+670", code: "TL" },
  { flag: "🇹🇬", name: "Togo", dialCode: "+228", code: "TG" },
  { flag: "🇹🇴", name: "Tonga", dialCode: "+676", code: "TO" },
  { flag: "🇹🇹", name: "Trinidad & Tobago", dialCode: "+1868", code: "TT" },
  { flag: "🇹🇳", name: "Tunisia", dialCode: "+216", code: "TN" },
  { flag: "🇹🇷", name: "Turkey", dialCode: "+90", code: "TR" },
  { flag: "🇹🇲", name: "Turkmenistan", dialCode: "+993", code: "TM" },
  { flag: "🇹🇻", name: "Tuvalu", dialCode: "+688", code: "TV" },
  { flag: "🇺🇬", name: "Uganda", dialCode: "+256", code: "UG" },
  { flag: "🇺🇦", name: "Ukraine", dialCode: "+380", code: "UA" },
  { flag: "🇦🇪", name: "United Arab Emirates", dialCode: "+971", code: "AE" },
  { flag: "🇬🇧", name: "United Kingdom", dialCode: "+44", code: "GB" },
  { flag: "🇺🇸", name: "United States", dialCode: "+1", code: "US" },
  { flag: "🇺🇾", name: "Uruguay", dialCode: "+598", code: "UY" },
  { flag: "🇺🇿", name: "Uzbekistan", dialCode: "+998", code: "UZ" },
  { flag: "🇻🇺", name: "Vanuatu", dialCode: "+678", code: "VU" },
  { flag: "🇻🇦", name: "Vatican City", dialCode: "+39", code: "VA" },
  { flag: "🇻🇪", name: "Venezuela", dialCode: "+58", code: "VE" },
  { flag: "🇻🇳", name: "Vietnam", dialCode: "+84", code: "VN" },
  { flag: "🇾🇪", name: "Yemen", dialCode: "+967", code: "YE" },
  { flag: "🇿🇲", name: "Zambia", dialCode: "+260", code: "ZM" },
  { flag: "🇿🇼", name: "Zimbabwe", dialCode: "+263", code: "ZW" },
];

const DEFAULT_COUNTRY = COUNTRIES.find((c) => c.code === "US")!;

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
  const [phoneCountry, setPhoneCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phoneLocal, setPhoneLocal] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const totalSteps = 2;

  function goNext() { setDir(1); setErrors({}); setStep((s) => s + 1); }
  function goBack() { setDir(-1); setErrors({}); setStep((s) => s - 1); }

  function switchMode(m: "create" | "login") {
    setErrors({}); setLoginError(""); setStep(0); setDir(1);
    setEmail(""); setPhoneLocal(""); setPassword(""); setConfirmPassword("");
    setLoginIdentifier(""); setLoginPassword("");
    setMode(m);
  }

  function validateStep0() {
    const e: Record<string, string> = {};
    if (!validateEmail(email)) e.email = "Enter a valid email address";
    if (!validatePhone(phoneLocal)) e.phone = "Enter a valid local number (digits only)";
    setErrors(e);
    return Object.keys(e).length === 0;
  }
  function validateStep1() {
    const e: Record<string, string> = {};
    if (!validatePassword(password)) e.password = "At least 8 characters";
    if (password !== confirmPassword) e.confirm = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleNextStep() {
    if (step === 0 && validateStep0()) { goNext(); return; }
    if (step === 1 && validateStep1()) {
      setIsLoading(true);
      const trimEmail = email.trim().toLowerCase();
      const phone     = phoneCountry.dialCode + phoneLocal.replace(/[\s\-().]/g, "");

      const { data, error } = await supabase.auth.signUp({
        email: trimEmail,
        password,
        options: { data: { phone } },
      });

      if (error) {
        setErrors({ confirm: error.message });
        setIsLoading(false);
        return;
      }

      if (data.user) {
        onCreateAccount({ id: data.user.id, email: trimEmail, phone });
      } else {
        setErrors({ confirm: "Please check your email to confirm your account, then log in." });
      }
      setIsLoading(false);
    }
  }

  async function handleLogin() {
    setLoginError("");
    setIsLoading(true);
    const loginEmail = loginIdentifier.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      setLoginError(error.message === "Invalid login credentials" ? "Incorrect email or password" : error.message);
      setIsLoading(false);
      return;
    }

    if (data.user) {
      onLogin();
    }
    setIsLoading(false);
  }

  const stepTitles = ["Your contact info", "Create a password"];
  const stepSubtitles = [
    "How we'll keep your account secure",
    "Keep it strong and secret",
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-10">
      <div className="flex flex-col items-center mb-10 pt-4">
        <div className="w-14 h-14 rounded-2xl overflow-hidden shadow mb-4">
          <img src="/logo.png" alt="Coincidence" className="w-full h-full object-cover scale-[1.35]" />
        </div>
        <p className="text-xs text-muted-foreground italic tracking-wide" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          making the invisible string – visible.
        </p>
      </div>

      <div className="flex rounded-2xl border border-border overflow-hidden mb-8 max-w-xs mx-auto w-full">
        {(["create", "login"] as const).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
              mode === m ? "text-white" : "bg-transparent text-muted-foreground hover:text-foreground"
            }`}
            style={mode === m ? { background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" } : undefined}
          >
            {m === "create" ? "Create account" : "Log in"}
          </button>
        ))}
      </div>

      <div className="flex-1 max-w-xs mx-auto w-full">
        {mode === "create" && (
          <>
            <div className="flex items-center gap-1.5 mb-6">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className={`h-1 rounded-full flex-1 transition-all duration-400 ${
                  i < step ? "bg-foreground" : i === step ? "bg-foreground/60" : "bg-muted"
                }`} />
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
                    <PhoneField
                      country={phoneCountry}
                      onCountryChange={setPhoneCountry}
                      localNumber={phoneLocal}
                      onLocalNumberChange={setPhoneLocal}
                      error={errors.phone}
                    />
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-4">
                    <PasswordField label="Password" value={password} onChange={setPassword}
                      show={showPw} onToggle={() => setShowPw((v) => !v)}
                      error={errors.password} hint="Minimum 8 characters" autoComplete="new-password" />
                    <PasswordField label="Confirm password" value={confirmPassword} onChange={setConfirmPassword}
                      show={showConfirm} onToggle={() => setShowConfirm((v) => !v)}
                      error={errors.confirm} autoComplete="new-password" />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <button
              onClick={handleNextStep}
              disabled={isLoading}
              className="mt-8 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm text-white active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" }}
            >
              {isLoading && step === totalSteps - 1
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
                : step === totalSteps - 1
                  ? <><Check className="w-4 h-4" /> Create account</>
                  : <>Continue <ArrowRight className="w-4 h-4" /></>}
            </button>
          </>
        )}

        {mode === "login" && (
          <motion.div key="login" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-foreground leading-tight">Welcome back</h2>
              <p className="text-sm text-muted-foreground mt-1">Sign in to continue your coincidences</p>
            </div>
            <div className="space-y-4">
              <Field label="Email" icon={<Mail className="w-4 h-4" />} type="email"
                value={loginIdentifier} onChange={setLoginIdentifier}
                placeholder="you@example.com" autoComplete="email" />
              <PasswordField label="Password" value={loginPassword} onChange={setLoginPassword}
                show={showLoginPw} onToggle={() => setShowLoginPw((v) => !v)} autoComplete="current-password" />
            </div>
            {loginError && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-xs text-red-500 font-medium">
                {loginError}
              </motion.p>
            )}
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="mt-8 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm text-white active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" }}
            >
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : <>Log in <ArrowRight className="w-4 h-4" /></>}
            </button>
            {!existingAccount && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                No account yet?{" "}
                <button onClick={() => switchMode("create")} className="underline underline-offset-2 text-foreground font-medium">Create one</button>
              </p>
            )}
          </motion.div>
        )}
      </div>

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
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none" />
      </div>
      {error && <motion.p initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-xs text-red-500 font-medium">{error}</motion.p>}
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
        <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent text-sm text-foreground outline-none" />
        <button type="button" onClick={onToggle} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <motion.p initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-xs text-red-500 font-medium">{error}</motion.p>}
      {hint && !error && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

interface PhoneFieldProps {
  country: Country;
  onCountryChange: (c: Country) => void;
  localNumber: string;
  onLocalNumberChange: (v: string) => void;
  error?: string;
}

function PhoneField({ country, onCountryChange, localNumber, onLocalNumberChange, error }: PhoneFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = search.trim()
    ? COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.dialCode.includes(search) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRIES;

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div>
      <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">Phone number</label>
      <div className={`flex items-center rounded-2xl border-2 transition-colors ${
        error ? "border-red-400 bg-red-50/50" : "border-border focus-within:border-foreground bg-card"
      }`}>
        {/* Country picker trigger */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => { setOpen((v) => !v); setSearch(""); }}
            className="flex items-center gap-1.5 pl-3.5 pr-2 py-3 text-sm font-medium hover:bg-muted/50 rounded-l-2xl transition-colors border-r border-border shrink-0"
          >
            <span className="text-base leading-none">{country.flag}</span>
            <span className="text-foreground/70 tabular-nums text-xs">{country.dialCode}</span>
            <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 top-full mt-1.5 w-72 bg-card border border-border rounded-2xl shadow-xl z-[999] overflow-hidden"
              >
                {/* Search */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                  <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search country or code…"
                    className="flex-1 text-xs bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none"
                  />
                </div>
                {/* List */}
                <div className="max-h-52 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No results</p>
                  ) : (
                    filtered.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => { onCountryChange(c); setOpen(false); setSearch(""); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/60 transition-colors text-left ${
                          c.code === country.code ? "bg-muted" : ""
                        }`}
                      >
                        <span className="text-base leading-none w-6 shrink-0">{c.flag}</span>
                        <span className="flex-1 truncate text-foreground text-xs">{c.name}</span>
                        <span className="text-muted-foreground text-xs tabular-nums shrink-0">{c.dialCode}</span>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Local number input */}
        <input
          type="tel"
          value={localNumber}
          onChange={(e) => onLocalNumberChange(e.target.value)}
          placeholder="Local number"
          autoComplete="tel-national"
          className="flex-1 px-3 py-3 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
        />
      </div>
      {error && <motion.p initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-xs text-red-500 font-medium">{error}</motion.p>}
      <p className="mt-1 text-[11px] text-muted-foreground">Select your country, then enter your local number</p>
    </div>
  );
}

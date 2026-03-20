import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useGuestMode } from "@/contexts/GuestModeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Sparkles, ArrowRight } from "lucide-react";
import tidymateIcon from "@/assets/tidymate-icon.png";
const beforeRoom = new URL("@/assets/before-room.jpg", import.meta.url).href;
const afterRoom = new URL("@/assets/after-room.jpg", import.meta.url).href;
import { analytics, identifyUser } from "@/lib/analytics";

const Auth = () => {
  const navigate = useNavigate();
  const { startGuestMode } = useGuestMode();
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) navigate("/", { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGuestMode = () => {
    startGuestMode();
    navigate("/capture");
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast.error("Google sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) identifyUser(data.user.id, { email: data.user.email });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (data.user) {
          identifyUser(data.user.id, { email: data.user.email, signup_date: new Date().toISOString() });
          analytics.signupCompleted({ email: data.user.email });
        }
        toast.success("Check your email to confirm your account!");
        setLoading(false);
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-[58%] flex-col justify-between bg-[#f7f5f0] p-10 overflow-y-auto">

        {/* Logo wordmark */}
        <div className="flex items-center gap-2 mb-10">
          <img src={tidymateIcon} alt="TidyMate" className="w-9 h-9 rounded-xl" />
          <span className="font-bold text-lg text-foreground">TidyMate</span>
        </div>

        {/* Headline */}
        <div className="mb-7">
          <h1 className="font-black text-4xl leading-tight text-foreground mb-4">
            Turns out we don't hate cleaning.
            <br />
            <span className="text-primary">We hate starting.</span>
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-md">
            TidyMate breaks your messy room into tiny, doable tasks — one at a time, no overwhelm.
            Built for ADHD brains.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex gap-2.5 flex-wrap mb-8">
          {[
            { icon: '⚡', label: '5-min micro-tasks' },
            { icon: '🧠', label: 'Built for ADHD' },
            { icon: '✨', label: 'AI-powered plan' },
          ].map(f => (
            <div key={f.label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
              <span>{f.icon}</span>
              {f.label}
            </div>
          ))}
        </div>



        {/* Single before/after photo */}
        <div className="relative rounded-2xl overflow-hidden mb-2 shadow-sm">
          <div className="flex">
            <div className="relative flex-1">
              <img
                src={beforeRoom}
                alt="Cluttered room before"
                className="w-full aspect-[16/9] object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute bottom-3 left-3 bg-foreground/80 text-background text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                Before
              </div>
            </div>
            <div className="relative flex-1">
              <img
                src={afterRoom}
                alt="Organized room after"
                className="w-full aspect-[16/9] object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute bottom-3 right-3 bg-primary text-primary-foreground text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                After
              </div>
            </div>
          </div>
        </div>

        {/* Photo caption */}
        <p className="text-xs text-muted-foreground/60 mb-6">
          AI-generated examples. Your actual results will vary — and that's totally fine.
        </p>

        {/* Why it works card */}
        <div className="rounded-xl border border-border bg-background/70 p-5 mb-8">
          <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-3">
            Why it actually works
          </p>
          <ul className="space-y-2.5">
            {[
              "📍 AI looks at YOUR room and makes a plan — not a generic checklist",
              "⏱️ Tasks take 5 minutes or less — designed to beat ADHD paralysis",
              "🔥 Streaks and points that make starting feel good, not guilty",
              "📸 Save every before & after — proof that you're making progress",
            ].map(item => (
              <li key={item} className="text-sm text-foreground/80 leading-snug">{item}</li>
            ))}
          </ul>
        </div>

        {/* Bottom urgency line */}
        <div className="border-t border-border/40 pt-5 text-center">
          <p className="text-sm text-muted-foreground">
            Takes <span className="font-bold text-foreground">30 seconds</span> to get your first task list.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10 bg-background">
        <div className="w-full max-w-sm animate-fade-in">

          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <img src={tidymateIcon} alt="TidyMate" className="w-14 h-14 rounded-2xl mb-3 shadow-sm" />
            <h1 className="text-2xl font-bold text-foreground">TidyMate</h1>
            <p className="text-sm text-muted-foreground mt-1">Transform chaos into calm</p>
          </div>

          {/* Desktop icon in form area */}
          <div className="hidden lg:flex justify-center mb-5">
            <img src={tidymateIcon} alt="TidyMate" className="w-14 h-14 rounded-2xl shadow-sm" />
          </div>

          {/* Form heading */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              {isLogin ? "Welcome back" : "Start for free"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isLogin ? "Your streak is waiting for you." : "No credit card. No overwhelm. Just one room."}
            </p>
          </div>

          {/* Auth form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-11"
              />
            </div>

            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {isLogin ? "Signing in…" : "Creating account…"}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {isLogin ? "Sign in" : "Create free account"}
                </span>
              )}
            </Button>

            {/* Divider */}
            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Google */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 font-medium gap-2"
              disabled={loading}
              onClick={handleGoogleSignIn}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>

            {/* Divider */}
            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Guest mode — prominent soft fill */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 font-semibold border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 gap-2"
              onClick={handleGuestMode}
            >
              <Sparkles className="w-4 h-4" />
              Try it without signing up
            </Button>
            <p className="text-xs text-muted-foreground/60 text-center -mt-1">
              No account needed · see how it works first
            </p>
          </form>

          {/* Switch mode */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                const switchingToSignup = isLogin;
                setIsLogin(!isLogin);
                if (switchingToSignup) analytics.signupStarted();
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground/60 mt-4">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;

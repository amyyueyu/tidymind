import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useGuestMode } from "@/contexts/GuestModeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Sparkles, Leaf, ArrowRight } from "lucide-react";
const beforeRoom = new URL("@/assets/before-room.jpg", import.meta.url).href;
const afterRoom = new URL("@/assets/after-room.jpg", import.meta.url).href;
const beforeBedroom = new URL("@/assets/before-bedroom.jpg", import.meta.url).href;
const afterBedroom = new URL("@/assets/after-bedroom.jpg", import.meta.url).href;
import { analytics, identifyUser } from "@/lib/analytics";

const Auth = () => {
  const navigate = useNavigate();
  const { startGuestMode } = useGuestMode();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate("/", { replace: true });
      }
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
        if (data.user) {
          identifyUser(data.user.id, { email: data.user.email });
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (data.user) {
          identifyUser(data.user.id, {
            email: data.user.email,
            signup_date: new Date().toISOString(),
          });
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
      {/* Left Side - Showcase */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/10 p-8 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />

        <div className="relative z-10 max-w-2xl w-full space-y-6">

          {/* CHANGE 1: New hero headline */}
          <div className="text-center mb-8 px-4">
            <h1 className="font-black text-3xl leading-tight text-foreground mb-3">
              Turns out we don't hate cleaning.
              <br />
              <span className="text-primary">We hate starting.</span>
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-sm mx-auto">
              TidyMate breaks your messy room into tiny,
              doable tasks — one at a time, no overwhelm.
              Built for ADHD brains.
            </p>
          </div>

          {/* CHANGE 2: Feature pills moved up, bigger */}
          <div className="flex justify-center gap-3 flex-wrap mb-8 px-4">
            {[
              { icon: '⚡', label: '5-min micro-tasks' },
              { icon: '🧠', label: 'Built for ADHD' },
              { icon: '✨', label: 'AI-powered plan' },
            ].map(f => (
              <div key={f.label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
                <span className="text-base">{f.icon}</span>
                {f.label}
              </div>
            ))}
          </div>

          {/* CHANGE 3: Social proof line */}
          <div className="text-center mb-4">
            <p className="text-sm text-muted-foreground">Real results from real messy rooms</p>
          </div>

          {/* Before/After Showcase - Two Rooms */}
          <div className="space-y-5">
            {/* Living Room Transformation */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground">Living Room</h3>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 rounded-xl overflow-hidden shadow-lg border border-border/50">
                  <img
                    src={beforeRoom}
                    alt="Cluttered living room"
                    loading="lazy"
                    decoding="async"
                    className="w-full aspect-[4/3] object-cover" />
                  <div className="absolute bottom-2 left-2 bg-destructive/90 text-destructive-foreground text-[10px] font-medium px-2 py-1 rounded-full">
                    Before
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/80 flex items-center justify-center shrink-0">
                  <ArrowRight className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="relative flex-1 rounded-xl overflow-hidden shadow-lg border border-primary/30">
                  <img
                    src={afterRoom}
                    alt="Organized living room"
                    loading="lazy"
                    decoding="async"
                    className="w-full aspect-[4/3] object-cover" />
                  <div className="absolute bottom-2 right-2 bg-primary text-primary-foreground text-[10px] font-medium px-2 py-1 rounded-full flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    After
                  </div>
                </div>
              </div>
            </div>

            {/* Bedroom Transformation */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground">Bedroom</h3>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 rounded-xl overflow-hidden shadow-lg border border-border/50">
                  <img
                    src={beforeBedroom}
                    alt="Cluttered bedroom"
                    loading="lazy"
                    decoding="async"
                    className="w-full aspect-[4/3] object-cover" />
                  <div className="absolute bottom-2 left-2 bg-destructive/90 text-destructive-foreground text-[10px] font-medium px-2 py-1 rounded-full">
                    Before
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/80 flex items-center justify-center shrink-0">
                  <ArrowRight className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="relative flex-1 rounded-xl overflow-hidden shadow-lg border border-primary/30">
                  <img
                    src={afterBedroom}
                    alt="Organized bedroom"
                    loading="lazy"
                    decoding="async"
                    className="w-full aspect-[4/3] object-cover" />
                  <div className="absolute bottom-2 right-2 bg-primary text-primary-foreground text-[10px] font-medium px-2 py-1 rounded-full flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    After
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CHANGE 3: Disclaimer below photos */}
          <p className="text-xs text-muted-foreground/50 text-center mt-2 px-4">
            AI-generated examples. Your actual results will vary — and that's totally fine.
          </p>

          {/* CHANGE 4: "Why it actually works" benefits section */}
          <div className="rounded-xl bg-background/60 backdrop-blur-sm border border-primary/20 p-4 space-y-2.5">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">
              Why it actually works
            </p>
            <ul className="space-y-2">
              {[
                "📍 AI looks at YOUR room and makes a plan — not a generic checklist",
                "⏱️ Tasks take 5 minutes or less — designed to beat ADHD paralysis",
                "🔥 Streaks and points that make starting feel good, not guilty",
                "📸 Save every before & after — proof that you're making progress",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-foreground/80">
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CHANGE 7: Urgency/momentum line at bottom */}
          <div className="text-center py-4 border-t border-border/40">
            <p className="text-sm text-muted-foreground">
              Takes 30 seconds to get your first task list.
            </p>
          </div>

        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile Header with mini showcase */}
          <div className="lg:hidden mb-6">
            <div className="text-center mb-5 px-4">
              <h1 className="font-black text-2xl leading-tight text-foreground mb-2">
                Turns out we don't hate cleaning.{" "}
                <span className="text-primary">We hate starting.</span>
              </h1>
            </div>
            <div className="flex justify-center gap-2 flex-wrap mb-4">
              {[
                { icon: '⚡', label: '5-min tasks' },
                { icon: '🧠', label: 'ADHD-friendly' },
                { icon: '✨', label: 'AI-powered' },
              ].map(f => (
                <div key={f.label}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                  <span>{f.icon}</span>
                  {f.label}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-destructive/30">
                <img src={beforeRoom} alt="Before" loading="lazy" decoding="async" className="w-full h-full object-cover" />
              </div>
              <ArrowRight className="w-3 h-3 text-primary" />
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-primary/30">
                <img src={afterRoom} alt="After" loading="lazy" decoding="async" className="w-full h-full object-cover" />
              </div>
              <div className="w-2" />
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-destructive/30">
                <img src={beforeBedroom} alt="Before" loading="lazy" decoding="async" className="w-full h-full object-cover" />
              </div>
              <ArrowRight className="w-3 h-3 text-primary" />
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-primary/30">
                <img src={afterBedroom} alt="After" loading="lazy" decoding="async" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <Leaf className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">TidyMate</h1>
            <p className="text-muted-foreground mt-2">
              Transform chaos into calm, one challenge at a time
            </p>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-1 pb-4">
              {/* CHANGE 5: Redesigned auth form header */}
              <CardTitle className="text-2xl text-center">
                {isLogin ? "Welcome back" : "Start for free"}
              </CardTitle>
              <CardDescription className="text-center">
                {isLogin
                  ? "Your streak is waiting for you."
                  : "No credit card. No overwhelm. Just one room."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="What should we call you?"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="h-12" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12" />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-medium"
                  disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      {isLogin ? "Signing in..." : "Creating account..."}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      {isLogin ? "Sign in" : "Create account"}
                    </span>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 text-base font-medium gap-2"
                  disabled={loading}
                  onClick={handleGoogleSignIn}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                {/* CHANGE 6: More prominent guest mode button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 text-base font-semibold border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 gap-2"
                  onClick={handleGuestMode}>
                  <Sparkles className="w-4 h-4" />
                  Try it without signing up
                </Button>
                <p className="text-xs text-muted-foreground/60 text-center -mt-2">
                  No account needed · see how it works first
                </p>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    const switchingToSignup = isLogin;
                    setIsLogin(!isLogin);
                    if (switchingToSignup) analytics.signupStarted();
                  }}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {isLogin
                    ? "Don't have an account? Sign up"
                    : "Already have an account? Sign in"}
                </button>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;

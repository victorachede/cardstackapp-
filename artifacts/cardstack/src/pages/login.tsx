import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Trophy, Zap } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

function CardStackLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 28" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="CardStack">
      <rect x="0" y="0" width="36" height="7" rx="2" fill="#6C63FF" />
      <rect x="0" y="10.5" width="18" height="7" rx="2" fill="#00D9A3" />
      <rect x="0" y="21" width="36" height="7" rx="2" fill="#6C63FF" />
      <circle cx="32" cy="3.5" r="2.5" fill="#00D9A3" />
    </svg>
  );
}

const features = [
  { icon: BookOpen, text: "300+ verified past questions" },
  { icon: Zap, text: "Spaced repetition algorithm" },
  { icon: Trophy, text: "Live leaderboard & XP system" },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    setIsLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Welcome back!");
      setLocation("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-[48%] relative overflow-hidden p-12"
        style={{ background: "linear-gradient(145deg, hsl(224 22% 9%) 0%, hsl(246 25% 13%) 100%)" }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-[500px] h-[500px] rounded-full blur-[120px] opacity-20"
            style={{ top: "10%", left: "20%", background: "radial-gradient(circle, #6C63FF, transparent 70%)" }} />
          <div className="absolute w-[280px] h-[280px] rounded-full blur-[80px] opacity-10"
            style={{ bottom: "20%", right: "10%", background: "radial-gradient(circle, #00D9A3, transparent 70%)" }} />
          <div className="absolute inset-0 opacity-[0.022]"
            style={{ backgroundImage: "linear-gradient(rgba(108,99,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(108,99,255,0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <CardStackLogo className="w-10 h-8" />
          <span className="font-display text-2xl text-white tracking-wide">CARDSTACK</span>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-primary/60 text-[10px] font-bold uppercase tracking-[0.35em] mb-4">Your exam prep partner</p>
            <h2 className="font-display text-6xl text-white leading-[0.95] mb-4">
              STUDY SMARTER.<br />
              <span style={{ WebkitTextStroke: "1.5px #6C63FF", color: "transparent" }}>SCORE HIGHER.</span>
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              Built for Nigerian students preparing for JAMB, WAEC, and NECO.
            </p>
          </div>
          <div className="space-y-3.5">
            {features.map((f, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i + 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
                  <f.icon className="w-4 h-4 text-primary" strokeWidth={1.75} />
                </div>
                <span className="text-sm text-foreground/75 font-medium">{f.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-muted-foreground/35 text-xs">© 2025 CardStack · Built for Nigerian exam success</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <CardStackLogo className="w-9 h-7" />
          <span className="font-display text-xl text-primary tracking-wide">CARDSTACK</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[360px]"
        >
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1.5">Welcome back</h1>
            <p className="text-muted-foreground text-sm">Sign in to continue your study session</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Email</label>
              <Input
                {...register("email")}
                type="email"
                placeholder="m.adebayo@example.com"
                className="h-11 bg-card border-border/80 focus:border-primary/60 rounded-xl transition-colors"
                data-testid="input-email"
              />
              {errors.email && <p className="text-xs text-destructive font-medium">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Password</label>
                <button type="button" className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">Forgot?</button>
              </div>
              <Input
                {...register("password")}
                type="password"
                placeholder="••••••••"
                className="h-11 bg-card border-border/80 focus:border-primary/60 rounded-xl transition-colors"
                data-testid="input-password"
              />
              {errors.password && <p className="text-xs text-destructive font-medium">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-bold bg-primary hover:bg-primary/90 text-white btn-sweep rounded-xl gap-2 text-sm mt-1"
              style={{ boxShadow: "0 0 24px hsl(246 100% 67% / 0.3)" }}
              disabled={isLoading}
              data-testid="button-submit"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            No account yet?{" "}
            <Link href="/signup" className="text-primary hover:text-primary/80 font-semibold transition-colors">Sign up free</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

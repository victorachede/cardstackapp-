import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const EXAM_TARGETS = ["JAMB", "WAEC", "NECO", "JAMB + WAEC", "JAMB + NECO", "All Exams"];

const signupSchema = z.object({
  full_name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  exam_target: z.string().min(1, { message: "Please select your exam target" }),
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

export default function Signup() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, control, formState: { errors } } = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: z.infer<typeof signupSchema>) => {
    setIsLoading(true);
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
          exam_target: data.exam_target,
        },
      },
    });
    if (error) {
      setIsLoading(false);
      toast.error(error.message);
      return;
    }
    if (authData?.user) {
      await supabase.from("profiles").upsert({
        user_id: authData.user.id,
        full_name: data.full_name,
        exam_target: data.exam_target,
        xp: 0,
        streak: 0,
        is_pro: false,
      });
    }
    setIsLoading(false);
    toast.success("Account created! Welcome to CardStack.");
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-[48%] relative overflow-hidden p-12"
        style={{ background: "linear-gradient(145deg, hsl(224 22% 9%) 0%, hsl(246 25% 13%) 100%)" }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-[500px] h-[500px] rounded-full blur-[120px] opacity-20"
            style={{ top: "5%", left: "25%", background: "radial-gradient(circle, #6C63FF, transparent 70%)" }} />
          <div className="absolute w-[280px] h-[280px] rounded-full blur-[80px] opacity-10"
            style={{ bottom: "15%", right: "10%", background: "radial-gradient(circle, #00D9A3, transparent 70%)" }} />
          <div className="absolute inset-0 opacity-[0.022]"
            style={{ backgroundImage: "linear-gradient(rgba(108,99,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(108,99,255,0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <CardStackLogo className="w-10 h-8" />
          <span className="font-display text-2xl text-white tracking-wide">CARDSTACK</span>
        </div>

        <div className="relative z-10">
          <p className="text-primary/60 text-[10px] font-bold uppercase tracking-[0.35em] mb-4">Join thousands of students</p>
          <h2 className="font-display text-6xl text-white leading-[0.95] mb-6">
            YOUR EXAM<br />
            <span style={{ WebkitTextStroke: "1.5px #6C63FF", color: "transparent" }}>STARTS HERE.</span>
          </h2>
          <div className="space-y-3">
            {[
              { num: "300+", label: "Past questions across JAMB, WAEC & NECO" },
              { num: "Free", label: "Start studying immediately, no credit card" },
              { num: "XP", label: "Earn points and climb the leaderboard" },
            ].map((item, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i + 0.3 }}
                className="flex items-center gap-4 p-3 rounded-xl border border-white/5 bg-white/[0.03]">
                <div className="font-display text-2xl text-primary leading-none w-12 shrink-0">{item.num}</div>
                <span className="text-sm text-muted-foreground font-medium">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-muted-foreground/35 text-xs">© 2025 CardStack · Built for Nigerian exam success</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <CardStackLogo className="w-9 h-7" />
          <span className="font-display text-xl text-primary tracking-wide">CARDSTACK</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[380px]"
        >
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1.5">Create your account</h1>
            <p className="text-muted-foreground text-sm">Free forever. No credit card needed.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Full Name</label>
              <Input
                {...register("full_name")}
                type="text"
                placeholder="Adebayo Johnson"
                className="h-11 bg-card border-border/80 focus:border-primary/60 rounded-xl transition-colors"
              />
              {errors.full_name && <p className="text-xs text-destructive font-medium">{errors.full_name.message}</p>}
            </div>

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
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Password</label>
              <Input
                {...register("password")}
                type="password"
                placeholder="Min. 8 characters"
                className="h-11 bg-card border-border/80 focus:border-primary/60 rounded-xl transition-colors"
                data-testid="input-password"
              />
              {errors.password && <p className="text-xs text-destructive font-medium">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Target Exam</label>
              <Controller
                name="exam_target"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <div className="grid grid-cols-3 gap-2">
                    {EXAM_TARGETS.map((exam) => (
                      <button
                        key={exam}
                        type="button"
                        onClick={() => field.onChange(exam)}
                        className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all ${
                          field.value === exam
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border/60 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        {exam}
                      </button>
                    ))}
                  </div>
                )}
              />
              {errors.exam_target && <p className="text-xs text-destructive font-medium">{errors.exam_target.message}</p>}
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
                <>Create Account <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already a member?{" "}
            <Link href="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors">Sign in</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

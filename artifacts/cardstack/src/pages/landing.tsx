import { Link } from "wouter";
import { BookOpen, Zap, Trophy, BarChart3, Brain, Cpu, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";

/* ─── Helpers ─── */

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

function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = to / 60;
    const t = setInterval(() => {
      start = Math.min(start + step, to);
      setCount(Math.round(start));
      if (start >= to) clearInterval(t);
    }, 18);
    return () => clearInterval(t);
  }, [inView, to]);
  return <span ref={ref}>{count}{suffix}</span>;
}

function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(700px) rotateX(${-y * 9}deg) rotateY(${x * 9}deg) translateZ(10px)`;
    el.style.boxShadow = `${-x * 12}px ${y * -12}px 40px hsl(245 100% 69% / 0.15)`;
  }, []);
  const onLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transform = "";
    ref.current.style.boxShadow = "";
  }, []);
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      className={`transition-transform duration-150 ease-out ${className}`}
      style={{ transformStyle: "preserve-3d" }}>
      {children}
    </div>
  );
}

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.11 } } };
const slideUp: import("framer-motion").Variants = { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } } };

function RevealSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.12 });
  return (
    <motion.div ref={ref} variants={stagger} initial="hidden" animate={inView ? "visible" : "hidden"} className={className}>
      {children}
    </motion.div>
  );
}

/* ─── Landing Page ─── */

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const features = [
    { icon: BookOpen, title: "Spaced Repetition", desc: "The SM-2 algorithm shows cards right before you forget — study less, remember more.", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
    { icon: Brain, title: "Mock CBT", desc: "Full 60-question timed simulation that mirrors the real JAMB/WAEC interface.", color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
    { icon: Zap, title: "Past Questions", desc: "300+ verified past questions across JAMB, WAEC and NECO with full explanations.", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    { icon: Trophy, title: "Leaderboard", desc: "Compete with students nationwide. Earn XP, climb ranks, become a Legend.", color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
    { icon: BarChart3, title: "Progress Tracking", desc: "Streak, XP level, per-subject performance — know exactly where to focus next.", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    { icon: Cpu, title: "AI Features (PRO)", desc: "Smart study plans, AI card generation, personalised revision — coming soon.", color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
  ];

  const exams = [
    { name: "JAMB", sub: "UTME", color: "border-primary/50 text-primary bg-primary/8" },
    { name: "WAEC", sub: "SSCE", color: "border-primary/50 text-primary bg-primary/8" },
    { name: "NECO", sub: "SSCE", color: "border-amber-500/50 text-amber-300 bg-amber-500/8" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 px-4 sm:px-8 py-4 flex items-center justify-between ${
        navScrolled ? "bg-background/80 backdrop-blur-xl border-b border-white/6" : ""
      }`}>
        <div className="flex items-center gap-2.5">
          <CardStackLogo className="w-9 h-7" />
          <span className="font-display text-xl text-primary tracking-wide">CARDSTACK</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white">Sign In</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" className="font-bold btn-sweep gap-1.5 bg-primary hover:bg-primary/90">
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">

        {/* Orbs */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <motion.div
            className="absolute w-[700px] h-[700px] rounded-full blur-[120px] opacity-20"
            style={{ top: "10%", left: "30%", background: "radial-gradient(circle, hsl(38 92% 50% / 0.15), transparent 70%)" }}
            animate={{ scale: [1, 1.15, 1], x: [-30, 30, -30] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-15"
            style={{ bottom: "10%", right: "20%", background: "radial-gradient(circle, hsl(38 92% 50% / 0.08), transparent 70%)" }}
            animate={{ scale: [1, 1.2, 1], y: [-20, 20, -20] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          <motion.div
            className="absolute w-[350px] h-[350px] rounded-full blur-[80px] opacity-10"
            style={{ top: "40%", right: "5%", background: "radial-gradient(circle, hsl(38 92% 50% / 0.15), transparent 70%)" }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </div>

        {/* Subtle grid overlay */}
        <div className="absolute inset-0 -z-10 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(rgba(245,166,35,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(245,166,35,0.06) 1px, transparent 1px)", backgroundSize: "80px 80px" }} />

        {/* Hero content */}
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 text-center px-4 sm:px-6 pt-24 pb-16"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-primary/12 border border-primary/30 rounded-full px-4 py-1.5 text-xs font-semibold text-primary/90 mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D9A3] animate-pulse" />
            Built for Nigerian students · Free to start
          </motion.div>

          {/* Main headline */}
          <div className="space-y-0 mb-8">
            <motion.h1
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-[72px] sm:text-[108px] md:text-[130px] lg:text-[160px] leading-[0.9] text-white block"
            >
              MASTER YOUR
            </motion.h1>
            <motion.h1
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-[72px] sm:text-[108px] md:text-[130px] lg:text-[160px] leading-[0.9] block"
              style={{ WebkitTextStroke: "2px hsl(245 100% 69%)", color: "transparent" }}
            >
              EXAMS WITH
            </motion.h1>
            <motion.h1
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.44, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-[72px] sm:text-[108px] md:text-[130px] lg:text-[160px] leading-[0.9] text-primary block"
            >
              CARDSTACK
            </motion.h1>
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.58 }}
            className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed"
          >
            Intelligent flashcards, spaced repetition, and 300+ past questions —<br className="hidden sm:block" />
            everything you need to crush JAMB, WAEC and NECO.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.68 }}
            className="flex flex-col sm:flex-row gap-3 justify-center mb-10"
          >
            <Link href="/signup">
              <Button className="h-13 px-10 font-bold text-base sm:text-lg bg-primary hover:bg-primary/90 btn-sweep shadow-lg shadow-primary/25 w-full sm:w-auto gap-2">
                Start Free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="h-13 px-10 font-semibold text-base sm:text-lg border-white/20 hover:bg-white/5 hover:border-white/30 btn-sweep w-full sm:w-auto text-white">
                Sign In
              </Button>
            </Link>
          </motion.div>

          {/* Exam pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex flex-wrap justify-center gap-3"
          >
            {exams.map(e => (
              <div key={e.name} className={`flex items-center gap-2 border rounded-full px-5 py-2 text-sm font-bold ${e.color}`}
                style={{ boxShadow: "0 0 20px rgba(108,99,255,0.12)" }}>
                {e.name}
                <span className="text-xs opacity-60 font-normal">{e.sub}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Scroll</span>
          <motion.div className="w-0.5 h-8 bg-gradient-to-b from-primary/60 to-transparent rounded-full"
            animate={{ scaleY: [1, 0.4, 1], opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} />
        </motion.div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <motion.div variants={slideUp} className="text-center mb-16">
              <p className="text-[#00D9A3] text-xs font-bold uppercase tracking-[0.3em] mb-4">How it works</p>
              <h2 className="font-display text-5xl sm:text-7xl md:text-8xl text-white">THREE STEPS TO<br className="hidden sm:block" /> EXAM DAY</h2>
            </motion.div>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                { num: "01", title: "BUILD YOUR DECK", body: "Create flashcard decks for any subject or pull from the 300+ past questions bank directly." },
                { num: "02", title: "STUDY SMART", body: "The SM-2 algorithm schedules each card so you study it exactly when you're about to forget it." },
                { num: "03", title: "SIMULATE EXAM DAY", body: "Full timed mock CBTs in JAMB, WAEC or NECO format — feel ready before you walk in." },
              ].map((s, i) => (
                <motion.div key={i} variants={slideUp}
                  className="relative p-8 rounded-2xl border border-white/6 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 group overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="font-display text-[80px] leading-none text-white/5 mb-4 select-none">{s.num}</div>
                  <h3 className="font-display text-2xl text-white mb-3">{s.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{s.body}</p>
                </motion.div>
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ── FEATURES BENTO ── */}
      <section className="py-24 sm:py-32 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <RevealSection>
            <motion.div variants={slideUp} className="mb-16">
              <p className="text-primary text-xs font-bold uppercase tracking-[0.3em] mb-4">Features</p>
              <h2 className="font-display text-5xl sm:text-7xl md:text-8xl text-white">EVERYTHING<br className="hidden sm:block" /> YOU NEED</h2>
            </motion.div>
            <motion.div variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <motion.div key={i} variants={slideUp}>
                    <TiltCard className={`h-full p-6 rounded-2xl border bg-card/60 backdrop-blur-sm ${f.border} hover:border-opacity-60 transition-all duration-300 overflow-hidden relative group cursor-default`}>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ background: `radial-gradient(ellipse at top left, ${f.color.replace('text-', '')} 0%, transparent 60%)`, opacity: 0.04 }} />
                      <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center mb-5`}>
                        <Icon className={`w-5 h-5 ${f.color}`} strokeWidth={1.5} />
                      </div>
                      <h3 className={`font-display text-2xl text-white mb-2`}>{f.title.toUpperCase()}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                    </TiltCard>
                  </motion.div>
                );
              })}
            </motion.div>
          </RevealSection>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
          <motion.div
            className="absolute inset-0 opacity-5"
            style={{ background: "radial-gradient(ellipse at center, hsl(38 92% 50% / 0.12), transparent 60%)" }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="max-w-4xl mx-auto">
          <RevealSection>
            <motion.div variants={slideUp} className="text-center mb-16">
              <h2 className="font-display text-5xl sm:text-7xl text-white">BY THE NUMBERS</h2>
            </motion.div>
            <motion.div variants={stagger} className="grid grid-cols-3 gap-6 sm:gap-12 text-center">
              {[
                { to: 300, suffix: "+", label: "Past Questions", sub: "JAMB, WAEC & NECO" },
                { to: 10, suffix: "", label: "Subjects", sub: "All core exam subjects" },
                { to: 3, suffix: "", label: "Major Exams", sub: "Full mock simulations" },
              ].map((s, i) => (
                <motion.div key={i} variants={slideUp} className="space-y-2">
                  <div className="font-display text-4xl sm:text-6xl md:text-7xl text-primary">
                    <CountUp to={s.to} suffix={s.suffix} />
                  </div>
                  <p className="text-white font-semibold text-sm sm:text-base">{s.label}</p>
                  <p className="text-muted-foreground text-xs sm:text-sm">{s.sub}</p>
                </motion.div>
              ))}
            </motion.div>
          </RevealSection>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 sm:py-32 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <RevealSection>
            <motion.div variants={slideUp} className="relative p-12 sm:p-20 rounded-3xl border border-primary/20 bg-card/60 backdrop-blur-sm overflow-hidden">
              <div className="absolute inset-0 -z-10 opacity-30"
                style={{ background: "radial-gradient(ellipse at center bottom, #6C63FF, transparent 60%)" }} />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <CardStackLogo className="w-12 h-9 mx-auto mb-6 opacity-80" />
              <h2 className="font-display text-5xl sm:text-7xl text-white mb-4">START SCORING<br />HIGHER TODAY</h2>
              <p className="text-muted-foreground text-base sm:text-lg mb-10 max-w-lg mx-auto">
                Join students across Nigeria already using CardStack to prepare smarter, study faster, and score higher.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/signup">
                  <Button className="h-13 px-10 font-bold text-base bg-primary hover:bg-primary/90 btn-sweep shadow-xl shadow-primary/30 w-full sm:w-auto gap-2 glow-primary">
                    Create Free Account <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" className="h-13 px-8 font-semibold text-base border-white/20 hover:bg-white/5 btn-sweep w-full sm:w-auto text-white">
                    Already a member?
                  </Button>
                </Link>
              </div>
            </motion.div>
          </RevealSection>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/6 py-10 px-4 sm:px-6 text-center">
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <CardStackLogo className="w-7 h-5 opacity-60" />
          <span className="font-display text-base text-muted-foreground tracking-wide">CARDSTACK</span>
        </div>
        <p className="text-muted-foreground text-xs">© 2025 CardStack. Built for Nigerian exam success.</p>
      </footer>

    </div>
  );
}

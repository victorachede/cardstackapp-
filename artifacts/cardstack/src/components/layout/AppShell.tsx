import { useLocation } from "wouter";
import {
  Home, BookOpen, Zap, MessageCircle, MoreHorizontal,
  Layers, Store, Trophy, Users, User, Crown, X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Logo ─────────────────────────────────────────────────────────────────────

function CardStackLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 28" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="CardStack">
      <rect x="0"  y="0"    width="36" height="7" rx="2" fill="#6C63FF" />
      <rect x="0"  y="10.5" width="18" height="7" rx="2" fill="#00D9A3" />
      <rect x="0"  y="21"   width="36" height="7" rx="2" fill="#6C63FF" />
      <circle cx="32" cy="3.5" r="2.5" fill="#00D9A3" />
    </svg>
  );
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { href: "/dashboard",      icon: Home,          label: "Home"     },
  { href: "/past-questions", icon: BookOpen,      label: "Practice" },
  { href: "/mock",           icon: Zap,           label: "Mock"     },
  { href: "/social",         icon: MessageCircle, label: "Social"   },
  { href: "#more",           icon: MoreHorizontal,label: "More"     },
] as const;

const MORE_ITEMS = [
  { href: "/decks",       icon: Layers,  label: "My Decks",    color: "text-primary",    bg: "bg-primary/10"    },
  { href: "/marketplace", icon: Store,   label: "Marketplace", color: "text-violet-400", bg: "bg-violet-500/10" },
  { href: "/leaderboard", icon: Trophy,  label: "Leaderboard", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { href: "/rooms",       icon: Users,   label: "Rooms",       color: "text-sky-400",    bg: "bg-sky-500/10"    },
  { href: "/profile",     icon: User,    label: "Profile",     color: "text-emerald-400",bg: "bg-emerald-500/10"},
  { href: "/upgrade",     icon: Crown,   label: "Go PRO",      color: "text-amber-400",  bg: "bg-amber-500/10"  },
];

// ─── AppShell ─────────────────────────────────────────────────────────────────

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [scrolled, setScrolled]   = useState(false);
  const [moreOpen, setMoreOpen]   = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // ── Profile query ──────────────────────────────────────────────────────────

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  // ── Scroll shadow ──────────────────────────────────────────────────────────

  useEffect(() => {
    const onScroll     = () => setScrolled(window.scrollY > 10);
    const mainEl       = document.querySelector("main");
    const onMainScroll = () => setScrolled((mainEl?.scrollTop ?? 0) > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    mainEl?.addEventListener("scroll", onMainScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      mainEl?.removeEventListener("scroll", onMainScroll);
    };
  }, []);

  // ── Close More sheet on outside tap ───────────────────────────────────────

  useEffect(() => {
    if (!moreOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMoreOpen(false); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [moreOpen]);

  // ── Active tab detection ───────────────────────────────────────────────────

  const activeTab = TABS.find(t =>
    t.href !== "#more" && (location === t.href || location.startsWith(t.href + "/"))
  )?.href ?? null;

  const moreIsActive = MORE_ITEMS.some(
    m => location === m.href || location.startsWith(m.href + "/")
  );

  // ── More nav handler ───────────────────────────────────────────────────────

  const handleMoreItem = (href: string) => {
    setMoreOpen(false);
    setTimeout(() => setLocation(href), 120);
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">

      {/* ── Top header ─────────────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-30 transition-all duration-300 px-4 py-3 flex items-center justify-between ${
          scrolled
            ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <CardStackLogo className="w-9 h-7" />
          <span className="font-display text-xl text-primary tracking-wide leading-none">CARDSTACK</span>
        </div>

        {profile && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1">
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                <path d="M12 2C12 2 5 9 5 14a7 7 0 0014 0C19 9 12 2 12 2Z" fill="#F97316" />
                <path d="M12 8c0 0-3 4-3 6a3 3 0 006 0C15 12 12 8 12 8Z" fill="#FED7AA" />
              </svg>
              <span className="text-orange-400 text-xs font-bold">{profile.streak}</span>
            </div>
            <div className="bg-primary/15 border border-primary/25 rounded-full px-3 py-1">
              <span className="text-primary text-xs font-bold">{profile.xp} XP</span>
            </div>
          </div>
        )}
      </header>

      {/* ── Page content ───────────────────────────────────────────────────── */}
      <main className="p-4 max-w-2xl mx-auto">{children}</main>

      {/* ── More sheet backdrop ────────────────────────────────────────────── */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── More bottom sheet ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            ref={sheetRef}
            key="sheet"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.9 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto"
          >
            {/* Sheet card */}
            <div className="bg-card/95 backdrop-blur-2xl border border-border/60 rounded-t-[32px] pt-3 pb-10 px-5 shadow-2xl shadow-black/60">
              {/* Drag handle */}
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-5" />

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold tracking-tight">More</h2>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-3 gap-3">
                {MORE_ITEMS.map((item) => {
                  const isActive = location === item.href || location.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <motion.button
                      key={item.href}
                      whileTap={{ scale: 0.93 }}
                      transition={{ type: "spring", stiffness: 500, damping: 22 }}
                      onClick={() => handleMoreItem(item.href)}
                      className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl border transition-all ${
                        isActive
                          ? "border-primary/40 bg-primary/10"
                          : "border-border/50 bg-background/60 hover:border-border active:bg-muted/50"
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${item.bg}`}>
                        <Icon className={`w-5 h-5 ${isActive ? "text-primary" : item.color}`} strokeWidth={1.75} />
                      </div>
                      <span className={`text-xs font-semibold leading-tight text-center ${isActive ? "text-primary" : "text-foreground"}`}>
                        {item.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── iOS floating tab bar ───────────────────────────────────────────── */}
      <div className="fixed bottom-5 left-0 right-0 z-30 flex justify-center px-6 pointer-events-none">
        <nav
          className="pointer-events-auto flex items-center gap-1 px-2 py-2 rounded-[28px] shadow-2xl shadow-black/50"
          style={{
            background: "hsl(var(--card) / 0.85)",
            backdropFilter: "blur(32px) saturate(180%)",
            WebkitBackdropFilter: "blur(32px) saturate(180%)",
            border: "1px solid hsl(var(--border) / 0.6)",
          }}
        >
          {TABS.map((tab) => {
            const isMore  = tab.href === "#more";
            const isActive = isMore
              ? moreOpen || moreIsActive
              : activeTab === tab.href;
            const Icon = tab.icon;

            return (
              <motion.button
                key={tab.href}
                whileTap={{ scale: 0.84 }}
                transition={{ type: "spring", stiffness: 600, damping: 22 }}
                onClick={() => {
                  if (isMore) {
                    setMoreOpen(o => !o);
                  } else {
                    setMoreOpen(false);
                    setLocation(tab.href);
                  }
                }}
                className="relative flex items-center rounded-[20px] select-none cursor-pointer focus:outline-none"
                style={{ minWidth: 48 }}
                data-testid={`nav-${tab.label.toLowerCase()}`}
                aria-label={tab.label}
              >
                {/* Animated pill background */}
                {isActive && (
                  <motion.div
                    layoutId="ios-tab-bubble"
                    className="absolute inset-0 rounded-[20px]"
                    style={{ background: "hsl(var(--primary) / 0.16)" }}
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}

                <AnimatePresence mode="wait" initial={false}>
                  {isActive ? (
                    /* Active — icon + label side by side */
                    <motion.span
                      key="active"
                      initial={{ opacity: 0, width: 48 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 48 }}
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      className="relative flex items-center gap-1.5 px-3.5 py-2.5 overflow-hidden"
                    >
                      <Icon
                        className="w-[18px] h-[18px] shrink-0 text-primary"
                        strokeWidth={2.4}
                      />
                      <motion.span
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -4 }}
                        transition={{ delay: 0.04, duration: 0.18 }}
                        className="text-[11px] font-bold text-primary whitespace-nowrap leading-none tracking-wide"
                      >
                        {tab.label}
                      </motion.span>
                    </motion.span>
                  ) : (
                    /* Inactive — icon only */
                    <motion.span
                      key="inactive"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.14 }}
                      className="relative flex items-center justify-center w-12 h-[42px]"
                    >
                      <Icon
                        className="w-[18px] h-[18px] text-muted-foreground"
                        strokeWidth={1.75}
                      />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

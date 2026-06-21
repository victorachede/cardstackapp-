import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, Flame, Medal, School, MapPin, Crown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

type Tab = "global" | "school" | "state";

const slideUp: import("framer-motion").Variants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } };

function RankBadge({ index }: { index: number }) {
  if (index === 0) return <Medal className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]" />;
  if (index === 1) return <Medal className="w-5 h-5 text-slate-300 drop-shadow-sm" />;
  if (index === 2) return <Medal className="w-5 h-5 text-amber-700 drop-shadow-sm" />;
  return <span className="font-mono font-bold text-muted-foreground text-sm w-5 text-center">{index + 1}</span>;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("global");
  const [claimModal, setClaimModal] = useState(false);

  const { data: globalLeaders, isLoading: globalLoading } = useQuery({
    queryKey: ["leaderboard_global"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, xp, weekly_xp, streak, exam_target, school")
        .order("weekly_xp", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const { data: schoolLeaders, isLoading: schoolLoading } = useQuery({
    queryKey: ["leaderboard_school"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("school, xp")
        .not("school", "is", null)
        .not("school", "eq", "");

      if (!data) return [];

      // Aggregate by school
      const map = new Map<string, { school: string; totalXP: number; count: number }>();
      for (const p of data) {
        if (!p.school) continue;
        const s = map.get(p.school) || { school: p.school, totalXP: 0, count: 0 };
        s.totalXP += p.xp || 0;
        s.count += 1;
        map.set(p.school, s);
      }
      return Array.from(map.values())
        .map(s => ({ ...s, avgXP: Math.round(s.totalXP / s.count) }))
        .sort((a, b) => b.avgXP - a.avgXP)
        .slice(0, 10);
    },
    enabled: tab === "school",
  });

  const { data: stateLeaders, isLoading: stateLoading } = useQuery({
    queryKey: ["leaderboard_state"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("state, full_name, xp, streak")
        .not("state", "is", null)
        .not("state", "eq", "")
        .order("xp", { ascending: false })
        .limit(100);

      if (!data) return [];

      // Group by state, show top student per state
      const map = new Map<string, any>();
      for (const p of data) {
        if (!p.state) continue;
        if (!map.has(p.state)) map.set(p.state, { state: p.state, topName: p.full_name, topXP: p.xp, count: 0 });
        const s = map.get(p.state)!;
        s.count += 1;
      }
      return Array.from(map.values()).sort((a, b) => b.topXP - a.topXP).slice(0, 20);
    },
    enabled: tab === "state",
  });

  // Weekly top 3 (from global, first 3)
  const weeklyTop3 = (globalLeaders || []).slice(0, 3);
  const isLoading = tab === "global" ? globalLoading : tab === "school" ? schoolLoading : stateLoading;

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "global", label: "Global", icon: Trophy },
    { id: "school", label: "School", icon: School },
    { id: "state",  label: "State",  icon: MapPin },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 py-2">

      <div>
        <h1 className="font-display text-4xl text-white">LEADERBOARD</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Weekly rankings — resets every Monday.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/4 rounded-xl border border-white/6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${tab === t.id ? "bg-primary text-white" : "text-muted-foreground hover:text-white"}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ── WEEKLY PRIZE (global only) ── */}
      {tab === "global" && weeklyTop3.length > 0 && (
        <div className="p-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-bold text-white">This week's top 3 win airtime prizes</span>
            </div>
            <Button size="sm" onClick={() => setClaimModal(true)}
              className="text-[10px] h-7 px-3 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30 btn-sweep">
              Claim Prize
            </Button>
          </div>
          <div className="flex gap-2">
            {weeklyTop3.map((p: any, i: number) => (
              <div key={p.user_id} className="flex-1 text-center p-2 rounded-xl bg-white/4">
                <RankBadge index={i} />
                <div className="text-xs font-semibold text-white mt-1 truncate">{p.full_name?.split(" ")[0]}</div>
                <div className="text-[10px] text-primary font-bold">{p.xp?.toLocaleString()} XP</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── GLOBAL ── */}
      {tab === "global" && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-2">
          {isLoading ? (
            Array(8).fill(0).map((_, i) => <div key={i} className="h-16 bg-white/4 rounded-2xl animate-pulse" style={{ animationDelay: `${i * 0.05}s` }} />)
          ) : (globalLeaders || []).map((profile: any, index: number) => {
            const isMe = profile.user_id === user?.id;
            return (
              <motion.div key={profile.user_id} variants={slideUp}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${isMe ? "border-primary/40 bg-primary/8 shadow-[0_0_20px_rgba(108,99,255,0.1)]" : "border-white/6 bg-card/40 hover:border-white/12"}`}>
                <div className="flex items-center justify-center w-8 shrink-0">
                  <RankBadge index={index} />
                </div>
                <Avatar className="h-9 w-9 border border-white/10 shrink-0">
                  <AvatarFallback className="bg-primary/15 text-primary font-bold text-xs">
                    {profile.full_name?.substring(0, 2).toUpperCase() || "??"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`font-semibold text-sm truncate ${isMe ? "text-primary" : "text-white"}`}>
                      {profile.full_name || "Unknown Scholar"}
                    </p>
                    {isMe && <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">You</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-bold text-xs text-primary">{(profile.weekly_xp ?? profile.xp ?? 0).toLocaleString()} XP this week</span>
                    {profile.exam_target && <Badge variant="outline" className="text-[9px] py-0 border-white/12 text-muted-foreground">{profile.exam_target}</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-orange-500/10 px-2 py-1 rounded-full shrink-0">
                  <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                  <span className="font-bold text-xs text-orange-500">{profile.streak}</span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* ── SCHOOL ── */}
      {tab === "school" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Ranked by average XP of all students from each school.</p>
          {isLoading ? (
            Array(5).fill(0).map((_, i) => <div key={i} className="h-16 bg-white/4 rounded-2xl animate-pulse" />)
          ) : (!schoolLeaders || schoolLeaders.length === 0) ? (
            <div className="text-center py-10 space-y-2">
              <School className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <div className="font-display text-2xl text-white/30">NO SCHOOL DATA</div>
              <p className="text-sm text-muted-foreground">Add your school in Profile → Settings to appear here.</p>
            </div>
          ) : schoolLeaders.map((s: any, i: number) => (
            <motion.div key={s.school} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-4 rounded-2xl border border-white/6 bg-card/40">
              <div className="flex items-center justify-center w-8 shrink-0"><RankBadge index={i} /></div>
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <School className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-white truncate">{s.school}</div>
                <div className="text-xs text-muted-foreground">{s.count} student{s.count !== 1 ? "s" : ""}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display text-xl text-primary">{s.avgXP?.toLocaleString()}</div>
                <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Avg XP</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── STATE ── */}
      {tab === "state" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Top-ranked student per Nigerian state.</p>
          {isLoading ? (
            Array(6).fill(0).map((_, i) => <div key={i} className="h-14 bg-white/4 rounded-2xl animate-pulse" />)
          ) : (!stateLeaders || stateLeaders.length === 0) ? (
            <div className="text-center py-10 space-y-2">
              <MapPin className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <div className="font-display text-2xl text-white/30">NO STATE DATA</div>
              <p className="text-sm text-muted-foreground">Add your state during signup to appear here.</p>
            </div>
          ) : stateLeaders.map((s: any, i: number) => (
            <motion.div key={s.state} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 p-3 rounded-xl border border-white/6 bg-card/40">
              <span className="text-sm font-mono font-bold text-muted-foreground/60 w-6 text-right shrink-0">{i + 1}</span>
              <MapPin className="w-4 h-4 text-[#00D9A3] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-white">{s.state}</div>
                <div className="text-xs text-muted-foreground">Top: {s.topName} — {s.topXP?.toLocaleString()} XP</div>
              </div>
              <Badge variant="outline" className="text-[10px] border-white/12 text-muted-foreground shrink-0">{s.count} student{s.count !== 1 ? "s" : ""}</Badge>
            </motion.div>
          ))}
        </div>
      )}

      {/* Claim prize modal */}
      <Dialog open={claimModal} onOpenChange={setClaimModal}>
        <DialogContent className="bg-card border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-white">CLAIM YOUR PRIZE</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 space-y-2">
              <Crown className="w-6 h-6 text-yellow-400" />
              <p className="font-bold text-white">Prize Claiming — Coming Soon</p>
              <p className="text-sm text-muted-foreground">Weekly leaderboard winners will be contacted via their registered email. Top 3 students each week win airtime prizes.</p>
            </div>
            <Button className="w-full opacity-60 cursor-not-allowed" disabled>Prizes — Coming Soon</Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

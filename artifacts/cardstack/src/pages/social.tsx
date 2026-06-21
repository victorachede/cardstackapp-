import { useAuth } from "@/contexts/AuthContext";
import { supabase, getLevel } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  UserPlus, UserCheck, MessageCircle, Activity, Users,
  Trophy, Flame, Zap, BookOpen, ChevronLeft, Send, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";

type Tab = "feed" | "people" | "messages";

const ACTIVITY_ICONS: Record<string, any> = {
  mock_complete: Trophy,
  deck_mastered: BookOpen,
  streak_milestone: Flame,
  level_up: Zap,
  deck_created: BookOpen,
};

const ACTIVITY_COLORS: Record<string, string> = {
  mock_complete: "text-yellow-400",
  deck_mastered: "text-[#00D9A3]",
  streak_milestone: "text-orange-400",
  level_up: "text-primary",
  deck_created: "text-blue-400",
};

function timeAgo(date: string) {
  const d = (Date.now() - new Date(date).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export default function Social() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("feed");
  const [activeDM, setActiveDM] = useState<any>(null);
  const [msgInput, setMsgInput] = useState("");
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);

  // People search
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user?.id).single();
      return data;
    },
    enabled: !!user,
  });

  // Following list
  const { data: following } = useQuery({
    queryKey: ["following", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("follows").select("following_id").eq("follower_id", user?.id);
      return (data || []).map((f: any) => f.following_id) as string[];
    },
    enabled: !!user,
  });

  // Activity feed from people I follow
  const { data: feed } = useQuery({
    queryKey: ["activity_feed", user?.id, following],
    queryFn: async () => {
      if (!following || following.length === 0) return [];
      const { data } = await supabase
        .from("activity_feed")
        .select("*, profiles!activity_feed_user_id_fkey(full_name, xp)")
        .in("user_id", following)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user && !!following,
  });

  // DM conversations
  const { data: conversations } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*, sender:profiles!messages_sender_id_fkey(full_name), receiver:profiles!messages_receiver_id_fkey(full_name)")
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: unreadCount } = useQuery({
    queryKey: ["unread_dms", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("messages").select("*", { count: "exact", head: true })
        .eq("receiver_id", user?.id).eq("read", false);
      return count ?? 0;
    },
    enabled: !!user,
  });

  // Active DM messages
  const { data: dmMessages } = useQuery({
    queryKey: ["dm_messages", activeDM?.id],
    queryFn: async () => {
      const other = activeDM.sender_id === user?.id ? activeDM.receiver_id : activeDM.sender_id;
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${other}),and(sender_id.eq.${other},receiver_id.eq.${user?.id})`)
        .order("created_at");
      return data || [];
    },
    enabled: !!activeDM,
  });

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async (targetId: string) => {
      const isFollowing = following?.includes(targetId);
      if (isFollowing) {
        await supabase.from("follows").delete().eq("follower_id", user?.id).eq("following_id", targetId);
      } else {
        await supabase.from("follows").insert({ follower_id: user?.id, following_id: targetId });
        // Log activity
        await supabase.from("activity_feed").insert({ user_id: user?.id, type: "followed_user", metadata: { target_id: targetId } });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["following", user?.id] }),
    onError: () => toast.error("Couldn't update follow — Supabase tables may need setup"),
  });

  // Send DM
  const sendDM = useMutation({
    mutationFn: async ({ receiverId, content }: { receiverId: string; content: string }) => {
      const { data, error } = await supabase.from("messages").insert({
        sender_id: user?.id, receiver_id: receiverId, content, read: false,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setLocalMessages(p => [...p, data]);
      setMsgInput("");
      queryClient.invalidateQueries({ queryKey: ["dm_messages", activeDM?.id] });
    },
    onError: () => {
      // Optimistic fallback for demo
      setLocalMessages(p => [...p, { id: Date.now(), sender_id: user?.id, content: msgInput, created_at: new Date().toISOString() }]);
      setMsgInput("");
    },
  });

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [dmMessages, localMessages]);

  const handleSearch = async (q: string) => {
    setSearchQ(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase.from("profiles").select("user_id, full_name, xp, streak, exam_target")
      .ilike("full_name", `%${q}%`).neq("user_id", user?.id).limit(10);
    setSearchResults(data || []);
    setSearching(false);
  };

  // DM overlay
  if (activeDM) {
    const otherId = activeDM.sender_id === user?.id ? activeDM.receiver_id : activeDM.sender_id;
    const otherName = activeDM.sender_id === user?.id ? activeDM.receiver?.full_name : activeDM.sender?.full_name;
    const allMessages = [...(dmMessages || []), ...localMessages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return (
      <div className="flex flex-col h-[calc(100vh-5rem)]">
        <div className="shrink-0 flex items-center gap-3 py-3">
          <button onClick={() => { setActiveDM(null); setLocalMessages([]); }} className="text-muted-foreground hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/20 text-primary text-xs">{otherName?.substring(0, 2)}</AvatarFallback></Avatar>
          <div>
            <div className="font-semibold text-sm text-white">{otherName}</div>
            <div className="w-1.5 h-1.5 rounded-full bg-[#00D9A3] inline-block" />
          </div>
        </div>
        <div ref={chatRef} className="flex-1 overflow-y-auto space-y-3 py-2">
          {allMessages.length === 0 && <p className="text-center text-muted-foreground text-sm py-10">Say hi 👋</p>}
          {allMessages.map((m: any) => {
            const isMine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isMine ? "bg-primary text-white rounded-br-sm" : "bg-card/80 border border-white/8 text-white rounded-bl-sm"}`}>
                  {m.content}
                </div>
              </div>
            );
          })}
        </div>
        <div className="shrink-0 pb-2 flex gap-2">
          <Input value={msgInput} onChange={e => setMsgInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && msgInput.trim() && sendDM.mutate({ receiverId: otherId, content: msgInput })}
            placeholder="Message…" className="bg-white/5 border-white/10 text-white" />
          <Button onClick={() => msgInput.trim() && sendDM.mutate({ receiverId: otherId, content: msgInput })}
            disabled={!msgInput.trim()} className="shrink-0 btn-sweep">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Dedupe conversations
  const convMap = new Map<string, any>();
  for (const m of (conversations || [])) {
    const other = m.sender_id === user?.id ? m.receiver_id : m.sender_id;
    if (!convMap.has(other)) convMap.set(other, m);
  }
  const convList = Array.from(convMap.values());

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 py-2">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-4xl text-white">SOCIAL</h1>
        {unreadCount !== undefined && unreadCount > 0 && (
          <div className="flex items-center gap-1.5 bg-primary/15 border border-primary/25 rounded-full px-3 py-1">
            <MessageCircle className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-primary">{unreadCount} unread</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/4 rounded-xl border border-white/6">
        {(["feed", "people", "messages"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all capitalize ${tab === t ? "bg-primary text-white" : "text-muted-foreground hover:text-white"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── FEED ── */}
      {tab === "feed" && (
        <div className="space-y-3">
          {(!following || following.length === 0) && (
            <div className="text-center py-10 space-y-3">
              <Users className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <div className="font-display text-2xl text-white/30">NO ACTIVITY YET</div>
              <p className="text-sm text-muted-foreground">Follow other students to see their activity here.</p>
              <Button size="sm" onClick={() => setTab("people")} className="btn-sweep">Find Students</Button>
            </div>
          )}
          {feed && feed.length === 0 && following && following.length > 0 && (
            <div className="text-center py-10">
              <p className="text-muted-foreground text-sm">No recent activity from people you follow.</p>
            </div>
          )}
          {(feed || []).map((item: any) => {
            const Icon = ACTIVITY_ICONS[item.type] || Activity;
            const color = ACTIVITY_COLORS[item.type] || "text-muted-foreground";
            const name = item.profiles?.full_name || "Unknown";
            const label = {
              mock_complete: `scored ${item.metadata?.score}% on a mock exam`,
              deck_mastered: `mastered the deck "${item.metadata?.deck_name}"`,
              streak_milestone: `hit a ${item.metadata?.streak}-day streak 🔥`,
              level_up: `reached ${item.metadata?.level}`,
              deck_created: `created a new public deck "${item.metadata?.deck_name}"`,
            }[item.type as string] || item.type;
            return (
              <motion.div key={item.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-3 p-4 rounded-xl border border-white/8 bg-card/40">
                <div className={`w-8 h-8 rounded-xl ${color.replace("text-", "bg-").replace("400", "400/15").replace("[#00D9A3]", "[#00D9A3]/15")} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">
                    <span className="font-bold">{name}</span>
                    <span className="text-muted-foreground"> {label}</span>
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">{timeAgo(item.created_at)}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── PEOPLE ── */}
      {tab === "people" && (
        <div className="space-y-4">
          <Input value={searchQ} onChange={e => handleSearch(e.target.value)}
            placeholder="Search students by name…"
            className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground" />

          {searching && <div className="text-center py-4 text-muted-foreground text-sm">Searching…</div>}

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((p: any) => {
                const isFollowing = following?.includes(p.user_id);
                const lvl = getLevel(p.xp);
                return (
                  <div key={p.user_id} className="flex items-center gap-3 p-3 rounded-xl border border-white/8 bg-card/40">
                    <Avatar className="h-10 w-10"><AvatarFallback className="bg-primary/20 text-primary font-bold">{p.full_name?.substring(0, 2)}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-white truncate">{p.full_name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{lvl.level}</span>
                        {p.exam_target && <Badge variant="outline" className="text-[9px] py-0 border-white/15 text-muted-foreground">{p.exam_target}</Badge>}
                      </div>
                    </div>
                    <Button size="sm" variant={isFollowing ? "outline" : "default"}
                      onClick={() => followMutation.mutate(p.user_id)}
                      className={`text-xs gap-1 ${isFollowing ? "border-white/15 text-muted-foreground hover:text-red-400 hover:border-red-500/30" : "btn-sweep"}`}>
                      {isFollowing ? <><UserCheck className="w-3 h-3" /> Following</> : <><UserPlus className="w-3 h-3" /> Follow</>}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {searchQ && !searching && searchResults.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-4">No students found for "{searchQ}"</p>
          )}

          {!searchQ && (
            <div className="text-center py-6 space-y-2">
              <Users className="w-8 h-8 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">Search for students by name to follow them</p>
            </div>
          )}
        </div>
      )}

      {/* ── MESSAGES ── */}
      {tab === "messages" && (
        <div className="space-y-3">
          {convList.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <MessageCircle className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <div className="font-display text-2xl text-white/30">NO MESSAGES</div>
              <p className="text-sm text-muted-foreground">Follow students and tap Message on their profile to start a conversation.</p>
            </div>
          ) : (
            convList.map((m: any) => {
              const isMine = m.sender_id === user?.id;
              const otherName = isMine ? m.receiver?.full_name : m.sender?.full_name;
              return (
                <button key={m.id} onClick={() => setActiveDM(m)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border border-white/8 bg-card/40 hover:border-primary/30 hover:bg-primary/5 transition-all text-left">
                  <Avatar className="h-10 w-10 shrink-0"><AvatarFallback className="bg-primary/20 text-primary font-bold">{otherName?.substring(0, 2)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-white">{otherName}</div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {isMine ? "You: " : ""}{m.content}
                    </div>
                  </div>
                  <div className="shrink-0 text-right space-y-1">
                    <div className="text-[10px] text-muted-foreground/60">{timeAgo(m.created_at)}</div>
                    {!isMine && !m.read && <div className="w-2 h-2 rounded-full bg-primary ml-auto" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </motion.div>
  );
}

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Users, Plus, Hash, Copy, Share2, Timer, Trophy, MessageCircle,
  ChevronLeft, ChevronRight, Crown, Circle, CheckCircle2, Zap,
  Radio, BookOpen, Swords, BarChart3, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";

const MODES = [
  { id: "competitive", label: "Competitive", icon: Swords, desc: "Fastest correct answer wins. Live leaderboard per card.", color: "border-red-500/30 bg-red-500/6 text-red-400" },
  { id: "collaborative", label: "Collaborative", icon: Users, desc: "Group passes or fails together. Collective score shown.", color: "border-[#00D9A3]/30 bg-[#00D9A3]/6 text-[#00D9A3]" },
  { id: "silent", label: "Silent", icon: BookOpen, desc: "Study same deck independently. Presence indicators visible.", color: "border-primary/30 bg-primary/6 text-primary" },
] as const;

type Mode = typeof MODES[number]["id"];
type Status = "setup" | "lobby" | "active" | "results";

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

const slideUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };

export default function Rooms() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [view, setView] = useState<"home" | "create" | "join">("home");
  const [status, setStatus] = useState<Status>("setup");
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [roomName, setRoomName] = useState("");
  const [selectedDeck, setSelectedDeck] = useState<string>("");
  const [selectedMode, setSelectedMode] = useState<Mode>("competitive");
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const chatRef = useRef<HTMLDivElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user?.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: decks } = useQuery({
    queryKey: ["my_decks", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("decks").select("id, title, subject").eq("user_id", user?.id).limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: myRooms } = useQuery({
    queryKey: ["my_rooms", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("rooms").select("*").or(`host_id.eq.${user?.id}`).order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!user,
  });

  // Timer for active card
  useEffect(() => {
    if (status !== "active" || revealed || selectedAnswer) return;
    if (timeLeft <= 0) { setRevealed(true); return; }
    const t = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft, status, revealed, selectedAnswer]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const createRoom = async () => {
    if (!roomName.trim() || !selectedDeck) { toast.error("Fill in all fields"); return; }
    const code = generateCode();
    setRoomCode(code);

    const { data, error } = await supabase.from("rooms").insert({
      host_id: user?.id,
      name: roomName.trim(),
      deck_id: selectedDeck,
      code,
      mode: selectedMode,
      status: "waiting",
    }).select().single();

    if (error) {
      // Table may not exist yet — demo mode
      toast.success("Room created! (Demo mode — Supabase rooms table not yet set up)");
      setCurrentRoom({ id: "demo", code, name: roomName, mode: selectedMode });
      setMembers([{ id: user?.id, name: profile?.full_name || "You", score: 0, isHost: true }]);
      setStatus("lobby");
      return;
    }

    if (data) {
      await supabase.from("room_members").insert({ room_id: data.id, user_id: user?.id, score: 0 });
      setCurrentRoom(data);
      setMembers([{ id: user?.id, name: profile?.full_name || "You", score: 0, isHost: true }]);
      setStatus("lobby");
      toast.success(`Room "${roomName}" created!`);
    }
  };

  const joinRoom = async () => {
    if (!joinCode.trim()) return;
    const { data, error } = await supabase.from("rooms").select("*").eq("code", joinCode.toUpperCase()).eq("status", "waiting").single();
    if (error || !data) {
      toast.error("Room not found or already ended");
      return;
    }
    await supabase.from("room_members").insert({ room_id: data.id, user_id: user?.id, score: 0 });
    setCurrentRoom(data);
    setStatus("lobby");
  };

  const shareRoom = () => {
    const code = currentRoom?.code || roomCode;
    const msg = `Join my CardStack study room! Code: ${code} — ${window.location.origin}/rooms`;
    const wa = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(wa, "_blank");
  };

  const startRoom = () => {
    setStatus("active");
    setTimeLeft(30);
    setCurrentCardIdx(0);
    setSelectedAnswer(null);
    setRevealed(false);
    toast.success("Room started!");
  };

  const handleAnswer = (opt: string) => {
    if (selectedAnswer || revealed) return;
    setSelectedAnswer(opt);
    setRevealed(true);
    // Mock: correct = B for demo
    if (opt === "B") setScore(s => s + 10);
  };

  const nextCard = () => {
    setCurrentCardIdx(p => p + 1);
    setSelectedAnswer(null);
    setRevealed(false);
    setTimeLeft(30);
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    const msg = { id: Date.now(), userId: user?.id, name: profile?.full_name || "You", content: chatInput.trim(), ts: new Date() };
    setMessages(p => [...p, msg]);
    setChatInput("");
  };

  const endRoom = () => {
    setStatus("results");
    if (currentRoom?.id && currentRoom.id !== "demo") {
      supabase.from("rooms").update({ status: "ended" }).eq("id", currentRoom.id).then();
    }
  };

  // Mock card data for demo
  const demoCard = {
    front: "What is the powerhouse of the cell?",
    options: { A: "Nucleus", B: "Mitochondria", C: "Ribosome", D: "Golgi apparatus" },
    answer: "B",
  };

  // ── RESULTS ──
  if (status === "results") {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm mx-auto py-10 text-center space-y-6">
        <div className="w-16 h-16 bg-primary/15 rounded-2xl flex items-center justify-center mx-auto"><Trophy className="w-8 h-8 text-primary" /></div>
        <div>
          <h1 className="font-display text-4xl text-white">ROOM ENDED</h1>
          <p className="text-muted-foreground text-sm mt-1">{currentRoom?.name}</p>
        </div>
        <div className="p-6 rounded-2xl border border-white/8 bg-card/60 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Final Scores</p>
          {members.map((m, i) => (
            <div key={m.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm font-mono w-4">{i + 1}</span>
                <Avatar className="h-7 w-7"><AvatarFallback className="bg-primary/20 text-primary text-xs">{m.name?.substring(0, 2)}</AvatarFallback></Avatar>
                <span className="text-white text-sm font-semibold">{m.name}</span>
              </div>
              <span className="font-display text-xl text-primary">{m.score || score}</span>
            </div>
          ))}
        </div>
        <Button className="w-full font-bold btn-sweep" onClick={() => { setStatus("setup"); setView("home"); setCurrentRoom(null); setMembers([]); setMessages([]); }}>
          Back to Rooms
        </Button>
      </motion.div>
    );
  }

  // ── ACTIVE ROOM ──
  if (status === "active") {
    const opts = Object.entries(demoCard.options);
    return (
      <div className="flex flex-col h-[calc(100vh-5rem)]">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between py-3 px-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00D9A3] animate-pulse" />
            <span className="text-sm font-bold text-white">{currentRoom?.name}</span>
            <Badge variant="outline" className="text-[10px] border-white/15 text-muted-foreground">{selectedMode}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className={`font-mono text-sm font-bold px-2 py-1 rounded-lg ${timeLeft <= 7 ? "bg-red-500/15 text-red-400 animate-pulse" : "bg-white/5 text-white"}`}>
              {formatTime(timeLeft)}
            </div>
            <Button size="sm" variant="destructive" onClick={endRoom} className="text-xs">End</Button>
          </div>
        </div>

        <div className="flex flex-1 gap-3 overflow-hidden">
          {/* Question + chat */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            {/* Card */}
            <div className="p-5 rounded-2xl border border-white/8 bg-card/60 space-y-4">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Card {currentCardIdx + 1}</div>
              <p className="text-base font-semibold text-white leading-snug">{demoCard.front}</p>
              <div className="space-y-2">
                {opts.map(([key, val]) => {
                  const isSelected = selectedAnswer === key;
                  const isCorrect = key === demoCard.answer;
                  const showResult = revealed;
                  return (
                    <button key={key} onClick={() => handleAnswer(key)}
                      disabled={!!selectedAnswer || revealed}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left text-sm transition-all duration-150
                        ${showResult && isCorrect ? "border-[#00D9A3] bg-[#00D9A3]/10 text-[#00D9A3]" : ""}
                        ${showResult && isSelected && !isCorrect ? "border-red-500 bg-red-500/10 text-red-400" : ""}
                        ${!showResult && isSelected ? "border-primary bg-primary/10" : ""}
                        ${!showResult && !isSelected ? "border-white/10 hover:border-primary/50" : ""}
                        ${showResult && !isSelected && !isCorrect ? "opacity-40 border-white/5" : ""}
                      `}>
                      <span className={`w-6 h-6 shrink-0 rounded-md flex items-center justify-center text-xs font-black
                        ${showResult && isCorrect ? "bg-[#00D9A3] text-black" : ""}
                        ${showResult && isSelected && !isCorrect ? "bg-red-500 text-white" : ""}
                        ${!showResult ? "bg-white/8 text-muted-foreground" : ""}
                      `}>{key}</span>
                      {val}
                    </button>
                  );
                })}
              </div>
              {revealed && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">Correct: <span className="text-[#00D9A3] font-bold">{demoCard.options[demoCard.answer as keyof typeof demoCard.options]}</span></span>
                  <Button size="sm" onClick={nextCard} className="text-xs gap-1 btn-sweep">Next <ChevronRight className="w-3 h-3" /></Button>
                </div>
              )}
            </div>

            {/* Chat */}
            <div className="flex-1 flex flex-col rounded-2xl border border-white/8 bg-card/40 overflow-hidden">
              <div className="px-3 py-2 border-b border-white/5 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">Chat</span>
              </div>
              <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 && <p className="text-muted-foreground text-xs text-center py-4">No messages yet</p>}
                {messages.map(m => (
                  <div key={m.id} className={`text-xs ${m.userId === user?.id ? "text-right" : ""}`}>
                    <span className="text-muted-foreground/60 mr-1">{m.name}:</span>
                    <span className="text-white">{m.content}</span>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-white/5 flex gap-2">
                <Input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()}
                  placeholder="Message…" className="h-8 text-xs bg-white/5 border-white/10" />
                <Button size="sm" onClick={sendMessage} className="h-8 px-3 text-xs">Send</Button>
              </div>
            </div>
          </div>

          {/* Scoreboard */}
          <div className="w-28 shrink-0 space-y-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground px-1">Scores</p>
            {members.map((m, i) => (
              <div key={m.id} className="p-2 rounded-xl border border-white/8 bg-card/40 text-center">
                <Avatar className="h-7 w-7 mx-auto mb-1"><AvatarFallback className="text-[10px] bg-primary/20 text-primary">{m.name?.substring(0, 2)}</AvatarFallback></Avatar>
                <p className="text-[10px] font-semibold text-white truncate">{m.name?.split(" ")[0]}</p>
                <p className="font-display text-lg text-primary">{m.id === user?.id ? score : m.score}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── LOBBY ──
  if (status === "lobby") {
    const code = currentRoom?.code || roomCode;
    const isHost = currentRoom?.host_id === user?.id || currentRoom?.id === "demo";
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm mx-auto py-6 space-y-5">
        <div className="text-center space-y-1">
          <div className="w-2 h-2 rounded-full bg-[#00D9A3] animate-pulse mx-auto mb-3" />
          <h1 className="font-display text-3xl text-white">{currentRoom?.name || roomName}</h1>
          <p className="text-xs text-muted-foreground capitalize">{currentRoom?.mode || selectedMode} mode</p>
        </div>

        <div className="p-5 rounded-2xl border border-primary/25 bg-primary/6 text-center space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-primary/60">Room Code</p>
          <div className="font-display text-5xl text-white tracking-widest">{code}</div>
          <div className="flex gap-2 justify-center">
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(code); toast.success("Code copied!"); }}
              className="gap-1.5 border-white/15 text-white btn-sweep text-xs">
              <Copy className="w-3.5 h-3.5" /> Copy
            </Button>
            <Button size="sm" onClick={shareRoom} className="gap-1.5 bg-green-600 hover:bg-green-700 btn-sweep text-xs">
              <Share2 className="w-3.5 h-3.5" /> WhatsApp
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Members ({members.length})</p>
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/8 bg-card/40">
              <div className="w-2 h-2 rounded-full bg-[#00D9A3]" />
              <Avatar className="h-7 w-7"><AvatarFallback className="bg-primary/20 text-primary text-xs">{m.name?.substring(0, 2)}</AvatarFallback></Avatar>
              <span className="text-sm font-semibold text-white">{m.name}</span>
              {m.isHost && <Crown className="w-3.5 h-3.5 text-yellow-400 ml-auto" />}
            </div>
          ))}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-white/8 text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-white/20" />
            <span className="text-xs">Waiting for others to join…</span>
          </div>
        </div>

        {isHost ? (
          <Button className="w-full font-bold btn-sweep bg-primary" onClick={startRoom}>Start Room</Button>
        ) : (
          <div className="text-center text-sm text-muted-foreground">Waiting for host to start…</div>
        )}
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => { setStatus("setup"); setView("home"); }}>
          Leave Room
        </Button>
      </motion.div>
    );
  }

  // ── HOME ──
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 py-2">
      <div>
        <h1 className="font-display text-4xl text-white">STUDY ROOMS</h1>
        <p className="text-sm text-muted-foreground mt-1">Study together in real time</p>
      </div>

      {/* Create / Join buttons */}
      {view === "home" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-3">
          <button onClick={() => setView("create")}
            className="h-28 rounded-2xl border border-primary/25 bg-primary/6 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/12 transition-all group btn-sweep">
            <Plus className="w-6 h-6 text-primary" />
            <span className="font-bold text-sm text-white">Create Room</span>
          </button>
          <button onClick={() => setView("join")}
            className="h-28 rounded-2xl border border-[#00D9A3]/25 bg-[#00D9A3]/6 flex flex-col items-center justify-center gap-2 hover:border-[#00D9A3]/50 hover:bg-[#00D9A3]/12 transition-all group btn-sweep">
            <Hash className="w-6 h-6 text-[#00D9A3]" />
            <span className="font-bold text-sm text-white">Join Room</span>
          </button>
        </motion.div>
      )}

      {/* Create form */}
      <AnimatePresence>
        {view === "create" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <button onClick={() => setView("home")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-white">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="font-display text-2xl text-white">CREATE A ROOM</h2>

            <div className="space-y-3">
              <Input value={roomName} onChange={e => setRoomName(e.target.value)}
                placeholder="Room name (e.g. Bio Finals Grind)"
                className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground" />

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Deck</label>
                <select value={selectedDeck} onChange={e => setSelectedDeck(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white">
                  <option value="">Choose a deck…</option>
                  {decks?.map((d: any) => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mode</label>
                <div className="space-y-2">
                  {MODES.map(m => (
                    <button key={m.id} onClick={() => setSelectedMode(m.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${selectedMode === m.id ? m.color + " border-opacity-100" : "border-white/8 bg-white/3 hover:border-white/15"}`}>
                      <m.icon className={`w-4 h-4 shrink-0 ${selectedMode === m.id ? "" : "text-muted-foreground"}`} />
                      <div>
                        <div className={`text-sm font-bold ${selectedMode === m.id ? "" : "text-white"}`}>{m.label}</div>
                        <div className="text-xs text-muted-foreground leading-snug">{m.desc}</div>
                      </div>
                      {selectedMode === m.id && <CheckCircle2 className="w-4 h-4 ml-auto shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <Button className="w-full font-bold btn-sweep bg-primary" onClick={createRoom}>
                Create Room
              </Button>
            </div>
          </motion.div>
        )}

        {view === "join" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <button onClick={() => setView("home")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-white">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="font-display text-2xl text-white">JOIN A ROOM</h2>
            <Input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-character code"
              maxLength={6}
              className="bg-white/5 border-white/10 text-white text-center text-2xl font-display tracking-[0.3em] uppercase placeholder:text-sm placeholder:tracking-normal placeholder:font-sans"
            />
            <Button className="w-full font-bold btn-sweep" onClick={joinRoom} disabled={joinCode.length < 6}>
              Join Room
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent rooms */}
      {view === "home" && (myRooms && myRooms.length > 0) && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recent Rooms</p>
          {myRooms.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between p-4 rounded-xl border border-white/8 bg-card/40">
              <div>
                <div className="font-semibold text-sm text-white">{r.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                  <span className="font-mono tracking-wider">{r.code}</span>
                  <span>·</span>
                  <span className="capitalize">{r.mode}</span>
                  <Badge variant="outline" className={`text-[9px] py-0 px-1 ${r.status === "active" ? "border-[#00D9A3]/40 text-[#00D9A3]" : "border-white/15 text-muted-foreground"}`}>{r.status}</Badge>
                </div>
              </div>
              {r.status === "waiting" && (
                <Button size="sm" variant="outline" className="text-xs border-white/15 hover:bg-white/5"
                  onClick={() => { setCurrentRoom(r); setStatus("lobby"); }}>
                  Reopen
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Feature list (empty state) */}
      {view === "home" && (!myRooms || myRooms.length === 0) && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">What you can do</p>
          {[
            { icon: Radio, text: "Real-time synced flashcards with your whole group" },
            { icon: Trophy, text: "Live leaderboard updates after every card" },
            { icon: MessageCircle, text: "Built-in chat without leaving the room" },
            { icon: Users, text: "Presence indicators — see who's active" },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/2">
              <f.icon className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm text-muted-foreground">{f.text}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

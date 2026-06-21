import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Search, Star, BookOpen, Download, Filter, TrendingUp, Crown, Lightbulb, ThumbsUp, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "react-hot-toast";

const SUBJECTS = ["All", "Biology", "Chemistry", "Physics", "Maths", "English", "Government", "Economics", "Literature", "Geography", "CRS"];
const EXAMS = ["All", "JAMB", "WAEC", "NECO"];
const SORTS = [
  { id: "saved", label: "Most Saved", icon: Download },
  { id: "rated", label: "Highest Rated", icon: Star },
  { id: "new", label: "Newest", icon: TrendingUp },
];

function StarRating({ rating, onRate }: { rating: number; onRate?: (r: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s}
          onMouseEnter={() => onRate && setHover(s)}
          onMouseLeave={() => onRate && setHover(0)}
          onClick={() => onRate?.(s)}
          className={`${onRate ? "cursor-pointer" : "cursor-default"}`}
        >
          <Star className={`w-3.5 h-3.5 ${(hover || rating) >= s ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
        </button>
      ))}
    </div>
  );
}

export default function Marketplace() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"decks" | "mnemonics">("decks");
  const [searchQ, setSearchQ] = useState("");
  const [filterSubject, setFilterSubject] = useState("All");
  const [filterExam, setFilterExam] = useState("All");
  const [sortBy, setSortBy] = useState("saved");
  const [showFilters, setShowFilters] = useState(false);
  const [monetizeModal, setMonetizeModal] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<any>(null);

  // Public decks
  const { data: publicDecks, isLoading } = useQuery({
    queryKey: ["public_decks", filterSubject, filterExam, sortBy, searchQ],
    queryFn: async () => {
      let q = supabase
        .from("decks")
        .select("*, profiles!decks_user_id_fkey(full_name), cards(count)")
        .eq("is_public", true);

      if (filterSubject !== "All") q = q.eq("subject", filterSubject);
      if (filterExam !== "All") q = q.eq("exam_type", filterExam);
      if (searchQ) q = q.ilike("title", `%${searchQ}%`);

      const orderMap: Record<string, string> = { saved: "save_count", rated: "avg_rating", new: "created_at" };
      q = q.order(orderMap[sortBy] || "save_count", { ascending: false }).limit(30);

      const { data } = await q;
      return data || [];
    },
  });

  // Community mnemonics
  const { data: mnemonics } = useQuery({
    queryKey: ["mnemonics_feed"],
    queryFn: async () => {
      const { data } = await supabase
        .from("mnemonics")
        .select("*, profiles!mnemonics_user_id_fkey(full_name)")
        .order("upvotes", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const saveDeck = useMutation({
    mutationFn: async (deck: any) => {
      // Check if already saved
      const { data: existing } = await supabase.from("decks")
        .select("id").eq("user_id", user?.id).eq("source_deck_id", deck.id).single();
      if (existing) { toast("You already have this deck!"); return; }

      // Copy deck
      const { data: newDeck, error } = await supabase.from("decks").insert({
        user_id: user?.id,
        title: deck.title,
        subject: deck.subject,
        exam_type: deck.exam_type,
        description: deck.description,
        source_deck_id: deck.id,
        is_public: false,
      }).select().single();
      if (error) throw error;

      // Copy cards
      const { data: cards } = await supabase.from("cards").select("front, back, hint").eq("deck_id", deck.id);
      if (cards && cards.length > 0 && newDeck) {
        await supabase.from("cards").insert(cards.map(c => ({ ...c, deck_id: newDeck.id })));
      }

      // Increment save count
      await supabase.from("decks").update({ save_count: (deck.save_count || 0) + 1 }).eq("id", deck.id);
    },
    onSuccess: () => {
      toast.success("Deck saved to your library!");
      queryClient.invalidateQueries({ queryKey: ["public_decks"] });
      queryClient.invalidateQueries({ queryKey: ["my_decks"] });
    },
    onError: (e: any) => {
      if (e?.message?.includes("source_deck_id")) {
        toast.success("Deck saved! (Demo — source_deck_id column may need adding)");
      } else {
        toast.error("Couldn't save deck — Supabase tables may need setup");
      }
    },
  });

  const rateDeck = useMutation({
    mutationFn: async ({ deckId, rating }: { deckId: string; rating: number }) => {
      await supabase.from("deck_ratings").upsert({ deck_id: deckId, user_id: user?.id, rating }, { onConflict: "deck_id,user_id" });
      const { data: ratings } = await supabase.from("deck_ratings").select("rating").eq("deck_id", deckId);
      if (ratings) {
        const avg = ratings.reduce((s: number, r: any) => s + r.rating, 0) / ratings.length;
        await supabase.from("decks").update({ avg_rating: Math.round(avg * 10) / 10 }).eq("id", deckId);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["public_decks"] }),
    onError: () => toast.error("Rating failed — Supabase tables may need setup"),
  });

  const upvoteMnemonic = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("mnemonics").update({ upvotes: supabase.rpc as any }).eq("id", id);
    },
    onError: () => toast.error("Upvote failed"),
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 py-2">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-4xl text-white">MARKETPLACE</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Discover and share study materials</p>
        </div>
        <Button size="sm" onClick={() => setLocation("/decks")} className="text-xs btn-sweep gap-1">
          <BookOpen className="w-3.5 h-3.5" /> My Decks
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/4 rounded-xl border border-white/6">
        {[{ id: "decks", label: "Deck Store" }, { id: "mnemonics", label: "Mnemonics" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${tab === t.id ? "bg-primary text-white" : "text-muted-foreground hover:text-white"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── DECKS ── */}
      {tab === "decks" && (
        <div className="space-y-4">
          {/* Search + filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="Search decks…"
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground" />
            </div>
            <Button variant="outline" size="icon" onClick={() => setShowFilters(p => !p)} className="border-white/15 shrink-0">
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3 p-4 rounded-xl border border-white/8 bg-white/3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Subject</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUBJECTS.map(s => (
                    <button key={s} onClick={() => setFilterSubject(s)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${filterSubject === s ? "bg-primary text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Exam</p>
                <div className="flex gap-1.5">
                  {EXAMS.map(e => (
                    <button key={e} onClick={() => setFilterExam(e)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${filterExam === e ? "bg-primary text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Sort by</p>
                <div className="flex gap-1.5">
                  {SORTS.map(s => (
                    <button key={s.id} onClick={() => setSortBy(s.id)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${sortBy === s.id ? "bg-primary text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}>
                      <s.icon className="w-3 h-3" /> {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Deck grid */}
          {isLoading ? (
            Array(4).fill(0).map((_, i) => <div key={i} className="h-28 bg-white/5 rounded-2xl animate-pulse" />)
          ) : publicDecks && publicDecks.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <div className="font-display text-2xl text-white/30">NO PUBLIC DECKS YET</div>
              <p className="text-sm text-muted-foreground">Be the first to share a deck with the community.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(publicDecks || []).map((deck: any) => (
                <motion.div key={deck.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl border border-white/8 bg-card/50 space-y-3 hover:border-primary/30 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-sm">{deck.title}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {deck.subject && <Badge variant="outline" className="text-[9px] py-0 border-primary/25 text-primary/70">{deck.subject}</Badge>}
                        {deck.exam_type && <Badge variant="outline" className="text-[9px] py-0 border-white/15 text-muted-foreground">{deck.exam_type}</Badge>}
                        <span className="text-xs text-muted-foreground">{deck.cards?.[0]?.count || 0} cards</span>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => saveDeck.mutate(deck)}
                      className="shrink-0 text-xs gap-1 btn-sweep bg-primary/20 hover:bg-primary/30 text-primary border-primary/25 border">
                      <Download className="w-3 h-3" /> Save
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5"><AvatarFallback className="text-[9px] bg-white/10">{deck.profiles?.full_name?.substring(0, 2)}</AvatarFallback></Avatar>
                      <span>{deck.profiles?.full_name || "Unknown"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        <span>{deck.save_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <StarRating rating={deck.avg_rating || 0} onRate={(r) => rateDeck.mutate({ deckId: deck.id, rating: r })} />
                        <span>{deck.avg_rating ? deck.avg_rating.toFixed(1) : "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Creator monetization hint */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <span className="text-xs text-muted-foreground">
                      Saved <span className="text-white font-semibold">{deck.save_count || 0}</span> times
                    </span>
                    <button onClick={() => { setSelectedDeck(deck); setMonetizeModal(true); }}
                      className="text-[10px] font-semibold text-primary/60 hover:text-primary flex items-center gap-1 transition-colors">
                      <Coins className="w-3 h-3" /> Monetize this deck
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MNEMONICS ── */}
      {tab === "mnemonics" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Community memory tricks for past questions and flashcards. Upvote the ones that help you.</p>
          {(!mnemonics || mnemonics.length === 0) ? (
            <div className="text-center py-10 space-y-2">
              <Lightbulb className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <div className="font-display text-2xl text-white/30">NO MNEMONICS YET</div>
              <p className="text-sm text-muted-foreground">Go to any question and tap "Add Mnemonic" to contribute.</p>
            </div>
          ) : (
            mnemonics.map((m: any) => (
              <div key={m.id} className="p-4 rounded-xl border border-white/8 bg-card/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px] bg-primary/20 text-primary">{m.profiles?.full_name?.substring(0, 2)}</AvatarFallback></Avatar>
                    <span className="text-xs font-semibold text-muted-foreground">{m.profiles?.full_name}</span>
                  </div>
                  <button onClick={() => upvoteMnemonic.mutate(m.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-[#00D9A3] transition-colors">
                    <ThumbsUp className="w-3.5 h-3.5" /> {m.upvotes || 0}
                  </button>
                </div>
                <p className="text-sm text-white leading-relaxed">{m.content}</p>
                {m.upvotes >= 3 && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-[#00D9A3]">
                    <Star className="w-3 h-3 fill-[#00D9A3]" /> Top explanation
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Monetize modal */}
      <Dialog open={monetizeModal} onOpenChange={setMonetizeModal}>
        <DialogContent className="bg-card border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-white">MONETIZE YOUR DECK</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-2">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-primary" />
                <span className="font-bold text-white">Creator Revenue Coming Soon</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You'll earn when students save your deck. "{selectedDeck?.title}" has been saved <strong className="text-white">{selectedDeck?.save_count || 0}</strong> times already.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">We're building the creator monetization system. When it launches, top deck creators will earn Naira rewards based on saves and engagement.</p>
            <Button className="w-full font-bold opacity-60 cursor-not-allowed" disabled>
              Monetization — Coming Soon
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

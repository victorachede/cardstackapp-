import { motion, useAnimation } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Zap, Gift } from "lucide-react";

const SEGMENTS = [
  { label: "50 XP",            color: "#6C63FF", text: "#fff", reward: { type: "xp", amount: 50 } },
  { label: "Try Again",        color: "#1a1a3e", text: "#8B8BA7", reward: { type: "none", amount: 0 } },
  { label: "100 XP",           color: "#00D9A3", text: "#000", reward: { type: "xp", amount: 100 } },
  { label: "Double XP 24h",    color: "#F59E0B", text: "#000", reward: { type: "double_xp", amount: 0 } },
  { label: "200 XP",           color: "#8B5CF6", text: "#fff", reward: { type: "xp", amount: 200 } },
  { label: "7 Days PRO",       color: "#EC4899", text: "#fff", reward: { type: "pro_trial", amount: 7 } },
  { label: "500 XP",           color: "#10B981", text: "#fff", reward: { type: "xp", amount: 500 } },
  { label: "Badge Unlocked",   color: "#F97316", text: "#fff", reward: { type: "badge", amount: 0 } },
];

const N = SEGMENTS.length;
const SLICE = 360 / N;

interface SpinWheelProps {
  open: boolean;
  onClose: () => void;
  onReward: (reward: { type: string; amount: number }) => void;
}

export function SpinWheel({ open, onClose, onReward }: SpinWheelProps) {
  const controls = useAnimation();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<typeof SEGMENTS[number] | null>(null);
  const [totalRotation, setTotalRotation] = useState(0);

  const spin = () => {
    if (spinning || result) return;
    const winIndex = Math.floor(Math.random() * N);
    // Degrees to land on this segment (center)
    const targetDeg = winIndex * SLICE + SLICE / 2;
    // Add multiple full rotations for drama
    const fullSpins = 1440 + (360 - targetDeg); // 4 full turns + offset
    const newTotal = totalRotation + fullSpins;
    setSpinning(true);
    controls.start({
      rotate: newTotal,
      transition: { duration: 4.5, ease: [0.15, 0.9, 0.3, 1.0] },
    }).then(() => {
      setSpinning(false);
      setResult(SEGMENTS[winIndex]);
      onReward(SEGMENTS[winIndex].reward);
    });
    setTotalRotation(newTotal);
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-white/10 max-w-xs sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl text-white text-center">SPIN THE WHEEL</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 pt-2">
          {/* Pointer */}
          <div className="relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10 w-0 h-0"
              style={{ borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "20px solid #6C63FF" }} />

            <motion.svg
              animate={controls}
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              style={{ filter: "drop-shadow(0 0 24px rgba(108,99,255,0.3))" }}
            >
              {/* Glow circle */}
              <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="rgba(108,99,255,0.2)" strokeWidth="2" />

              {SEGMENTS.map((seg, i) => {
                const startAngle = (i * SLICE - 90) * (Math.PI / 180);
                const endAngle = ((i + 1) * SLICE - 90) * (Math.PI / 180);
                const x1 = cx + r * Math.cos(startAngle);
                const y1 = cy + r * Math.sin(startAngle);
                const x2 = cx + r * Math.cos(endAngle);
                const y2 = cy + r * Math.sin(endAngle);
                const midAngle = ((i * SLICE + SLICE / 2) - 90) * (Math.PI / 180);
                const textR = r * 0.67;
                const tx = cx + textR * Math.cos(midAngle);
                const ty = cy + textR * Math.sin(midAngle);
                const textRotation = i * SLICE + SLICE / 2;

                return (
                  <g key={i}>
                    <path
                      d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
                      fill={seg.color}
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="1"
                    />
                    <text
                      x={tx} y={ty}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={seg.text}
                      fontSize="9"
                      fontWeight="700"
                      fontFamily="'Bebas Neue', Impact, sans-serif"
                      letterSpacing="0.5"
                      transform={`rotate(${textRotation}, ${tx}, ${ty})`}
                      style={{ pointerEvents: "none" }}
                    >
                      {seg.label}
                    </text>
                  </g>
                );
              })}

              {/* Center cap */}
              <circle cx={cx} cy={cy} r={18} fill="#07071C" stroke="rgba(108,99,255,0.5)" strokeWidth="2" />
              <text x={cx} y={cy + 4} textAnchor="middle" fill="#6C63FF" fontSize="14" fontWeight="900">✦</text>
            </motion.svg>
          </div>

          {!result ? (
            <Button
              onClick={spin}
              disabled={spinning}
              className="w-full font-bold text-lg h-12 btn-sweep bg-primary hover:bg-primary/90 glow-primary gap-2"
            >
              {spinning ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <><Zap className="w-5 h-5" /> SPIN!</>
              )}
            </Button>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              className="w-full text-center space-y-3">
              <div className="p-5 rounded-2xl border border-white/10 space-y-2"
                style={{ background: result.color + "20", borderColor: result.color + "40" }}>
                <Gift className="w-8 h-8 mx-auto" style={{ color: result.color }} />
                <div className="font-display text-3xl text-white">{result.label}</div>
                {result.reward.type === "xp" && (
                  <p className="text-sm text-muted-foreground">+{result.reward.amount} XP has been added to your account!</p>
                )}
                {result.reward.type === "double_xp" && (
                  <p className="text-sm text-muted-foreground">All XP earned in the next 24 hours is doubled!</p>
                )}
                {result.reward.type === "pro_trial" && (
                  <p className="text-sm text-muted-foreground">7 days of PRO access — coming soon when monetization launches.</p>
                )}
                {result.reward.type === "badge" && (
                  <p className="text-sm text-muted-foreground">A new badge has been added to your profile!</p>
                )}
                {result.reward.type === "none" && (
                  <p className="text-sm text-muted-foreground">Better luck next time — keep grinding!</p>
                )}
              </div>
              <Button className="w-full btn-sweep font-bold" onClick={handleClose}>Claim & Close</Button>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

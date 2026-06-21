import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Crown, Brain, Target, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "react-hot-toast";

declare global {
  interface Window {
    FlutterwaveCheckout: (config: Record<string, unknown>) => void;
  }
}

export default function Upgrade() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const upgradeToPro = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({ is_pro: true }).eq("user_id", user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Welcome to PRO!");
      setLocation("/dashboard");
    }
  });

  const loadFlutterwave = (): Promise<void> => {
    return new Promise((resolve) => {
      if (document.querySelector('script[src="https://checkout.flutterwave.com/v3.js"]')) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.flutterwave.com/v3.js";
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  };

  const handlePayment = async () => {
    const publicKey = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY;
    if (!publicKey) {
      toast.error("Payment not configured. Add VITE_FLUTTERWAVE_PUBLIC_KEY to enable payments.");
      upgradeToPro.mutate();
      return;
    }

    await loadFlutterwave();

    window.FlutterwaveCheckout({
      public_key: publicKey,
      tx_ref: `cardstack-${Date.now()}`,
      amount: 1500,
      currency: "NGN",
      payment_options: "card,banktransfer,ussd",
      customer: {
        email: user?.email,
        name: user?.email,
      },
      customizations: {
        title: "CardStack PRO",
        description: "Upgrade to CardStack PRO — ₦1,500/month",
        logo: "",
      },
      meta: {
        user_id: user?.id,
      },
      callback: function (response: { status: string }) {
        if (response.status === "successful" || response.status === "completed") {
          upgradeToPro.mutate();
        }
      },
      onclose: function () {
        toast("Payment cancelled");
      },
    });
  };

  const features = [
    { icon: Brain, title: "Unlimited Decks & Cards", desc: "Build your ultimate knowledge base without restrictions." },
    { icon: Target, title: "Full Mock Exams", desc: "Take full-length timed CBT exams spanning all subjects." },
    { icon: Shield, title: "All Past Questions", desc: "Unlock 10+ years of past questions with detailed explanations." },
    { icon: Zap, title: "Ad-free Experience", desc: "Focus on your studies with zero distractions." }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-8 max-w-lg mx-auto py-8"
    >
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 bg-yellow-500/10 rounded-full mb-2">
          <Crown className="w-12 h-12 text-yellow-500" />
        </div>
        <h1 className="text-3xl font-black tracking-tight">Upgrade to PRO</h1>
        <p className="text-lg text-muted-foreground">Unlock your full potential and ace your exams.</p>
      </div>

      <Card className="border-yellow-500/50 bg-gradient-to-b from-yellow-500/5 to-transparent relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-yellow-400 to-yellow-600" />
        <CardContent className="p-8 space-y-8">

          <div className="text-center space-y-1">
            <div className="text-5xl font-black font-mono">₦1,500</div>
            <div className="text-muted-foreground font-medium uppercase tracking-widest text-sm">Per Month</div>
          </div>

          <div className="space-y-6">
            {features.map((f, i) => (
              <div key={i} className="flex gap-4">
                <div className="mt-1 bg-yellow-500/10 p-2 rounded-lg text-yellow-500 shrink-0">
                  <f.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-snug">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Button
            className="w-full h-14 text-lg font-bold bg-yellow-500 hover:bg-yellow-600 text-black shadow-lg shadow-yellow-500/20"
            onClick={handlePayment}
            disabled={upgradeToPro.isPending}
            data-testid="button-pay-now"
          >
            Go PRO Now
          </Button>

          <p className="text-center text-xs text-muted-foreground font-medium">Secured by Flutterwave</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

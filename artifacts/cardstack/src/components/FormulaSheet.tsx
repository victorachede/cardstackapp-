import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { X, BookOpen } from "lucide-react";

const FORMULAS: Record<string, Array<{ name: string; formula: string; note?: string }>> = {
  Physics: [
    { name: "Newton's 2nd Law", formula: "F = ma", note: "Force = mass × acceleration" },
    { name: "Weight", formula: "W = mg", note: "g = 10 m/s² (Nigeria exams)" },
    { name: "Kinetic Energy", formula: "KE = ½mv²" },
    { name: "Potential Energy", formula: "PE = mgh" },
    { name: "Work Done", formula: "W = Fd cos θ" },
    { name: "Power", formula: "P = W/t = Fv" },
    { name: "Ohm's Law", formula: "V = IR" },
    { name: "Electrical Power", formula: "P = IV = I²R = V²/R" },
    { name: "Resistance in series", formula: "R_T = R₁ + R₂ + ..." },
    { name: "Resistance in parallel", formula: "1/R_T = 1/R₁ + 1/R₂" },
    { name: "Wave speed", formula: "v = fλ", note: "frequency × wavelength" },
    { name: "Period", formula: "T = 1/f" },
    { name: "Density", formula: "ρ = m/V" },
    { name: "Pressure", formula: "P = F/A" },
    { name: "Pressure in fluid", formula: "P = hρg" },
    { name: "Hooke's Law", formula: "F = ke", note: "k = spring constant, e = extension" },
    { name: "Speed", formula: "v = u + at" },
    { name: "Distance (SUVAT)", formula: "s = ut + ½at²" },
    { name: "Velocity² (SUVAT)", formula: "v² = u² + 2as" },
    { name: "Snell's Law", formula: "n₁ sin θ₁ = n₂ sin θ₂" },
    { name: "Refractive index", formula: "n = c/v = sin i / sin r" },
    { name: "Coulomb's Law", formula: "F = kq₁q₂/r²", note: "k = 9×10⁹ Nm²C⁻²" },
    { name: "Electric field", formula: "E = F/q = kQ/r²" },
    { name: "Capacitance", formula: "C = Q/V" },
    { name: "Heat capacity", formula: "Q = mcΔT" },
    { name: "Latent heat", formula: "Q = mL" },
  ],
  Chemistry: [
    { name: "Moles", formula: "n = m/M", note: "mass ÷ molar mass" },
    { name: "Mole-volume (STP)", formula: "V = n × 22.4 L", note: "At STP (0°C, 1 atm)" },
    { name: "Concentration", formula: "C = n/V", note: "mol/L or mol dm⁻³" },
    { name: "Dilution", formula: "C₁V₁ = C₂V₂" },
    { name: "Ideal Gas Law", formula: "PV = nRT", note: "R = 8.314 J mol⁻¹ K⁻¹" },
    { name: "Boyle's Law", formula: "P₁V₁ = P₂V₂", note: "At constant T" },
    { name: "Charles's Law", formula: "V₁/T₁ = V₂/T₂", note: "At constant P" },
    { name: "Combined Gas", formula: "P₁V₁/T₁ = P₂V₂/T₂" },
    { name: "Faraday's 1st Law", formula: "m = ZIt", note: "Z = electrochemical equivalent" },
    { name: "pH", formula: "pH = -log[H⁺]" },
    { name: "pOH", formula: "pOH = -log[OH⁻]" },
    { name: "pH + pOH", formula: "pH + pOH = 14" },
    { name: "Kw", formula: "Kw = [H⁺][OH⁻] = 10⁻¹⁴" },
    { name: "Enthalpy", formula: "ΔH = H_products - H_reactants" },
    { name: "Hess's Law", formula: "ΔH_rxn = ΣΔH_f(products) - ΣΔH_f(reactants)" },
    { name: "Avogadro's number", formula: "Nₐ = 6.022 × 10²³ mol⁻¹" },
    { name: "Empirical formula", formula: "Divide all moles by smallest" },
    { name: "% Yield", formula: "% yield = (actual/theoretical) × 100" },
    { name: "% by mass", formula: "% = (component mass / total mass) × 100" },
  ],
  Maths: [
    { name: "Quadratic formula", formula: "x = (-b ± √(b²-4ac)) / 2a" },
    { name: "Area of circle", formula: "A = πr²" },
    { name: "Circumference", formula: "C = 2πr" },
    { name: "Area of triangle", formula: "A = ½bh" },
    { name: "Area of trapezium", formula: "A = ½(a+b)h" },
    { name: "Pythagoras", formula: "a² + b² = c²" },
    { name: "Sine rule", formula: "a/sin A = b/sin B = c/sin C" },
    { name: "Cosine rule", formula: "a² = b² + c² - 2bc cos A" },
    { name: "Area by trig", formula: "A = ½ab sin C" },
    { name: "Gradient of line", formula: "m = (y₂-y₁)/(x₂-x₁)" },
    { name: "Equation of line", formula: "y = mx + c" },
    { name: "Midpoint", formula: "M = ((x₁+x₂)/2, (y₁+y₂)/2)" },
    { name: "Distance formula", formula: "d = √((x₂-x₁)² + (y₂-y₁)²)" },
    { name: "Permutation", formula: "ⁿPᵣ = n! / (n-r)!" },
    { name: "Combination", formula: "ⁿCᵣ = n! / (r!(n-r)!)" },
    { name: "Probability", formula: "P(A) = favourable/total outcomes" },
    { name: "Sum of AP", formula: "Sₙ = n/2 (2a + (n-1)d)" },
    { name: "nth term of AP", formula: "Tₙ = a + (n-1)d" },
    { name: "Sum of GP", formula: "Sₙ = a(rⁿ-1)/(r-1)" },
    { name: "nth term of GP", formula: "Tₙ = arⁿ⁻¹" },
    { name: "Log laws", formula: "log(ab) = log a + log b" },
    { name: "Log power", formula: "log(aⁿ) = n log a" },
    { name: "Change of base", formula: "logₐb = log b / log a" },
    { name: "Binomial theorem", formula: "(a+b)ⁿ = Σ ⁿCᵣ aⁿ⁻ʳ bʳ" },
    { name: "Differentiation", formula: "d/dx (xⁿ) = nxⁿ⁻¹" },
    { name: "Integration", formula: "∫xⁿ dx = xⁿ⁺¹/(n+1) + C" },
  ],
};

const TABS = Object.keys(FORMULAS) as Array<keyof typeof FORMULAS>;

interface FormulaSheetProps {
  defaultTab?: string;
}

export function FormulaSheet({ defaultTab = "Physics" }: FormulaSheetProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<string>(defaultTab);
  const [search, setSearch] = useState("");

  const filtered = FORMULAS[tab].filter(
    f => !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.formula.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 w-12 h-12 rounded-2xl bg-card/90 backdrop-blur-md border border-white/10 shadow-xl flex items-center justify-center hover:border-primary/40 hover:bg-primary/10 transition-all"
        title="Formula Sheet"
      >
        <BookOpen className="w-5 h-5 text-primary" />
      </motion.button>

      {/* Sheet overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] bg-card border-t border-white/10 rounded-t-3xl shadow-2xl flex flex-col"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>

              {/* Header */}
              <div className="px-5 pb-3 shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-2xl text-white">FORMULA SHEETS</h2>
                  <button onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-white/8 text-muted-foreground hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1">
                  {TABS.map(t => (
                    <button key={t} onClick={() => { setTab(t); setSearch(""); }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${tab === t ? "bg-primary text-white" : "text-muted-foreground hover:text-white bg-white/5"}`}>
                      {t}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search formulas…"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-muted-foreground outline-none focus:border-primary/40" />
              </div>

              {/* Formulas list */}
              <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2">
                {filtered.map((f, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="p-3 rounded-xl border border-white/6 bg-white/3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-muted-foreground truncate">{f.name}</div>
                      <div className="font-mono text-sm text-white font-bold mt-0.5">{f.formula}</div>
                      {f.note && <div className="text-xs text-muted-foreground/60 mt-0.5">{f.note}</div>}
                    </div>
                  </motion.div>
                ))}
                {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">No formulas match "{search}"</p>}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

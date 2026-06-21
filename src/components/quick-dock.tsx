import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, FileText, Factory, Users, Keyboard, X, Calculator } from "lucide-react";
import { toast } from "sonner";

const ACTIONS = [
  { to: "/customers", label: "Customers (Alt + C)", icon: Users, key: "c", color: "text-success" },
  {
    to: "/quotations/new",
    label: "New Quote (Alt + Q)",
    icon: FileText,
    key: "q",
    color: "text-primary",
  },
  { to: "/jobs", label: "Production (Alt + J)", icon: Factory, key: "j", color: "text-warning" },
  {
    to: "/calculators",
    label: "Calculators (Alt + K)",
    icon: Calculator,
    key: "k",
    color: "text-chart-5",
  },
] as const;

export function QuickDock() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Look for Alt Key combinations
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const char = e.key.toLowerCase();
        const action = ACTIONS.find((a) => a.key === char);
        if (action) {
          e.preventDefault();
          toast.info(`Shortcut: Redirecting to ${action.label.split(" (")[0]}...`);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          navigate({ to: action.to } as any);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Show a quick tooltip toast once on mount to tell the user about the hotkeys
    const timer = setTimeout(() => {
      toast("⚡ Pro Tip: Press Alt + [Q, C, J, K] for quick actions!", {
        description: "Alt+Q: New Quote | Alt+C: Customers | Alt+J: Jobs | Alt+K: Calculators",
        duration: 8000,
        action: {
          label: "Dismiss",
          onClick: () => {},
        },
      });
    }, 2000);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
      <AnimatePresence>
        {open && (
          <div className="flex flex-col items-end gap-2.5 mb-2 pointer-events-auto">
            {ACTIONS.map((action, i) => (
              <motion.button
                key={action.to}
                initial={{ opacity: 0, scale: 0.8, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 15 }}
                transition={{ delay: (ACTIONS.length - 1 - i) * 0.05, duration: 0.2 }}
                onClick={() => {
                  setOpen(false);
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  navigate({ to: action.to } as any);
                }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl glass-panel-elevated hover:bg-white/5 text-foreground hover:-translate-x-1.5 transition-all cursor-pointer border border-white/5 shadow-2xl"
              >
                <span className="text-xs font-semibold tracking-wide font-display text-muted-foreground hover:text-foreground">
                  {action.label}
                </span>
                <div
                  className={`size-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 ${action.color}`}
                >
                  <action.icon className="size-4" />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 pointer-events-auto">
        <AnimatePresence>
          {showTips && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="px-3.5 py-2 rounded-xl glass-panel border border-white/5 text-[11px] font-medium text-muted-foreground mr-1.5 flex items-center gap-2 font-display"
            >
              <Keyboard className="size-3.5 text-primary" />
              <span>Alt + Q / C / J / K</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setOpen(!open)}
          onMouseEnter={() => setShowTips(true)}
          onMouseLeave={() => setShowTips(false)}
          className={`size-12.5 rounded-full flex items-center justify-center cursor-pointer border shadow-[var(--shadow-elevated)] transition-all ${
            open
              ? "bg-destructive border-white/10 text-destructive-foreground rotate-90"
              : "gradient-industrial border-white/5 text-primary-foreground hover:scale-105 shadow-[var(--shadow-glow)] animate-pulse-glow"
          }`}
          whileTap={{ scale: 0.95 }}
        >
          {open ? <X className="size-5" /> : <Zap className="size-5" />}
        </motion.button>
      </div>
    </div>
  );
}

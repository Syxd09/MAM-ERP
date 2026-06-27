import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, FileText, Factory, Users, Keyboard, X, Calculator } from "lucide-react";
import { toast } from "sonner";

const ACTIONS = [
  { to: "/customers", label: "Customers (Alt + C)", icon: Users, key: "c", color: "text-green-500" },
  {
    to: "/quotations/new",
    label: "New Quote (Alt + Q)",
    icon: FileText,
    key: "q",
    color: "text-blue-500",
  },
  { to: "/jobs", label: "Production (Alt + J)", icon: Factory, key: "j", color: "text-amber-500" },
  {
    to: "/calculators",
    label: "Calculators (Alt + K)",
    icon: Calculator,
    key: "k",
    color: "text-purple-500",
  },
] as const;

export function QuickDock() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const char = e.key.toLowerCase();
        const action = ACTIONS.find((a) => a.key === char);
        if (action) {
          e.preventDefault();
          toast.info(`Redirecting to ${action.label.split(" (")[0]}...`);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          navigate({ to: action.to } as any);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    const timer = setTimeout(() => {
      toast("⚡ Shortcuts: Press Alt + [Q, C, J, K] for quick navigation!", {
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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none font-sans">
      <AnimatePresence>
        {open && (
          <div className="flex flex-col items-end gap-1.5 mb-1.5 pointer-events-auto">
            {ACTIONS.map((action) => (
              <button
                key={action.to}
                onClick={() => {
                  setOpen(false);
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  navigate({ to: action.to } as any);
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-sm bg-card border border-border hover:bg-muted text-foreground hover:-translate-x-1 transition-all cursor-pointer shadow-md"
              >
                <span className="text-[11px] font-semibold text-muted-foreground hover:text-foreground">
                  {action.label}
                </span>
                <div
                  className={`size-7 rounded-sm bg-background flex items-center justify-center border border-border ${action.color}`}
                >
                  <action.icon className="size-3.5" />
                </div>
              </button>
            ))}
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 pointer-events-auto">
        <AnimatePresence>
          {showTips && (
            <div className="px-3 py-1.5 rounded-sm bg-card border border-border text-[10px] font-bold text-muted-foreground mr-1 flex items-center gap-1.5">
              <Keyboard className="size-3.5 text-primary" />
              <span>Alt + Q / C / J / K</span>
            </div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setOpen(!open)}
          onMouseEnter={() => setShowTips(true)}
          onMouseLeave={() => setShowTips(false)}
          className={`size-10 rounded-sm flex items-center justify-center cursor-pointer border shadow-md transition-all ${
            open
              ? "bg-destructive border-border text-destructive-foreground"
              : "bg-primary border-primary text-white hover:bg-primary/95"
          }`}
        >
          {open ? <X className="size-4.5" /> : <Zap className="size-4.5" />}
        </button>
      </div>
    </div>
  );
}

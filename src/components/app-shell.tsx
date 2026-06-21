import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  FileText,
  Factory,
  Calculator,
  ClipboardList,
  LogOut,
  Settings,
  Activity,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CommandPalette, CommandTrigger } from "@/components/command-palette";
import { NotificationsBell } from "@/components/notifications-bell";
import { PageTransition } from "@/components/page-transition";
import { QuickDock } from "@/components/quick-dock";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/quotations", label: "Quotations", icon: FileText },
  { to: "/jobs", label: "Production", icon: Factory },
  { to: "/calculators", label: "Calculators", icon: Calculator },
  { to: "/reports", label: "Reports", icon: ClipboardList },
  { to: "/activity", label: "Activity Log", icon: Activity },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [paletteOpen, setPaletteOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const [{ data: prof }, { data: roles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,full_name,email,avatar_url")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      return { user, profile: prof, roles: roles?.map((r) => r.role) ?? [] };
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const initials = (profile?.profile?.full_name || profile?.user?.email || "U")
    .split(" ")
    .map((s: string) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen flex w-full bg-background">
      <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} />
      <QuickDock />

      {/* Sidebar navigation */}
      <aside className="hidden md:flex flex-col w-64 glass-panel border border-white/5 m-4 rounded-2xl shadow-[var(--shadow-panel)] sticky top-4 h-[calc(100vh-2rem)] bg-card/25 backdrop-blur-xl">
        <div className="h-16 flex items-center gap-3 px-4 border-b border-border/40">
          <div className="size-9 rounded-xl bg-gradient-to-tr from-primary to-chart-5 flex items-center justify-center shadow-[var(--shadow-glow)]">
            <Factory className="size-5 text-primary-foreground animate-float" />
          </div>
          <div className="leading-tight">
            <div className="font-display font-bold text-gradient text-base tracking-tight">
              MAM Industries
            </div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-mono">
              ERP Console
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto">
          {nav.map((item, i) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <motion.div
                key={item.to}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02, duration: 0.2, ease: "easeOut" }}
              >
                <Link
                  to={item.to}
                  preload="intent"
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 border",
                    active
                      ? "bg-primary/10 text-primary border-primary/20 shadow-[0_4px_15px_rgba(79,70,229,0.06)]"
                      : "text-muted-foreground border-transparent hover:bg-white/5 hover:text-foreground hover:translate-x-0.5",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="sidebar-active-pill"
                      className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-primary shadow-[var(--shadow-glow)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={cn(
                      "size-4.5 transition-transform duration-200",
                      active ? "text-primary scale-105" : "group-hover:scale-105",
                    )}
                  />
                  {item.label}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/40 text-[9px] text-muted-foreground uppercase tracking-widest font-mono flex items-center justify-between">
          <span>v2.0 · Carbon ERP</span>
          <span className="size-1.5 rounded-full bg-success animate-pulse" />
        </div>
      </aside>

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border/40 bg-background/40 backdrop-blur-md sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6 shadow-sm">
          <CommandTrigger onClick={() => setPaletteOpen(true)} />
          <div className="flex-1" />
          <NotificationsBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="gap-2.5 h-11 px-2.5 rounded-xl border border-transparent hover:border-white/5 hover:bg-white/5 cursor-pointer"
              >
                <span className="size-8.5 rounded-full bg-gradient-to-tr from-primary to-chart-5 flex items-center justify-center text-xs font-bold text-primary-foreground shadow-[var(--shadow-glow)]">
                  {initials}
                </span>
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-sm font-medium text-foreground">
                    {profile?.profile?.full_name || profile?.user?.email}
                  </span>
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono mt-0.5">
                    {profile?.roles?.[0] || "user"}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 mt-1.5 border border-white/5 bg-popover/90 backdrop-blur-xl rounded-xl"
            >
              <DropdownMenuLabel className="font-normal px-3.5 py-3">
                <span className="text-xs text-muted-foreground">Signed in as</span>
                <div className="text-sm font-medium text-foreground truncate mt-0.5">
                  {profile?.user?.email}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/40" />
              <DropdownMenuItem className="cursor-pointer focus:bg-white/5 rounded-lg py-2.5 px-3">
                <User className="size-4.5 mr-2.5 text-muted-foreground" />
                Profile Details
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer focus:bg-white/5 rounded-lg py-2.5 px-3">
                <Settings className="size-4.5 mr-2.5 text-muted-foreground" />
                Console Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/40" />
              <DropdownMenuItem
                onClick={signOut}
                className="text-destructive cursor-pointer focus:bg-destructive/10 rounded-lg py-2.5 px-3"
              >
                <LogOut className="size-4.5 mr-2.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Mobile Horizontal Navigation Scroll */}
        <div className="md:hidden overflow-x-auto border-b border-border/40 bg-card/20 backdrop-blur-md">
          <div className="flex gap-1.5 p-2 min-w-max">
            {nav.map((item) => {
              const active = pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  preload="intent"
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium border transition-all duration-200",
                    active
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "text-muted-foreground border-transparent hover:text-foreground hover:bg-white/5",
                  )}
                >
                  <Icon className="size-3.5" /> {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}

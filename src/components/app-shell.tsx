import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Users, UserPlus, FileText, Factory, Calculator, ClipboardList, LogOut, Settings, Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/leads", label: "Leads / CRM", icon: UserPlus },
  { to: "/follow-ups", label: "Follow-ups", icon: Bell },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/quotations", label: "Quotations", icon: FileText },
  { to: "/jobs", label: "Production", icon: Factory },
  { to: "/calculators", label: "Calculators", icon: Calculator },
  { to: "/reports", label: "Reports", icon: ClipboardList },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: profile } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const [{ data: prof }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      return { user, profile: prof, roles: roles?.map(r => r.role) ?? [] };
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const initials = (profile?.profile?.full_name || profile?.user?.email || "U")
    .split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex w-full">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border">
        <div className="h-16 flex items-center gap-3 px-4 border-b border-sidebar-border">
          <div className="size-9 rounded-lg gradient-industrial flex items-center justify-center">
            <Factory className="size-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-display font-bold text-sidebar-foreground">MAM Industries</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">ERP Console</div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_var(--color-primary)]"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border text-[10px] text-muted-foreground uppercase tracking-widest">
          v1.0 · Industrial ERP
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search leads, customers, quotations…" className="pl-9 bg-background/60" />
          </div>
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 h-10">
                <span className="size-8 rounded-full gradient-industrial flex items-center justify-center text-xs font-bold text-primary-foreground">{initials}</span>
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-sm font-medium">{profile?.profile?.full_name || profile?.user?.email}</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{profile?.roles?.[0] || "user"}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Signed in as<br/><span className="text-muted-foreground font-normal">{profile?.user?.email}</span></DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem><Settings className="size-4 mr-2" />Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive"><LogOut className="size-4 mr-2" />Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Mobile nav */}
        <div className="md:hidden overflow-x-auto border-b border-border bg-card/50">
          <div className="flex gap-1 p-2 min-w-max">
            {nav.map((item) => {
              const active = pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-xs whitespace-nowrap", active ? "bg-accent text-accent-foreground" : "text-muted-foreground")}>
                  <Icon className="size-3.5" /> {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import {
  FileText,
  LayoutDashboard,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/employer", icon: LayoutDashboard },
  { title: "Employees", url: "/employer/employees", icon: Users },
  { title: "Payroll", url: "/employer/payroll", icon: Wallet },
  { title: "Invoices", url: "/employer/invoices", icon: FileText },
  { title: "Settings", url: "/employer/settings", icon: Settings },
];

export default function EmployerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("stablepay_user");
    if (!stored) {
      navigate("/login");
      return;
    }
    setUser(JSON.parse(stored));
  }, [navigate]);

  function handleLogout() {
    localStorage.removeItem("stablepay_token");
    localStorage.removeItem("stablepay_user");
    navigate("/login");
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">SP</span>
            </div>
            <div>
              <p className="text-sm font-semibold">StablePay</p>
              <p className="text-xs text-muted-foreground">Employer Portal</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="px-2 py-2">
            {user && (
              <p className="mb-2 truncate font-mono text-xs text-muted-foreground">
                {user.wallet_address}
              </p>
            )}
            <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h2 className="text-sm font-medium">
            {navItems.find((item) => item.url === location.pathname)?.title || "StablePay"}
          </h2>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

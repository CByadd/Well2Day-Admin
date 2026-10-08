import { Activity, MonitorDot, ImageIcon, List, Calendar, LogOut, Users, Shield, MessageSquare, Download } from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const navigationItems = [
  { title: "Dashboard", url: "/dashboard", icon: Activity },
  { title: "Screens", url: "/screens", icon: MonitorDot },
  { title: "Users", url: "/users", icon: Users },
  { title: "Media", url: "/media", icon: ImageIcon },
  { title: "Playlists", url: "/playlists", icon: List },
  // { title: "Schedules", url: "/schedules", icon: Calendar },
];

const adminNavigationItems = [
  { title: "Admins", url: "/admins", icon: Shield },
  { title: "App updates", url: "/app-updates", icon: Download },
];

const messageLimitsItem = { title: "Message limits", url: "/message-limits", icon: MessageSquare };

function NavItem({
  item,
  isCollapsed,
}: {
  item: { title: string; url: string; icon: React.ElementType };
  isCollapsed: boolean;
}) {
  const location = useLocation();
  const isActive =
    location.pathname === item.url ||
    location.pathname.startsWith(item.url + "/");

  const buttonContent = (
    <SidebarMenuButton
      asChild
      isActive={isActive}
      className="
        rounded-md
        transition-colors
        hover:bg-muted
        data-[active=true]:bg-primary/5
        data-[active=true]:border
        data-[active=true]:border-primary/30
        data-[active=true]:text-primary
      "
    >
      <NavLink
        to={item.url}
        className={`flex items-center gap-3 ${isCollapsed ? "justify-center px-2 py-2" : "px-3 py-2"}`}
      >
        <item.icon className="h-5 w-5 flex-shrink-0" />
        {!isCollapsed && <span>{item.title}</span>}
      </NavLink>
    </SidebarMenuButton>
  );

  return (
    <SidebarMenuItem key={item.title}>
      {isCollapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.title}
          </TooltipContent>
        </Tooltip>
      ) : (
        buttonContent
      )}
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
    });
    navigate("/");
  };

  const isCollapsed = state === "collapsed";

  const logoutButton = (
    <Button
      variant="ghost"
      onClick={handleLogout}
      className={`w-full ${isCollapsed ? "justify-center px-2" : "justify-start"}`}
    >
      <LogOut className="h-5 w-5 flex-shrink-0" />
      {!isCollapsed && <span className="ml-2">Logout</span>}
    </Button>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Sidebar className={isCollapsed ? "w-24" : "w-60"} collapsible="icon">
        <SidebarHeader className="px-3 py-6 border-b border-border/50">
          <div className={`flex items-center ${isCollapsed ? "justify-center" : "px-1"}`}>
            <img
              src="https://storage.googleapis.com/gpt-engineer-file-uploads/zKZOdDbOZrdjeJBnwIk8jC0KhyB2/uploads/1761858491287-well 2 day logo .jpg"
              className={`${isCollapsed ? "h-9 w-9" : "h-11 w-11"} object-contain flex-shrink-0 transition-all`}
              alt="logo"
            />
            {!isCollapsed && (
              <div className="ml-3 overflow-hidden">
                <h1 className="text-xl font-bold text-foreground leading-tight truncate">
                  Well2Day
                </h1>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Admin Panel
                </p>
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => (
                  <NavItem key={item.title} item={item} isCollapsed={isCollapsed} />
                ))}

                {user?.role === "admin" && (
                  <NavItem item={messageLimitsItem} isCollapsed={isCollapsed} />
                )}

                {user?.role === "super_admin" &&
                  adminNavigationItems.map((item) => (
                    <NavItem key={item.title} item={item} isCollapsed={isCollapsed} />
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-border p-3">
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>{logoutButton}</TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                Logout
              </TooltipContent>
            </Tooltip>
          ) : (
            logoutButton
          )}
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}

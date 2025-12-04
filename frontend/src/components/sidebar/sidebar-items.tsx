import { type SidebarItem, SidebarItemType } from "./Sidebar";

/**
 * Sentinel navigation items organized by sections
 *
 * Structure:
 * - Operations: Dashboard, Members, Visitors
 * - Events: All Events, Live Monitor (nested accordion)
 * - Admin: Reports, Settings (admin-only)
 */
export const sidebarItems: SidebarItem[] = [
  {
    key: "operations",
    title: "Operations",
    items: [
      {
        key: "dashboard",
        href: "/",
        icon: "solar:chart-square-outline",
        title: "Dashboard",
      },
      {
        key: "members",
        href: "/members",
        icon: "solar:users-group-two-rounded-outline",
        title: "Members",
      },
      {
        key: "visitors",
        href: "/visitors",
        icon: "solar:user-plus-outline",
        title: "Visitors",
      },
    ],
  },
  {
    key: "events",
    title: "Events",
    icon: "solar:calendar-outline",
    type: SidebarItemType.Nest,
    items: [
      {
        key: "all-events",
        href: "/events",
        icon: "solar:list-outline",
        title: "All Events",
      },
      {
        key: "live-monitor",
        href: "/events/monitor",
        icon: "solar:monitor-smartphone-outline",
        title: "Live Monitor",
      },
    ],
  },
  {
    key: "admin",
    title: "Admin",
    items: [
      {
        key: "reports",
        href: "/reports",
        icon: "solar:chart-outline",
        title: "Reports",
      },
      {
        key: "settings",
        href: "/settings",
        icon: "solar:settings-outline",
        title: "Settings",
        adminOnly: true,
      },
    ],
  },
];

/**
 * Get the sidebar key from a pathname
 */
export function getKeyFromPathname(pathname: string): string {
  if (pathname === "/") return "dashboard";
  if (pathname.startsWith("/members")) return "members";
  if (pathname.startsWith("/visitors")) return "visitors";
  if (pathname === "/events/monitor") return "live-monitor";
  if (pathname.startsWith("/events")) return "all-events";
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/settings")) return "settings";
  return "dashboard";
}

/**
 * Filter items based on user role
 */
export function filterItemsByRole(items: SidebarItem[], isAdmin: boolean): SidebarItem[] {
  return items
    .map((item) => {
      if (item.items) {
        const filteredChildren = item.items.filter((child) => !child.adminOnly || isAdmin);
        if (filteredChildren.length === 0) return null;
        return { ...item, items: filteredChildren };
      }
      if (item.adminOnly && !isAdmin) return null;
      return item;
    })
    .filter((item): item is SidebarItem => item !== null);
}

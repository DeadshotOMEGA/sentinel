import type { SidebarItem } from "./Sidebar";

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
    items: [
      {
        key: "events",
        href: "/events",
        icon: "solar:calendar-outline",
        title: "Events",
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
        key: "logs",
        href: "/logs",
        icon: "solar:document-text-outline",
        title: "Logs",
        adminOnly: true,
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
  if (pathname.startsWith("/events")) return "events";
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/logs")) return "logs";
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

import { type SidebarItem } from "./Sidebar";

export const sidebarItems: SidebarItem[] = [
  {
    key: "dashboard",
    href: "/",
    icon: "solar:chart-2-outline",
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
    icon: "solar:user-plus-rounded-outline",
    title: "Visitors",
  },
  {
    key: "events",
    href: "/events",
    icon: "solar:calendar-outline",
    title: "Events",
  },
  {
    key: "reports",
    href: "/reports",
    icon: "solar:document-text-outline",
    title: "Reports",
  },
  {
    key: "settings",
    href: "/settings",
    icon: "solar:settings-outline",
    title: "Settings",
  },
];

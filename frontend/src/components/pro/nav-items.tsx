import { type SidebarItem } from "./Sidebar";
import {
  BarChart3,
  Users,
  UserPlus,
  Calendar,
  FileText,
  Settings,
} from '@shared/ui/icons';

export const sidebarItems: SidebarItem[] = [
  {
    key: "dashboard",
    href: "/",
    icon: BarChart3,
    title: "Dashboard",
  },
  {
    key: "members",
    href: "/members",
    icon: Users,
    title: "Members",
  },
  {
    key: "visitors",
    href: "/visitors",
    icon: UserPlus,
    title: "Visitors",
  },
  {
    key: "events",
    href: "/events",
    icon: Calendar,
    title: "Events",
  },
  {
    key: "reports",
    href: "/reports",
    icon: FileText,
    title: "Reports",
  },
  {
    key: "settings",
    href: "/settings",
    icon: Settings,
    title: "Settings",
  },
];

import {
  LayoutDashboard, Radio, MapPin, Video, Users, FileBarChart, ScrollText, Bell, Settings,
  type LucideIcon,
} from "lucide-react";
import type { AppRole } from "@/lib/auth";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: AppRole[];
}

const ALL: AppRole[] = ["super_admin", "coordinator"];
const ADMIN: AppRole[] = ["super_admin"];

export const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/", icon: LayoutDashboard, roles: ALL },
  { label: "Live Monitoring", href: "/live-monitoring", icon: Radio, roles: ALL },
  { label: "Venues", href: "/venues", icon: MapPin, roles: ADMIN },
  { label: "Meetings", href: "/meetings", icon: Video, roles: ADMIN },
  { label: "Coordinators", href: "/coordinators", icon: Users, roles: ADMIN },
  { label: "Attendance & Reports", href: "/reports", icon: FileBarChart, roles: ALL },
  { label: "Activity Logs", href: "/logs", icon: ScrollText, roles: ADMIN },
  { label: "Notifications", href: "/notifications", icon: Bell, roles: ALL },
  { label: "Settings", href: "/settings", icon: Settings, roles: ADMIN },
];

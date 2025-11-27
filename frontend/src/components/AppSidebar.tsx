import { useLocation, useNavigate } from "react-router-dom";
import { Avatar } from "@heroui/react";
import { useAuth } from "../hooks/useAuth";
import Sidebar from "./pro/Sidebar";
import { sidebarItems } from "./pro/nav-items";

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Determine current key from path
  const pathSegment = location.pathname.split("/")[1];
  const currentKey = location.pathname === "/" ? "dashboard" : pathSegment ? pathSegment : "dashboard";

  const handleSelect = (key: string) => {
    const item = sidebarItems.find(i => i.key === key);
    if (item?.href) {
      navigate(item.href);
    }
  };

  // Filter items based on user role (settings is admin-only)
  const filteredItems = sidebarItems.filter(item => {
    if (item.key === 'settings') {
      return user?.role === 'admin';
    }
    return true;
  });

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-divider bg-content1">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-divider px-6">
        <span className="text-xl font-bold text-primary">Sentinel</span>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <Sidebar
          items={filteredItems}
          defaultSelectedKey={currentKey}
          onSelect={handleSelect}
        />
      </div>

      {/* User section */}
      <div className="border-t border-divider p-4">
        <div className="flex items-center gap-3">
          <Avatar
            size="sm"
            name={user ? `${user.firstName} ${user.lastName}` : "User"}
          />
          <div className="text-sm">
            <p className="font-medium">{user?.firstName} {user?.lastName}</p>
            <p className="text-default-500 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

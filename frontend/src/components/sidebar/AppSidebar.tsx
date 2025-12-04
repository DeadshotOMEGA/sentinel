import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, Button, ScrollShadow, Spacer } from "@heroui/react";
import { Icon } from "@iconify/react";
import { cn } from "@heroui/react";

import Sidebar from "./Sidebar";
import { SentinelIcon } from "./SentinelIcon";
import { sidebarItems, getKeyFromPathname, filterItemsByRole } from "./sidebar-items";
import { useAuth } from "../../hooks/useAuth";

export default function AppSidebar() {
  const [isCompact, setIsCompact] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === "admin";
  const filteredItems = filterItemsByRole(sidebarItems, isAdmin);
  const currentKey = getKeyFromPathname(location.pathname);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleSelect = (key: string) => {
    // Find the item and navigate to its href
    const findHref = (items: typeof sidebarItems): string | undefined => {
      for (const item of items) {
        if (item.key === key && item.href) return item.href;
        if (item.items) {
          const found = findHref(item.items);
          if (found) return found;
        }
      }
      return undefined;
    };
    const href = findHref(filteredItems);
    if (href) navigate(href);
  };

  return (
    <div
      className={cn(
        "relative flex h-full flex-col border-r border-divider bg-background transition-width duration-200",
        isCompact ? "w-16" : "w-72"
      )}
    >
      {/* Header: Logo + Toggle */}
      <div className="flex h-16 items-center justify-between px-4">
        <div className={cn("flex items-center gap-2", isCompact && "justify-center w-full")}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
            <SentinelIcon className="text-white" size={20} />
          </div>
          {!isCompact && (
            <span className="text-small font-bold uppercase text-foreground">
              Sentinel
            </span>
          )}
        </div>
        {!isCompact && (
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={() => setIsCompact(true)}
            aria-label="Collapse sidebar"
          >
            <Icon
              className="text-default-500"
              icon="solar:sidebar-minimalistic-outline"
              width={20}
            />
          </Button>
        )}
      </div>

      {/* Expand button when compact */}
      {isCompact && (
        <div className="flex justify-center py-2">
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={() => setIsCompact(false)}
            aria-label="Expand sidebar"
          >
            <Icon
              className="text-default-500"
              icon="solar:sidebar-minimalistic-outline"
              width={20}
            />
          </Button>
        </div>
      )}

      {/* User Avatar Section */}
      {!isCompact && (
        <>
          <Spacer y={2} />
          <div className="flex items-center gap-3 px-4">
            <Avatar
              isBordered
              size="sm"
              name={`${user?.firstName} ${user?.lastName}`}
              className="bg-primary text-white"
            />
            <div className="flex flex-col">
              <p className="text-small font-medium text-foreground">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-tiny text-default-400 capitalize">{user?.role}</p>
            </div>
          </div>
        </>
      )}

      {isCompact && (
        <div className="flex justify-center py-2">
          <Avatar
            isBordered
            size="sm"
            name={`${user?.firstName} ${user?.lastName}`}
            className="bg-primary text-white"
          />
        </div>
      )}

      {/* Navigation */}
      <ScrollShadow className="flex-1 px-2 py-4">
        <Sidebar
          defaultSelectedKey={currentKey}
          isCompact={isCompact}
          items={filteredItems}
          onItemSelect={handleSelect}
        />
      </ScrollShadow>

      {/* Footer Actions */}
      <div className="mt-auto border-t border-divider p-2">
        {isCompact ? (
          <div className="flex flex-col items-center gap-1">
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={handleLogout}
              aria-label="Log out"
            >
              <Icon
                className="text-default-500 rotate-180"
                icon="solar:logout-2-outline"
                width={20}
              />
            </Button>
          </div>
        ) : (
          <Button
            fullWidth
            className="justify-start text-default-500 data-[hover=true]:text-foreground"
            startContent={
              <Icon
                className="text-default-500 rotate-180"
                icon="solar:logout-2-outline"
                width={24}
              />
            }
            variant="light"
            onPress={handleLogout}
          >
            Log Out
          </Button>
        )}
      </div>
    </div>
  );
}

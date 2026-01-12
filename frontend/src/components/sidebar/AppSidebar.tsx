import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, Button, ScrollShadow, Spacer, Tooltip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { cn } from "@heroui/react";

import Sidebar from "./Sidebar";
import { SentinelIcon } from "./SentinelIcon";
import { sidebarItems, getKeyFromPathname, filterItemsByRole } from "./sidebar-items";
import { useAuth } from "../../hooks/useAuth";
import { useConnectionStatus, type ConnectionStatus } from "../../hooks/useConnectionStatus";

function ConnectionStatusIndicator({ status, isCompact }: { status: ConnectionStatus; isCompact: boolean }) {
  const statusConfig = {
    connected: {
      color: "bg-success",
      label: "Backend Connected",
      icon: "solar:check-circle-bold",
    },
    disconnected: {
      color: "bg-danger",
      label: "Backend Disconnected",
      icon: "solar:close-circle-bold",
    },
    checking: {
      color: "bg-warning animate-pulse",
      label: "Checking Connection...",
      icon: "solar:refresh-circle-bold",
    },
  };

  const config = statusConfig[status];

  if (isCompact) {
    return (
      <Tooltip content={config.label} placement="right">
        <div className="flex justify-center py-2">
          <div className={cn("h-2.5 w-2.5 rounded-full", config.color)} />
        </div>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div className={cn("h-2 w-2 rounded-full", config.color)} />
      <span className="text-tiny text-default-500">{config.label}</span>
    </div>
  );
}

export default function AppSidebar() {
  const [isCompact, setIsCompact] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const connectionStatus = useConnectionStatus();

  // In dev mode, grant admin access for testing; otherwise check user role
  const isAdmin = import.meta.env.DEV || user?.role === "admin";
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
        isCompact ? "w-14" : "w-48"
      )}
    >
      {/* Header: Logo + Toggle */}
      <div className="flex h-12 items-center justify-between px-2">
        <div className={cn("flex items-center gap-2", isCompact && "justify-center w-full")}>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary">
            <SentinelIcon className="text-white" size={16} />
          </div>
          {!isCompact && (
            <span className="text-xs font-bold uppercase text-foreground">
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
          <Spacer y={1} />
          <div className="flex items-center gap-2 px-2">
            <Avatar
              isBordered
              size="sm"
              name={`${user?.firstName} ${user?.lastName}`}
            />
            <div className="flex flex-col">
              <p className="text-xs font-medium text-default-600 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-tiny text-default-400 capitalize">{user?.role}</p>
            </div>
          </div>
        </>
      )}

      {isCompact && (
        <div className="flex justify-center py-2">
          <Tooltip content={`${user?.firstName} ${user?.lastName}`} placement="right">
            <Avatar
              isBordered
              size="sm"
              name={`${user?.firstName} ${user?.lastName}`}
            />
          </Tooltip>
        </div>
      )}

      {/* Navigation */}
      <ScrollShadow className="flex-1 px-1 py-2">
        <Sidebar
          defaultSelectedKey={currentKey}
          isCompact={isCompact}
          items={filteredItems}
          onItemSelect={handleSelect}
        />
      </ScrollShadow>

      {/* Footer: Connection Status + Actions */}
      <div className="mt-auto border-t border-divider">
        <ConnectionStatusIndicator status={connectionStatus} isCompact={isCompact} />
        <div className="p-1">
        {isCompact ? (
          <div className="flex flex-col items-center gap-1">
            <Tooltip content="Log Out" placement="right">
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={handleLogout}
                aria-label="Log out"
              >
                <Icon
                  className="text-default-500 rotate-180"
                  icon="solar:minus-circle-line-duotone"
                  width={20}
                />
              </Button>
            </Tooltip>
          </div>
        ) : (
          <Button
            fullWidth
            className="justify-start text-default-500 data-[hover=true]:text-foreground"
            startContent={
              <Icon
                className="text-default-500 rotate-180"
                icon="solar:minus-circle-line-duotone"
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
    </div>
  );
}

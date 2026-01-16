/**
 * @sentinel/ui - Sentinel Design System
 *
 * Re-exports HeroUI components with Sentinel theming.
 */

// Theme configuration (canonical - purple secondary)
export {
  designTokens,
  sentinelTheme,
  tailwindExtend,
  cssVariables,
  componentStyles,
  statusColors,
  getStatusColor,
  type StatusColorKey,
  type StatusColorValue,
} from "./theme";

// Utility design tokens
export {
  layout,
  fonts,
  typography,
  textColors,
  statusColors as utilStatusColors, // Avoid conflict with theme statusColors
  badgeColors,
  touchTargets,
  focus,
  transitions,
  legacyStatusColors,
  getStatusColor as getLegacyStatusColor, // Avoid conflict
  type LegacyStatusColor,
} from "./tokens";

// Re-export commonly used HeroUI components
// Apps can import directly from @heroui/react for full access
export {
  // Provider
  HeroUIProvider,
  // Buttons
  Button,
  ButtonGroup,
  // Inputs
  Input,
  Textarea,
  Select,
  SelectItem,
  Checkbox,
  CheckboxGroup,
  Radio,
  RadioGroup,
  Switch,
  // Data display
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Chip,
  Badge as HeroUIBadge,
  Avatar,
  AvatarGroup,
  // Feedback
  Spinner,
  Progress,
  Skeleton,
  // Overlays
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Tooltip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  // Navigation
  Tabs,
  Tab,
  Breadcrumbs,
  BreadcrumbItem,
  Pagination,
  Link,
  // Layout
  Divider,
  Spacer,
  // Disclosure
  Accordion,
  AccordionItem,
} from "@heroui/react";

// Icons
export { Icon } from "./components/Icon";
export * as icons from "./icons";

// Components
export { Badge, type BadgeVariant, type BadgeSize } from "./components/Badge";

// Tooltips
export { IconTooltip } from "./components/tooltips/IconTooltip";
export { StatusTooltip } from "./components/tooltips/StatusTooltip";
export { TruncatedText } from "./components/tooltips/TruncatedText";

// Layout
export { PageWrapper } from "./components/PageWrapper";

// Display components
export { Clock } from "./components/Clock";
export { ConnectionStatus } from "./components/ConnectionStatus";
export { PresenceCards } from "./components/PresenceCards";
export { DivisionStats } from "./components/DivisionStats";
export { StatsCard, type StatsCardVariant } from "./components/StatsCard";
export { EmptyState, type EmptyStateVariant } from "./components/EmptyState";
export { DataTable, type Column, type SortDirection, type DataTableProps } from "./components/DataTable";
export { SearchBar } from "./components/SearchBar";
export { TablePagination, type TablePaginationProps } from "./components/Pagination";
export { Logo, type LogoSize, type LogoVariant, type LogoProps } from "./components/Logo";
export { default as SkipNav } from "./components/SkipNav";

// Loading skeletons
export { Skeleton as SentinelSkeleton } from "./components/Skeleton";
export { TableSkeleton } from "./components/TableSkeleton";
export { CardSkeleton } from "./components/CardSkeleton";

// Error handling
export { ErrorBoundary } from "./components/ErrorBoundary";
export { ErrorFallback, type ErrorFallbackVariant } from "./components/ErrorFallback";

// Hooks
export { useDebounce } from "./hooks/useDebounce";
export { useIsOverflowing } from "./hooks/useIsOverflowing";
export { ConfirmDialog, type ConfirmDialogVariant } from "./components/ConfirmDialog";

// Utilities - rank sorting
export {
  MESS_PRIORITY,
  RANK_PRIORITY,
  getMessPriority,
  getRankPriority,
  isOfficer,
  sortMembersByMess,
  sortMembersByRank,
  sortMembers,
  type SortableMember,
} from "../utils/rank-sorting";

// Utilities - chip variants
export {
  getMemberStatusChipVariant,
  getBadgeStatusChipVariant,
  getTagChipVariant,
  getMemberTypeChipVariant,
  getDivisionChipVariant,
  getMessChipVariant,
  getMocChipVariant,
  getVisitTypeChipVariant,
  type ChipVariant,
  type ChipRadius,
} from "../utils/chip-variants";

// Utilities - tag colors
export {
  getTagColor,
  type HeroUIColor,
} from "../utils/tag-colors";

// Utilities - activity feed
export {
  filterActivityItems,
  getActivityBorderColor,
  getActivityBadgeColor,
  getActivityBadgeLabel,
  getActivitySecondaryInfo,
  getVisitorDetails,
  VISIT_TYPE_LABELS,
  type ActivityDirection,
  type ActivityTypeFilter,
  type ActivityDirectionFilter,
} from "../utils/activity-feed";

// Utilities - log formatting
export {
  getLogLevelColor,
  formatLogTime,
  truncateId,
  truncateMessage,
  getLogLevelLabel,
  type LogLevelColor,
} from "../utils/log-formatting";

// Activity components
export {
  ActivityPanel,
  type ActivityPanelProps,
  type ActivityPanelStats,
} from "./components/ActivityPanel";

// Log components
export {
  LogViewer,
  type LogViewerProps,
} from "./components/LogViewer";

// Badge and Tag chips
export {
  BadgeChip,
  StatusChip,
  type BadgeChipProps,
  type BadgeChipBadge,
  type BadgeStatusType,
} from "./components/BadgeChip";

export {
  TagChip,
  type TagChipProps,
} from "./components/TagChip";

// Network status components
export {
  NetworkIndicator,
  type NetworkIndicatorProps,
  type NetworkStatus,
} from "./components/NetworkIndicator";

export {
  SyncStatus,
  type SyncStatusProps,
  type SyncProgress,
} from "./components/SyncStatus";

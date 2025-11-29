/**
 * @sentinel/ui - Sentinel Design System
 *
 * Re-exports HeroUI components with Sentinel theming.
 */

// Design tokens
export {
  colors,
  layout,
  fonts,
  sentinelTheme,
  statusColors,
  getStatusColor,
  transitions,
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
export { ConfirmDialog, type ConfirmDialogVariant } from "./components/ConfirmDialog";

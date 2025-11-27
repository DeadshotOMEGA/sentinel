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
  type StatusColor,
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
  Badge,
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

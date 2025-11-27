/**
 * HeroUI v2 Re-exports
 *
 * Simple re-exports from @heroui/react v2.8.x for consistent imports.
 * These components use the native v2 API.
 */

export {
  // Core components
  Button,
  Input,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Avatar,
  Tab,
  Tabs,
  Select,
  SelectItem,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  Textarea as TextArea,
  Listbox,
  ListboxItem,
  ListboxSection,
  Accordion,
  AccordionItem,
  Checkbox,
  Spinner,
  Switch,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Skeleton,
  Link,
  Progress as ProgressBar,
  Tooltip,
  Divider,
  Badge,
  // Provider
  HeroUIProvider,
} from '@heroui/react';

// Re-export types
export type {
  Selection,
  ChipProps,
  ButtonProps,
  InputProps,
  CardProps,
  ModalProps,
  SelectProps,
  ListboxProps,
  ListboxItemProps,
  ListboxSectionProps,
} from '@heroui/react';

// Type aliases for backwards compatibility
export type { Listbox as ListBox } from '@heroui/react';
export type { ListboxItem as ListBoxItem } from '@heroui/react';
export type { ListboxSection as ListBoxSection } from '@heroui/react';

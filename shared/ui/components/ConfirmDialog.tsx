import { useEffect, useRef } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from '@heroui/react';
import { AlertTriangle, Info } from '../icons';
import { designTokens } from '../theme';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'neutral';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  isLoading?: boolean;
}

/**
 * Get button color and icon for variant
 */
function getVariantConfig(variant: ConfirmDialogVariant): {
  buttonColor: 'danger' | 'warning' | 'primary';
  icon: typeof AlertTriangle | typeof Info;
  iconColor: string;
} {
  switch (variant) {
    case 'danger':
      return {
        buttonColor: 'danger',
        icon: AlertTriangle,
        iconColor: designTokens.colors.danger.DEFAULT,
      };
    case 'warning':
      return {
        buttonColor: 'warning',
        icon: AlertTriangle,
        iconColor: designTokens.colors.warning.DEFAULT,
      };
    case 'neutral':
      return {
        buttonColor: 'primary',
        icon: Info,
        iconColor: designTokens.colors.primary.DEFAULT,
      };
  }
}

/**
 * ConfirmDialog component for destructive actions like delete and sign-out
 *
 * Follows WCAG AA accessibility guidelines:
 * - role="dialog" and aria-modal="true"
 * - aria-labelledby pointing to title
 * - aria-describedby pointing to message
 * - Focus trapped in dialog
 * - ESC key closes dialog
 * - Focus returns to trigger on close
 *
 * @example
 * ```tsx
 * import { ConfirmDialog } from '@sentinel/ui';
 *
 * // Delete confirmation
 * <ConfirmDialog
 *   isOpen={showDeleteConfirm}
 *   onClose={() => setShowDeleteConfirm(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Member"
 *   message="Are you sure you want to delete John Smith? This action cannot be undone."
 *   confirmLabel="Delete"
 *   variant="danger"
 * />
 *
 * // Warning confirmation
 * <ConfirmDialog
 *   isOpen={showSignOutConfirm}
 *   onClose={() => setShowSignOutConfirm(false)}
 *   onConfirm={handleSignOut}
 *   title="Sign Out"
 *   message="Are you sure you want to sign out? You will need to log in again."
 *   confirmLabel="Sign Out"
 *   variant="warning"
 * />
 * ```
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'neutral',
  isLoading = false,
}: ConfirmDialogProps) {
  const { buttonColor, icon: IconComponent, iconColor } = getVariantConfig(variant);
  const titleId = useRef(`confirm-dialog-title-${Math.random().toString(36).substr(2, 9)}`);
  const descId = useRef(`confirm-dialog-desc-${Math.random().toString(36).substr(2, 9)}`);

  // Focus trap: when dialog opens, focus the cancel button
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && cancelButtonRef.current) {
      // Small delay to ensure modal is rendered
      const timeout = setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      backdrop="opaque"
      placement="center"
      classNames={{
        backdrop: 'bg-black/50',
        wrapper: 'items-center justify-center',
      }}
      isDismissable={!isLoading}
      hideCloseButton={true}
      aria-labelledby={titleId.current}
      aria-describedby={descId.current}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex items-start gap-3 pb-2">
              <IconComponent
                size={24}
                aria-hidden="true"
                focusable={false}
                style={{ color: iconColor }}
                className="flex-shrink-0 mt-0.5"
              />
              <h2
                id={titleId.current}
                className="text-xl font-semibold leading-tight"
              >
                {title}
              </h2>
            </ModalHeader>

            <ModalBody className="pt-0 pb-4">
              <p
                id={descId.current}
                className="text-sm leading-relaxed"
                style={{ color: designTokens.colors.default[600] }}
              >
                {message}
              </p>
            </ModalBody>

            <ModalFooter className="pt-2">
              <Button
                ref={cancelButtonRef}
                variant="light"
                onPress={onClose}
                isDisabled={isLoading}
                className="font-medium"
              >
                {cancelLabel}
              </Button>
              <Button
                color={buttonColor}
                onPress={onConfirm}
                isLoading={isLoading}
                className="font-medium"
              >
                {confirmLabel}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

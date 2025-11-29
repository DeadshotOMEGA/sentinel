/**
 * Example usage of ConfirmDialog component
 * This file demonstrates the different variants and usage patterns
 */

import { useState } from 'react';
import { ConfirmDialog } from '../ConfirmDialog';
import { Button } from '@heroui/react';

export function ConfirmDialogExamples() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showNeutralConfirm, setShowNeutralConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsDeleting(false);
    setShowDeleteConfirm(false);
  };

  const handleSignOut = () => {
    console.log('Signing out...');
    setShowSignOutConfirm(false);
  };

  const handleConfirm = () => {
    console.log('Confirmed');
    setShowNeutralConfirm(false);
  };

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold mb-6">ConfirmDialog Examples</h1>

      {/* Danger variant - destructive actions */}
      <div>
        <Button color="danger" onPress={() => setShowDeleteConfirm(true)}>
          Delete Member
        </Button>
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title="Delete Member"
          message="Are you sure you want to delete John Smith? This action cannot be undone."
          confirmLabel="Delete"
          variant="danger"
          isLoading={isDeleting}
        />
      </div>

      {/* Warning variant - caution required */}
      <div>
        <Button color="warning" onPress={() => setShowSignOutConfirm(true)}>
          Sign Out
        </Button>
        <ConfirmDialog
          isOpen={showSignOutConfirm}
          onClose={() => setShowSignOutConfirm(false)}
          onConfirm={handleSignOut}
          title="Sign Out"
          message="Are you sure you want to sign out? You will need to log in again."
          confirmLabel="Sign Out"
          cancelLabel="Stay Signed In"
          variant="warning"
        />
      </div>

      {/* Neutral variant - informational confirmations */}
      <div>
        <Button color="primary" onPress={() => setShowNeutralConfirm(true)}>
          Proceed
        </Button>
        <ConfirmDialog
          isOpen={showNeutralConfirm}
          onClose={() => setShowNeutralConfirm(false)}
          onConfirm={handleConfirm}
          title="Proceed with Action"
          message="This will update the member's information. Do you want to continue?"
          confirmLabel="Yes, Proceed"
          cancelLabel="No, Cancel"
          variant="neutral"
        />
      </div>
    </div>
  );
}

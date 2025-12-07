/**
 * Toast notification utility using HeroUI Toast system
 */
import { addToast } from '@heroui/react';

export const toast = {
  success: (message: string) => {
    addToast({
      title: 'Success',
      description: message,
      color: 'success',
      timeout: 5000,
    });
  },
  error: (message: string) => {
    addToast({
      title: 'Error',
      description: message,
      color: 'danger',
      timeout: 8000,
    });
  },
  info: (message: string) => {
    addToast({
      title: 'Info',
      description: message,
      color: 'primary',
      timeout: 5000,
    });
  },
  warning: (message: string) => {
    addToast({
      title: 'Warning',
      description: message,
      color: 'warning',
      timeout: 6000,
    });
  },
};

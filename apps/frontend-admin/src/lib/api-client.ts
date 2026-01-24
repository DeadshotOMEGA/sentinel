import { initClient } from '@ts-rest/core';
import { apiContract } from '@sentinel/contracts';

export const apiClient = initClient(apiContract, {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  baseHeaders: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Include cookies for session auth
});

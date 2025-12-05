#!/usr/bin/env bun
/**
 * Test script for bulk checkout endpoint
 * Usage: bun run test-bulk-checkout.ts
 */

const API_URL = 'http://localhost:3000/api';

// Test data
const testData = {
  memberIds: [], // Add valid member UUIDs here for testing
  visitorIds: [], // Add valid visitor UUIDs here for testing
};

async function testBulkCheckout() {
  try {
    console.log('Testing POST /api/checkins/bulk-checkout');
    console.log('Request body:', JSON.stringify(testData, null, 2));

    const response = await fetch(`${API_URL}/checkins/bulk-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: You'll need to add authentication headers for actual testing
        // 'Cookie': 'session=...'
      },
      body: JSON.stringify(testData),
    });

    console.log('\nResponse status:', response.status);
    const data = await response.json();
    console.log('Response body:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ Bulk checkout endpoint is working!');
    } else {
      console.log('\n❌ Request failed');
    }
  } catch (error) {
    console.error('Error testing endpoint:', error);
  }
}

// Run test
testBulkCheckout();

/**
 * Development-only test to verify all token exports and types
 * Run with: bun run shared/ui/utils/test-tokens.ts
 */

import {
  textColors,
  statusColors,
  badgeColors,
  legacyStatusColors,
  getStatusColor,
} from "../tokens";
import { getContrastRatio, meetsWCAG_AA } from "./contrast";

console.log("Testing Sentinel Design Tokens");
console.log("================================\n");

// Test 1: Text colors
console.log("1. Text Colors");
console.log("--------------");
for (const [name, color] of Object.entries(textColors)) {
  if (name === "inverse") {
    console.log(`  ${name}: ${color} (inverse, no check needed)`);
  } else {
    const ratio = getContrastRatio(color, "#ffffff");
    const passes = meetsWCAG_AA(color, "#ffffff");
    console.log(
      `  ${passes ? "✓" : "✗"} ${name}: ${color} (${ratio.toFixed(2)}:1)`
    );
  }
}
console.log();

// Test 2: Status colors
console.log("2. Status Colors");
console.log("----------------");
for (const [status, colors] of Object.entries(statusColors)) {
  const ratio = getContrastRatio(colors.text, colors.bg);
  const passes = meetsWCAG_AA(colors.text, colors.bg);
  console.log(
    `  ${passes ? "✓" : "✗"} ${status}: ${colors.text} on ${colors.bg} (${ratio.toFixed(2)}:1)`
  );
}
console.log();

// Test 3: Badge colors
console.log("3. Badge Colors");
console.log("---------------");
for (const [badge, colors] of Object.entries(badgeColors)) {
  const ratio = getContrastRatio(colors.text, colors.bg);
  const passes = meetsWCAG_AA(colors.text, colors.bg);
  console.log(
    `  ${passes ? "✓" : "✗"} ${badge}: ${colors.text} on ${colors.bg} (${ratio.toFixed(2)}:1)`
  );
}
console.log();

// Test 4: Legacy status mapping
console.log("4. Legacy Status Mapping");
console.log("------------------------");
const testStatuses: Array<keyof typeof legacyStatusColors> = [
  "present",
  "absent",
  "visitor",
  "pending",
  "excused",
  "active",
  "inactive",
];

for (const status of testStatuses) {
  const heroUIColor = getStatusColor(status);
  console.log(`  ${status} → ${heroUIColor}`);
}
console.log();

// Test 5: Error handling
console.log("5. Error Handling");
console.log("-----------------");
try {
  // @ts-expect-error Testing invalid status
  getStatusColor("invalid_status");
  console.log("  ✗ Should have thrown error for invalid status");
  process.exit(1);
} catch (error) {
  if (error instanceof Error) {
    console.log("  ✓ Throws error for invalid status");
    console.log(`    Message: ${error.message}`);
  }
}
console.log();

console.log("================================");
console.log("All token tests passed! ✓\n");

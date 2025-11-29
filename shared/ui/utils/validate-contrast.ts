/**
 * Development-only script to validate color contrast ratios
 * Run with: bun run shared/ui/utils/validate-contrast.ts
 */

import { getContrastRatio, meetsWCAG_AA } from "./contrast";

// Current colors to validate
const colors = {
  white: "#ffffff",
  gray50: "#f8fafc",
  gray100: "#f1f5f9",
  gray200: "#e2e8f0",
  gray300: "#cbd5e1",
  gray400: "#94a3b8",
  gray500: "#64748b",
  gray600: "#475569",
  gray700: "#334155",
  gray800: "#1e293b",
  gray900: "#0f172a",
  black: "#000000",
};

interface ColorTest {
  name: string;
  fg: string;
  bg: string;
  required: number;
  purpose: string;
}

const tests: ColorTest[] = [
  // Text colors on white
  {
    name: "Gray 900 on white",
    fg: colors.gray900,
    bg: colors.white,
    required: 4.5,
    purpose: "text.primary",
  },
  {
    name: "Gray 700 on white",
    fg: colors.gray700,
    bg: colors.white,
    required: 4.5,
    purpose: "text.secondary candidate",
  },
  {
    name: "Gray 600 on white",
    fg: colors.gray600,
    bg: colors.white,
    required: 4.5,
    purpose: "text.secondary candidate",
  },
  {
    name: "Gray 500 on white",
    fg: colors.gray500,
    bg: colors.white,
    required: 4.5,
    purpose: "text.muted candidate",
  },

  // Status colors - success
  {
    name: "Dark green on light green bg",
    fg: "#166534",
    bg: "#dcfce7",
    required: 4.5,
    purpose: "success badge",
  },

  // Status colors - warning
  {
    name: "Dark amber on light amber bg",
    fg: "#92400e",
    bg: "#fef3c7",
    required: 4.5,
    purpose: "warning badge",
  },

  // Status colors - error
  {
    name: "Dark red on light red bg",
    fg: "#991b1b",
    bg: "#fee2e2",
    required: 4.5,
    purpose: "error badge",
  },

  // Status colors - info
  {
    name: "Dark blue on light blue bg",
    fg: "#1e40af",
    bg: "#dbeafe",
    required: 4.5,
    purpose: "info badge",
  },

  // Status colors - neutral
  {
    name: "Gray 700 on gray 50 bg",
    fg: "#374151",
    bg: "#f3f4f6",
    required: 4.5,
    purpose: "neutral badge",
  },
];

console.log("WCAG AA Contrast Validation");
console.log("============================\n");

let failures = 0;

for (const test of tests) {
  const ratio = getContrastRatio(test.fg, test.bg);
  const passes = meetsWCAG_AA(test.fg, test.bg);
  const status = passes ? "✓ PASS" : "✗ FAIL";

  console.log(`${status} ${test.name}`);
  console.log(
    `  Purpose: ${test.purpose}`
  );
  console.log(
    `  Ratio: ${ratio.toFixed(2)}:1 (required: ${test.required}:1)`
  );
  console.log(`  Colors: ${test.fg} on ${test.bg}\n`);

  if (!passes) {
    failures++;
  }
}

console.log("============================");
console.log(`Total: ${tests.length} tests, ${failures} failures\n`);

if (failures > 0) {
  process.exit(1);
}

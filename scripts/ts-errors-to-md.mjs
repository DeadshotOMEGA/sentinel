/**
 * Generates a markdown report of TypeScript compiler errors
 * grouped by error code and sorted by file location.
 *
 * Usage: node scripts/ts-errors-to-md.mjs [output-file]
 * Default output: ts-errors.md
 */
import ts from "typescript";
import fs from "node:fs";

// Constants
const DEFAULT_OUTPUT_FILE = "ts-errors.md";
const UNKNOWN_FILE = "unknown";
const TSCONFIG_NAME = "tsconfig.json";

/**
 * @typedef {Object} ErrorEntry
 * @property {string} code - Error code (e.g., "TS2345")
 * @property {string} file - File path
 * @property {number} line - Line number (1-indexed)
 * @property {number} col - Column number (1-indexed)
 * @property {string} msg - Error message
 */

try {
  // Find and read tsconfig.json
  const configPath = ts.findConfigFile("./", ts.sys.fileExists, TSCONFIG_NAME);
  if (!configPath) {
    throw new Error(`${TSCONFIG_NAME} not found in current directory or parent directories`);
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    const errorMessage = ts.formatDiagnosticsWithColorAndContext([configFile.error], {
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getCanonicalFileName: f => f,
      getNewLine: () => ts.sys.newLine
    });
    throw new Error(`Failed to read ${TSCONFIG_NAME}:\n${errorMessage}`);
  }

  // Parse TypeScript configuration
  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    "./"
  );

  if (!parsed.fileNames || parsed.fileNames.length === 0) {
    throw new Error("No TypeScript files found in project");
  }

  // Create program and collect diagnostics
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const diagnostics = ts.getPreEmitDiagnostics(program);

  // Transform diagnostics into structured error entries
  /** @type {ErrorEntry[]} */
  const rows = diagnostics.map(d => {
    const code = `TS${d.code}`;
    const file = d.file?.fileName ?? UNKNOWN_FILE;
    const msg = ts.flattenDiagnosticMessageText(d.messageText, " ");

    let line = 0, col = 0;
    if (d.file && typeof d.start === "number") {
      const pos = d.file.getLineAndCharacterOfPosition(d.start);
      line = pos.line + 1;
      col = pos.character + 1;
    }

    return { code, file, line, col, msg };
  });

  // Group errors by code
  /** @type {Map<string, ErrorEntry[]>} */
  const byCode = new Map();
  for (const r of rows) {
    if (!byCode.has(r.code)) {
      byCode.set(r.code, []);
    }
    const entries = byCode.get(r.code);
    if (entries) {
      entries.push(r);
    }
  }

  // Generate markdown report
  const codes = [...byCode.keys()].sort();
  let md = `# TypeScript Errors Report\n\nGenerated: ${new Date().toISOString()}\n\n`;

  if (rows.length === 0) {
    md += "✅ No TypeScript errors found!\n";
  } else {
    for (const code of codes) {
      const list = byCode.get(code);
      if (!list) continue; // Defensive check

      // Sort by file path, then line, then column
      list.sort((a, b) =>
        a.file === b.file
          ? (a.line - b.line) || (a.col - b.col)
          : a.file.localeCompare(b.file)
      );

      md += `## ${code} (${list.length})\n\n`;
      for (const e of list) {
        const loc = e.line ? `:${e.line}:${e.col}` : "";
        md += `- **${e.file}${loc}** — ${e.msg}\n`;
      }
      md += `\n`;
    }
  }

  // Write report to file
  const outputFile = process.argv[2] || DEFAULT_OUTPUT_FILE;
  fs.writeFileSync(outputFile, md, "utf8");

  // Report results
  console.log(`✅ Wrote ${outputFile} (${rows.length} diagnostic${rows.length === 1 ? '' : 's'})`);

  // Exit with error code if diagnostics found
  if (rows.length > 0) {
    process.exit(1);
  }
} catch (error) {
  console.error("❌ Failed to generate TypeScript error report:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
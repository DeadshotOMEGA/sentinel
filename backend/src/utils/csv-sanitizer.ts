/**
 * CSV Sanitization Utilities
 * Prevents CSV injection attacks (HIGH-7)
 *
 * CSV injection occurs when malicious formulas are embedded in CSV data
 * and executed when opened in Excel or other spreadsheet applications.
 */

/**
 * Sanitize a single CSV cell value to prevent formula injection
 *
 * Dangerous characters that can trigger formula execution:
 * - = (formula start)
 * - + (addition formula)
 * - - (subtraction formula)
 * - @ (macro/external reference)
 * - \t (tab - can be used in injection)
 * - \r (carriage return - can be used in injection)
 * - \n (newline - handled separately for CSV formatting)
 *
 * @param value - The value to sanitize
 * @returns Sanitized value safe for CSV export
 */
export function sanitizeCsvValue(value: string | null | undefined): string {
  if (value == null) {
    return '';
  }

  let str = String(value);

  // Empty string is safe
  if (str.length === 0) {
    return '';
  }

  // Characters that could trigger formula execution
  const dangerousChars = ['=', '+', '-', '@'];

  // Check for dangerous starting characters or embedded control characters
  const hasTabOrCR = str.includes('\t') || str.includes('\r');
  const startsWithDangerous = dangerousChars.some((char) => str.startsWith(char));

  // If value starts with a dangerous character or contains control chars, sanitize
  if (startsWithDangerous || hasTabOrCR) {
    // Replace control characters first
    str = str.replace(/\t/g, ' ').replace(/\r/g, '');

    // If starts with dangerous char, prefix with single quote
    if (startsWithDangerous) {
      const escaped = str.replace(/"/g, '""');
      return `'${escaped}`;
    }
  }

  // Handle values that need quoting (contains comma, quote, or newline)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    // Escape quotes by doubling them (CSV standard)
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  // Value is safe to use as-is
  return str;
}

/**
 * Convert an array of objects to CSV string with automatic sanitization
 *
 * @param data - Array of objects to convert to CSV
 * @param headers - Optional array of header names. If not provided, uses object keys from first row
 * @returns CSV string with sanitized values
 */
export function arrayToCsv<T extends Record<string, unknown>>(
  data: T[],
  headers?: string[]
): string {
  if (data.length === 0) {
    return '';
  }

  // Use provided headers or extract from first object
  const csvHeaders = headers ?? Object.keys(data[0]);

  // Build header row
  const headerRow = csvHeaders.map(sanitizeCsvValue).join(',');

  // Build data rows
  const dataRows = data.map((row) => {
    return csvHeaders
      .map((header) => {
        const value = row[header];
        // Convert to string and sanitize
        return sanitizeCsvValue(value != null ? String(value) : null);
      })
      .join(',');
  });

  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Generate CSV download headers for Express response
 *
 * @param filename - Name of the file (without .csv extension)
 * @returns Headers object for Express response
 */
export function getCsvHeaders(filename: string): Record<string, string> {
  // Sanitize filename to prevent header injection
  const safeFilename = filename.replace(/[^a-zA-Z0-9-_]/g, '_');

  return {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${safeFilename}.csv"`,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };
}

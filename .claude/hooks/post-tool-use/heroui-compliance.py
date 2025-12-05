#!/usr/bin/env python3
"""
HeroUI Compliance Hook

Blocks edits to .tsx/.jsx files that violate HeroUI component usage standards.
Triggers after Write/Edit tool operations on React component files.
"""

import json
import os
import re
import sys
from pathlib import Path
from typing import List, Dict, Optional

# Tool invocation context passed via environment
TOOL_NAME = os.getenv("TOOL_NAME", "")
FILE_PATH = os.getenv("FILE_PATH", "")
CONTENT = os.getenv("CONTENT", "")

# Violation patterns to detect
NATIVE_HTML_PATTERNS = [
    (r'<button[\s>]', 'button', 'Button', 'Use <Button> from @heroui/react instead of native <button>'),
    (r'<input\s+(?!type=["\']file["\'])[^>]*>', 'input (non-file)', 'Input/Checkbox/etc', 'Use HeroUI form components instead of native <input>'),
    (r'<select[\s>]', 'select', 'Select', 'Use <Select> from @heroui/react instead of native <select>'),
    (r'<textarea[\s>]', 'textarea', 'Textarea', 'Use <Textarea> from @heroui/react instead of native <textarea>'),
    (r'<a\s+href=', 'anchor', 'Link', 'Use <Link> from @heroui/react instead of native <a href>'),
]

PROP_VIOLATIONS = [
    (r'\bonClick\s*=', 'onClick', 'onPress', 'HeroUI uses onPress instead of onClick for Button/Link'),
    (r'\bchecked\s*=', 'checked', 'isSelected', 'HeroUI uses isSelected instead of checked for Checkbox/Switch'),
    (r'\bdisabled\s*(?:=\s*{?\s*true\s*}?|>)', 'disabled', 'isDisabled', 'HeroUI uses isDisabled instead of disabled'),
]

HARDCODED_COLOR_PATTERNS = [
    (r'(?:bg|text|border)-\[#[0-9a-fA-F]{3,6}\]', 'Hardcoded hex color in className',
     'Use theme tokens like bg-primary, text-danger-500'),
    (r'className=["\'][^"\']*#[0-9a-fA-F]{3,6}', 'Hardcoded hex color in className',
     'Use theme tokens like bg-primary, text-danger-500'),
]


class Violation:
    """Represents a single compliance violation."""

    def __init__(self, line_num: int, line_content: str, violation_type: str,
                 found: str, should_use: str, message: str):
        self.line_num = line_num
        self.line_content = line_content.strip()
        self.violation_type = violation_type
        self.found = found
        self.should_use = should_use
        self.message = message

    def to_dict(self) -> Dict:
        return {
            'line': self.line_num,
            'content': self.line_content[:80] + ('...' if len(self.line_content) > 80 else ''),
            'type': self.violation_type,
            'found': self.found,
            'should_use': self.should_use,
            'message': self.message
        }


def should_check_file(file_path: str) -> bool:
    """Determine if file should be checked for HeroUI compliance."""
    if not file_path:
        return False

    path = Path(file_path)

    # Only check React component files
    if path.suffix not in {'.tsx', '.jsx'}:
        return False

    # Only check files in src directories
    if 'src' not in path.parts:
        return False

    # Skip test files
    if any(part in path.parts for part in ['__tests__', 'test', 'tests']):
        return False

    if any(suffix in path.name for suffix in ['.test.', '.spec.']):
        return False

    return True


def get_file_lines(content: str) -> List[str]:
    """Split content into lines for analysis."""
    return content.split('\n')


def find_violations(lines: List[str]) -> List[Violation]:
    """Scan file content for HeroUI compliance violations."""
    violations = []

    for line_num, line in enumerate(lines, start=1):
        # Skip import statements and comments
        if line.strip().startswith('import ') or line.strip().startswith('//'):
            continue

        # Check for native HTML elements
        for pattern, found, should_use, message in NATIVE_HTML_PATTERNS:
            # Special handling for input to exclude type="file"
            if found == 'input (non-file)':
                if re.search(r'<input\s+', line):
                    # Check if this is NOT a file input
                    if not re.search(r'type=["\']file["\']', line):
                        violations.append(Violation(
                            line_num, line, 'native_html', found, should_use, message
                        ))
            elif re.search(pattern, line):
                violations.append(Violation(
                    line_num, line, 'native_html', found, should_use, message
                ))

        # Check for prop violations
        for pattern, found, should_use, message in PROP_VIOLATIONS:
            if re.search(pattern, line):
                violations.append(Violation(
                    line_num, line, 'prop_violation', found, should_use, message
                ))

        # Check for hardcoded colors
        for pattern, found, should_use in HARDCODED_COLOR_PATTERNS:
            if re.search(pattern, line):
                violations.append(Violation(
                    line_num, line, 'hardcoded_color', found, should_use,
                    'Hardcoded color detected - use theme tokens instead'
                ))

    return violations


def format_blocking_message(file_path: str, violations: List[Violation]) -> Dict:
    """Format violations into blocking decision JSON."""
    # Show first 3 violations, mention count of remaining
    shown_violations = violations[:3]
    remaining_count = len(violations) - 3

    message_lines = [
        f"🚫 HeroUI Compliance Violations Detected in {file_path}",
        "",
        "This file violates HeroUI component standards and cannot be saved.",
        ""
    ]

    for i, v in enumerate(shown_violations, 1):
        message_lines.append(f"{i}. Line {v.line_num}: {v.message}")
        message_lines.append(f"   Found: {v.found} → Should use: {v.should_use}")
        message_lines.append(f"   Code: {v.line_content}")
        message_lines.append("")

    if remaining_count > 0:
        message_lines.append(f"... and {remaining_count} more violation(s)")
        message_lines.append("")

    message_lines.extend([
        "Fix required:",
        "• Replace native HTML with HeroUI components from @heroui/react",
        "• Use HeroUI props: onPress (not onClick), isSelected (not checked), isDisabled (not disabled)",
        "• Replace hardcoded colors with theme tokens (color=\"primary\", bg-primary, etc)",
        "",
        "Run `/heroui-check " + file_path + "` for detailed compliance report with fixes."
    ])

    return {
        'decision': 'block',
        'reason': '\n'.join(message_lines),
        'violations': [v.to_dict() for v in shown_violations]
    }


def main():
    """Main hook execution."""
    # Only trigger on Write/Edit operations
    if TOOL_NAME not in {'Write', 'Edit', 'MultiEdit'}:
        sys.exit(0)

    # Check if file should be analyzed
    if not should_check_file(FILE_PATH):
        sys.exit(0)

    # Get file content
    content = CONTENT
    if not content:
        # If content not in env, try reading file
        try:
            with open(FILE_PATH, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception:
            sys.exit(0)

    # Scan for violations
    lines = get_file_lines(content)
    violations = find_violations(lines)

    # If violations found, block the operation
    if violations:
        blocking_msg = format_blocking_message(FILE_PATH, violations)
        print(json.dumps(blocking_msg, indent=2))
        sys.exit(0)

    # No violations - allow operation
    sys.exit(0)


if __name__ == '__main__':
    main()

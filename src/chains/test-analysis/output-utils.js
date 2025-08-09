import { execSync } from 'child_process';

// Layout constants
const LAYOUT = {
  CONTENT_INDENT: '  ',
  LEFT_MARGIN: 2,
  RIGHT_MARGIN: 2,
  BOX_BORDER_WIDTH: 4, // '│ ' + ' │'
  FILE_CONTINUATION_INDENT: '      ', // 'File: ' length
};

// Calculate available widths
const getContentWidth = () => {
  const terminalWidth = getTerminalWidth();
  return terminalWidth - LAYOUT.LEFT_MARGIN - LAYOUT.RIGHT_MARGIN;
};

const getBoxContentWidth = () => {
  const terminalWidth = getTerminalWidth();
  return (
    terminalWidth - LAYOUT.CONTENT_INDENT.length - LAYOUT.BOX_BORDER_WIDTH - LAYOUT.RIGHT_MARGIN
  );
};

// Text processing utilities
const wordWrap = (text, maxWidth) => {
  if (!text || maxWidth <= 0) return [];

  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxWidth) {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
};

const breakLongLine = (text, maxWidth) => {
  if (!text || text.length <= maxWidth) return [text];

  const lines = [];
  let remaining = text;

  while (remaining.length > 0) {
    lines.push(remaining.substring(0, maxWidth));
    remaining = remaining.substring(maxWidth);
  }

  return lines;
};

// Formatting utilities
const formatHeader = (label, value) => {
  return `${label}: ${value}`;
};

const formatFileHeader = (filePath, lineNumber) => {
  const fileInfo = `${filePath}:${lineNumber || 0}`;
  const maxWidth = getTerminalWidth() - 'File: '.length;
  const brokenPath = breakLongLine(fileInfo, maxWidth);

  return brokenPath.map((part, i) =>
    i === 0 ? formatHeader('File', part) : `${LAYOUT.FILE_CONTINUATION_INDENT}${part}`
  );
};

/**
 * Display utilities for test output
 */

export const getTerminalWidth = () => {
  for (let i = 0; i < 3; i++) {
    try {
      const result = execSync('stty size < /dev/tty', {
        encoding: 'utf8',
        timeout: 1000,
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();
      const parts = result.split(' ');
      if (parts.length === 2) {
        const width = parseInt(parts[1], 10);
        if (width > 0) return width;
      }
    } catch {
      // Continue trying
    }
  }

  return 80;
};

export const createSeparator = (width = getTerminalWidth(), char = '─') => {
  return char.repeat(Math.max(1, width));
};

export const writeInitialSeparator = () => {
  console.log(createSeparator());
};

const formatSuiteHeader = (suiteName, passedTests, totalTests, avgDuration) => {
  return `\nSuite: ${suiteName}, Tests: ${passedTests}/${totalTests} passed, Avg: ${avgDuration}ms`;
};

const formatFailedTest = (testName, fileLocation) => {
  return [`Failed Test: ${testName}`, `File: ${fileLocation}`];
};

const formatCodeBlock = (codeSnippet) => {
  if (!codeSnippet) return [];
  return ['```javascript', codeSnippet, '```'];
};

export const displayTestFailure = (suiteData, failureData, analysis, codeSnippet) => {
  const { suiteName, passedTests, totalTests, avgDuration } = suiteData;
  const { testName, fileLocation } = failureData;

  // Build output with proper spacing
  const lines = [];

  // Suite header
  lines.push(formatSuiteHeader(suiteName, passedTests, totalTests, avgDuration));

  // Test details
  lines.push(...formatFailedTest(testName, fileLocation));

  // Code block if available
  if (codeSnippet) {
    lines.push(''); // Empty line before code
    lines.push(...formatCodeBlock(codeSnippet));
  }

  // Analysis if available
  if (analysis && analysis.trim()) {
    lines.push(''); // Empty line before analysis
    lines.push(analysis);
  }

  // Output with final newline
  console.log(`${lines.join('\n')}\n`);
};

// ANSI color codes
const COLORS = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  RESET: '\x1b[0m',
};

export const formatTestSummary = (name, passed, total, avgDuration) => {
  const isFullyPassing = passed === total;
  const color = isFullyPassing ? COLORS.GREEN : COLORS.RED;
  return `${color}Suite: ${name} ${passed}/${total} ${avgDuration}ms (avg.)${COLORS.RESET}`;
};

// Unicode box drawing characters
const BOX = {
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',
};

export const createBoxedCode = (code, indent = LAYOUT.CONTENT_INDENT) => {
  if (!code) return '';

  const maxContentWidth = getBoxContentWidth();
  const lines = code.split('\n');
  const contentWidth = Math.min(Math.max(...lines.map((l) => l.length)), maxContentWidth);

  const result = [];
  result.push(indent + BOX.topLeft + BOX.horizontal.repeat(contentWidth + 2) + BOX.topRight);

  for (const line of lines) {
    const truncated = line.substring(0, contentWidth);
    const padding = ' '.repeat(Math.max(0, contentWidth - truncated.length));
    result.push(`${indent}${BOX.vertical} ${truncated}${padding} ${BOX.vertical}`);
  }

  result.push(indent + BOX.bottomLeft + BOX.horizontal.repeat(contentWidth + 2) + BOX.bottomRight);
  return result.join('\n');
};

export const formatAnalysisOutput = (analysis, testName, filePath, lineNumber, codeSnippet) => {
  const sections = [];

  // Failure header
  sections.push(formatHeader('Failure', testName));

  // File header (with line breaking)
  if (filePath) {
    sections.push(...formatFileHeader(filePath, lineNumber));
  }

  // Code snippet
  if (codeSnippet) {
    sections.push('');
    sections.push(createBoxedCode(codeSnippet));
  }

  // Analysis sections
  if (analysis) {
    sections.push('');
    sections.push(...formatAnalysis(analysis));
  }

  return sections.join('\n');
};

// Section formatting rules
const SECTION_RULES = [
  {
    matcher: (line) => line.startsWith('Solution:'),
    format: (line) => [line],
  },
  {
    matcher: (line) => line.startsWith('Discussion:'),
    format: (line) => ['', line], // Add blank line before
  },
  {
    matcher: (line) => line.trim().length > 0,
    format: (line, { contentWidth }) => {
      // Default: wrap and indent content
      const wrapped = wordWrap(line.trim(), contentWidth);
      return wrapped.map((wrappedLine) => `${LAYOUT.CONTENT_INDENT}${wrappedLine}`);
    },
  },
];

// Format analysis text with proper sections
const formatAnalysis = (analysis) => {
  const lines = [];
  const contentWidth = getContentWidth();
  const context = { contentWidth };

  analysis.split('\n').forEach((line) => {
    // Find the first matching rule and apply it
    const rule = SECTION_RULES.find((r) => r.matcher(line));
    if (rule) {
      lines.push(...rule.format(line, context));
    }
  });

  return lines;
};

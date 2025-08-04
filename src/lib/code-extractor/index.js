import { readFileSync } from 'fs';

const formatLine = (content, index, targetLine, startLine) => {
  const lineNum = startLine + index + 1;
  const marker = lineNum === targetLine ? '>' : ' ';
  const linePrefix = `${marker} ${lineNum.toString().padStart(4)}: `;

  return linePrefix + content;
};

const getFileLines = (filePath) => {
  try {
    return readFileSync(filePath, 'utf8').split('\n');
  } catch {
    return null;
  }
};

/**
 * Extract a window of code around a specific line
 */
export function extractCodeWindow(filePath, line, windowSize = 5) {
  if (!filePath || !line) return '';

  const lines = getFileLines(filePath);
  if (!lines) return '';

  const startLine = Math.max(0, line - windowSize - 1);
  const endLine = Math.min(lines.length, line + windowSize);

  return lines
    .slice(startLine, endLine)
    .map((content, i) => formatLine(content, i, line, startLine))
    .join('\n');
}

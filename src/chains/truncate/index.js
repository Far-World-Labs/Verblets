export default function truncate(
  text,
  { limit = text?.length || 0, unit = 'characters', tokenizer } = {}
) {
  if (!text || typeof text !== 'string') {
    return {
      truncated: '',
      cutPoint: 0,
      cutType: 'none',
      preservationScore: 0.0,
    };
  }

  const defaultTokenizer = (str) => str.split(/\s+/).filter(Boolean);

  const measure = (str) => {
    switch (unit) {
      case 'characters':
        return str.length;
      case 'words':
        return str.split(/\s+/).filter(Boolean).length;
      case 'tokens':
        return (tokenizer || defaultTokenizer)(str).length;
      default:
        throw new Error(`Unknown unit: ${unit}`);
    }
  };

  const totalUnits = measure(text);
  if (limit >= totalUnits) {
    return {
      truncated: text,
      cutPoint: totalUnits,
      cutType: 'full',
      preservationScore: 1.0,
    };
  }

  let best = '';
  let cutType = 'soft';

  // Try cutting at paragraph boundaries first
  const paragraphs = text.split(/\n\s*\n/);
  for (let i = 0; i < paragraphs.length; i++) {
    const candidate = paragraphs.slice(0, i + 1).join('\n\n');
    if (measure(candidate) <= limit) {
      best = candidate;
      cutType = 'paragraph';
    } else {
      break;
    }
  }

  // If no good paragraph cut, try sentence boundaries
  if (!best || cutType === 'soft') {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let tempBest = '';
    for (let i = 0; i < sentences.length; i++) {
      const candidate = sentences.slice(0, i + 1).join('');
      if (measure(candidate) <= limit) {
        tempBest = candidate;
        if (!best || tempBest.length > best.length) {
          best = tempBest;
          cutType = 'sentence';
        }
      } else {
        break;
      }
    }
  }

  // Try cutting at clause boundaries (commas, semicolons)
  if (!best || cutType === 'soft') {
    const clauses = text.split(/(?<=[,;])\s+/);
    let tempBest = '';
    for (let i = 0; i < clauses.length; i++) {
      const candidate = clauses.slice(0, i + 1).join(' ');
      if (measure(candidate) <= limit) {
        tempBest = candidate;
        if (!best || tempBest.length > best.length) {
          best = tempBest;
          cutType = 'clause';
        }
      } else {
        break;
      }
    }
  }

  // Try cutting at word boundaries
  if (!best || cutType === 'soft') {
    const words = text.split(/\s+/);
    let tempBest = '';
    for (let i = 0; i < words.length; i++) {
      const candidate = words.slice(0, i + 1).join(' ');
      if (measure(candidate) <= limit) {
        tempBest = candidate;
        if (!best || tempBest.length > best.length) {
          best = tempBest;
          cutType = 'word';
        }
      } else {
        break;
      }
    }
  }

  // Handle code blocks specially
  const codeBlockMatch = text.match(/^```[\s\S]*?```/m);
  if (codeBlockMatch && measure(codeBlockMatch[0]) <= limit) {
    if (!best || codeBlockMatch[0].length > best.length) {
      best = codeBlockMatch[0];
      cutType = 'code-block';
    }
  }

  // Fallback to character truncation if nothing else worked
  if (!best) {
    if (unit === 'characters') {
      best = text.slice(0, limit);
    } else if (unit === 'words') {
      const words = text.split(/\s+/);
      best = words.slice(0, limit).join(' ');
    } else {
      const tokens = (tokenizer || defaultTokenizer)(text);
      best = tokens.slice(0, limit).join(' ');
    }
    cutType = 'soft';
  }

  // Clean up trailing whitespace and incomplete sentences for soft cuts
  if (cutType === 'soft') {
    best = best.replace(/\s+$/, '');
    // If we cut mid-sentence, try to end at a word boundary
    if (best.match(/[a-zA-Z]$/)) {
      const lastSpace = best.lastIndexOf(' ');
      if (lastSpace > best.length * 0.8) {
        // Only if we don't lose too much
        best = best.slice(0, lastSpace);
      }
    }
  }

  const cutPoint = measure(best);
  const preservationScore = Math.min(1.0, cutPoint / totalUnits);

  return {
    truncated: best,
    cutPoint,
    cutType,
    preservationScore: Math.round(preservationScore * 1000) / 1000,
  };
}

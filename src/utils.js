function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  if (!str) return str;

  try {
    // Remove unpaired UTF-16 surrogates
    let sanitized = str.replace(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, '\ufffd');

    // Additional safeguard: ensure all characters are valid Unicode
    sanitized = Array.from(sanitized)
      .map(char => {
        const code = char.charCodeAt(0);
        // Allow valid Unicode ranges, replace everything else
        if ((code >= 0x0000 && code <= 0xD7FF) ||
            (code >= 0xE000 && code <= 0xFFFF) ||
            (code >= 0x10000 && code <= 0x10FFFF)) {
          return char;
        }
        return '\ufffd';
      })
      .join('');

    return sanitized;
  } catch (e) {
    return str.replace(/[^\x20-\x7E\n\t\r]/g, '\ufffd');
  }
}

function sanitizeForJson(obj, depth = 0) {
  // Prevent infinite recursion
  if (depth > 50) return obj;

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForJson(item, depth + 1));
  }
  if (obj !== null && typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeForJson(obj[key], depth + 1);
      }
    }
    return sanitized;
  }
  return obj;
}

function sanitizeDiscordContent(str) {
  // Special handler for Discord message content with mentions, emojis, etc
  return sanitizeString(str);
}

function extractJson(text) {
  if (!text || typeof text !== 'string') return '';

  // Remove markdown code block markers
  let cleaned = text.replace(/```(?:json)?\s*/g, '').trim();

  // Find first opening brace or bracket
  const firstBrace = Math.min(
    cleaned.indexOf('{') >= 0 ? cleaned.indexOf('{') : Infinity,
    cleaned.indexOf('[') >= 0 ? cleaned.indexOf('[') : Infinity
  );

  if (firstBrace === Infinity) return ''; // No JSON found

  // Start from first brace/bracket
  cleaned = cleaned.substring(firstBrace);

  // Track braces/brackets depth to find the end of JSON
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let endIndex = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{' || char === '[') {
        depth++;
      } else if (char === '}' || char === ']') {
        depth--;
        if (depth === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }
  }

  if (endIndex > 0) {
    return cleaned.substring(0, endIndex).trim();
  }

  return '';
}

module.exports = { sleep, sanitizeString, sanitizeForJson, sanitizeDiscordContent, extractJson };

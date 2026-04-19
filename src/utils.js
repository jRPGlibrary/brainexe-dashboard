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

module.exports = { sleep, sanitizeString, sanitizeForJson, sanitizeDiscordContent };

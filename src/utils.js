function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, '\ufffd');
}

function sanitizeForJson(obj) {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForJson);
  }
  if (obj !== null && typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      sanitized[key] = sanitizeForJson(obj[key]);
    }
    return sanitized;
  }
  return obj;
}

module.exports = { sleep, sanitizeString, sanitizeForJson };

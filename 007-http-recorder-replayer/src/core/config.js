const path = require('path');

const DEFAULT_CONFIG = {
  proxyPort: 8080,
  mockPort: 3000,
  sessionsDir: path.join(__dirname, '../../sessions'),
  defaultResponse: {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Not found in recordings', message: 'No matching recording found for this request' })
  },
  matchStrategy: 'exact', // 'exact' or 'fuzzy'
  encoding: 'utf-8'
};

function getConfig(overrides = {}) {
  return { ...DEFAULT_CONFIG, ...overrides };
}

module.exports = {
  DEFAULT_CONFIG,
  getConfig
};

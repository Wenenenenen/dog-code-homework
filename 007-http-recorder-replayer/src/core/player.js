const http = require('http');
const url = require('url');
const { getConfig } = require('./config');
const SessionManager = require('./sessionManager');

class Player {
  constructor(config = {}) {
    this.config = getConfig(config);
    this.sessionManager = new SessionManager(config);
    this.server = null;
    this.isRunning = false;
    this.currentSessionId = null;
    this.matchStrategy = config.matchStrategy || this.config.matchStrategy;
  }

  _getRequestBody(req) {
    return new Promise((resolve) => {
      let body = [];
      req.on('data', (chunk) => {
        body.push(chunk);
      });
      req.on('end', () => {
        const buffer = Buffer.concat(body);
        resolve({
          buffer: buffer,
          string: buffer.toString(this.config.encoding)
        });
      });
    });
  }

  _normalizeQuery(queryString) {
    if (!queryString) return {};
    const params = {};
    queryString.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      if (key) {
        params[decodeURIComponent(key)] = decodeURIComponent(value || '');
      }
    });
    return params;
  }

  _matchExact(incomingRequest, recordedRequest) {
    if (incomingRequest.method !== recordedRequest.method) {
      return false;
    }

    const incomingPathname = incomingRequest.pathname;
    const recordedPathname = recordedRequest.pathname;
    if (incomingPathname !== recordedPathname) {
      return false;
    }

    const incomingQuery = this._normalizeQuery(incomingRequest.query);
    const recordedQuery = this._normalizeQuery(recordedRequest.query);
    
    const incomingKeys = Object.keys(incomingQuery).sort();
    const recordedKeys = Object.keys(recordedQuery).sort();
    
    if (incomingKeys.length !== recordedKeys.length) {
      return false;
    }
    
    for (const key of incomingKeys) {
      if (incomingQuery[key] !== recordedQuery[key]) {
        return false;
      }
    }

    return true;
  }

  _matchFuzzy(incomingRequest, recordedRequest) {
    if (incomingRequest.method !== recordedRequest.method) {
      return false;
    }

    const incomingPathname = incomingRequest.pathname;
    const recordedPathname = recordedRequest.pathname;
    if (incomingPathname !== recordedPathname) {
      return false;
    }

    return true;
  }

  _matchRequest(incomingRequest) {
    const records = this.sessionManager.getRecords();
    const matchFn = this.matchStrategy === 'fuzzy' ? this._matchFuzzy : this._matchExact;

    for (const record of records) {
      if (matchFn.call(this, incomingRequest, record.request)) {
        return { matched: true, record };
      }
    }

    return { matched: false, record: null };
  }

  _logMatch(method, path, matched, record = null) {
    const timestamp = new Date().toISOString();
    
    if (matched) {
      const statusCode = record?.response?.statusCode || 'N/A';
      console.log(`[${timestamp}] [HIT] ${method} ${path} -> ${statusCode} (ID: ${record.id})`);
    } else {
      console.log(`[${timestamp}] [MISS] ${method} ${path} -> 404 (Not Found)`);
    }
  }

  _setupServer(filters = {}) {
    this.server = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url);
      const requestBody = await this._getRequestBody(req);
      
      const incomingRequest = {
        method: req.method,
        url: req.url,
        pathname: parsedUrl.pathname,
        path: parsedUrl.path,
        query: parsedUrl.query,
        headers: { ...req.headers },
        body: requestBody.string
      };

      let filteredRecords = this.sessionManager.filterRecords(filters);
      const originalRecords = this.sessionManager.getRecords();
      
      if (filters.domain || filters.path || filters.statusCode || filters.method) {
        this.sessionManager.records = filteredRecords;
      }

      const { matched, record } = this._matchRequest(incomingRequest);
      
      this._logMatch(req.method, req.url, matched, record);

      if (matched && record) {
        const response = record.response;
        
        if (response.headers) {
          for (const [key, value] of Object.entries(response.headers)) {
            res.setHeader(key, value);
          }
        }
        
        res.statusCode = response.statusCode;
        
        if (response.bodyBuffer) {
          const bodyBuffer = Buffer.from(response.bodyBuffer, 'base64');
          res.end(bodyBuffer);
        } else if (response.body) {
          res.end(response.body);
        } else {
          res.end();
        }
      } else {
        const defaultResponse = this.config.defaultResponse;
        
        if (defaultResponse.headers) {
          for (const [key, value] of Object.entries(defaultResponse.headers)) {
            res.setHeader(key, value);
          }
        }
        
        res.statusCode = defaultResponse.statusCode;
        res.end(defaultResponse.body);
      }

      if (filters.domain || filters.path || filters.statusCode || filters.method) {
        this.sessionManager.records = originalRecords;
      }
    });
  }

  async start(options = {}) {
    const { sessionId, port, matchStrategy, filters = {} } = options;
    
    this.sessionManager.loadSession(sessionId);
    this.currentSessionId = sessionId;
    this.matchStrategy = matchStrategy || this.config.matchStrategy;
    
    const actualPort = port || this.config.mockPort;

    this._setupServer(filters);

    return new Promise((resolve) => {
      this.server.listen(actualPort, () => {
        this.isRunning = true;
        const recordCount = this.sessionManager.getRecords().length;
        const filteredCount = this.sessionManager.filterRecords(filters).length;
        
        console.log('========================================');
        console.log('  HTTP Playback Mock Server');
        console.log('========================================');
        console.log(`  Session: ${sessionId}`);
        console.log(`  Port: ${actualPort}`);
        console.log(`  Match Strategy: ${this.matchStrategy}`);
        console.log(`  Total Records: ${recordCount}`);
        if (Object.keys(filters).length > 0) {
          console.log(`  Filtered Records: ${filteredCount}`);
          console.log('  Filters:');
          for (const [key, value] of Object.entries(filters)) {
            console.log(`    - ${key}: ${value}`);
          }
        }
        console.log('');
        console.log('  Usage:');
        console.log(`    http://localhost:${actualPort}<path>`);
        console.log('');
        console.log('  Match Strategy:');
        console.log('    - exact: method + pathname + query');
        console.log('    - fuzzy: method + pathname only');
        console.log('');
        console.log('  Press Ctrl+C to stop');
        console.log('========================================');
        
        resolve({
          port: actualPort,
          sessionId,
          recordCount,
          filteredCount,
          matchStrategy: this.matchStrategy
        });
      });
    });
  }

  async stop() {
    return new Promise((resolve, reject) => {
      if (!this.isRunning) {
        resolve();
        return;
      }

      this.server.close((err) => {
        if (err) {
          reject(err);
          return;
        }

        this.isRunning = false;
        console.log('');
        console.log('========================================');
        console.log('  Playback Server Stopped');
        console.log('========================================');
        resolve();
      });
    });
  }
}

module.exports = Player;

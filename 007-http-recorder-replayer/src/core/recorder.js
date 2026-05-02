const http = require('http');
const https = require('https');
const url = require('url');
const httpProxy = require('http-proxy');
const { getConfig } = require('./config');
const SessionManager = require('./sessionManager');

class Recorder {
  constructor(config = {}) {
    this.config = getConfig(config);
    this.sessionManager = new SessionManager(config);
    this.proxy = null;
    this.server = null;
    this.isRunning = false;
  }

  _parseHostAndPort(hostStr, defaultPort = 80) {
    const parts = hostStr.split(':');
    return {
      host: parts[0],
      port: parts.length > 1 ? parseInt(parts[1], 10) : defaultPort
    };
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

  _getResponseBody(proxyRes) {
    return new Promise((resolve) => {
      let body = [];
      proxyRes.on('data', (chunk) => {
        body.push(chunk);
      });
      proxyRes.on('end', () => {
        const buffer = Buffer.concat(body);
        resolve({
          buffer: buffer,
          string: buffer.toString(this.config.encoding)
        });
      });
    });
  }

  _recordRequest(req, requestBody) {
    const parsedUrl = url.parse(req.url);
    const fullUrl = req.url.startsWith('http') ? req.url : `http://${req.headers.host}${req.url}`;
    
    return {
      method: req.method,
      url: fullUrl,
      protocol: parsedUrl.protocol || 'http:',
      host: req.headers.host || parsedUrl.host,
      hostname: parsedUrl.hostname || req.headers.host?.split(':')[0],
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.path,
      pathname: parsedUrl.pathname,
      query: parsedUrl.query,
      hash: parsedUrl.hash,
      headers: { ...req.headers },
      body: requestBody.string,
      bodyBuffer: requestBody.buffer.toString('base64')
    };
  }

  _recordResponse(proxyRes, responseBody) {
    return {
      statusCode: proxyRes.statusCode,
      statusMessage: proxyRes.statusMessage,
      headers: { ...proxyRes.headers },
      body: responseBody.string,
      bodyBuffer: responseBody.buffer.toString('base64')
    };
  }

  _setupProxy() {
    this.proxy = httpProxy.createProxyServer({
      changeOrigin: true,
      secure: false,
      followRedirects: false,
      selfHandleResponse: true
    });

    this.proxy.on('error', (err, req, res) => {
      console.error('[Proxy Error]', err.message);
      if (res.writeHead) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Proxy Error: ' + err.message);
      }
    });

    this.proxy.on('proxyRes', async (proxyRes, req, res) => {
      try {
        const responseBody = await this._getResponseBody(proxyRes);
        
        const record = {
          request: req._recordedRequest,
          response: this._recordResponse(proxyRes, responseBody)
        };

        this.sessionManager.addRecord(record);

        if (proxyRes.headers) {
          for (const [key, value] of Object.entries(proxyRes.headers)) {
            if (key.toLowerCase() !== 'content-length') {
              res.setHeader(key, value);
            }
          }
        }

        res.statusCode = proxyRes.statusCode;
        res.statusMessage = proxyRes.statusMessage;
        res.end(responseBody.buffer);

      } catch (err) {
        console.error('[Proxy Response Error]', err.message);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
        }
        res.end('Internal Server Error');
      }
    });
  }

  _setupServer() {
    this.server = http.createServer(async (req, res) => {
      const requestBody = await this._getRequestBody(req);
      const requestInfo = this._recordRequest(req, requestBody);
      
      console.log(`[Record] ${requestInfo.method} ${requestInfo.url}`);

      const target = `${requestInfo.protocol}//${requestInfo.host}`;
      
      req._recordedRequest = requestInfo;
      req._requestBody = requestBody.buffer;

      const stream = require('stream');
      const bufferStream = new stream.PassThrough();
      bufferStream.end(requestBody.buffer);

      try {
        this.proxy.web(req, res, { 
          target,
          buffer: bufferStream
        }, (err) => {
          console.error('[Proxy Web Error]', err.message);
          if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'text/plain' });
          }
          res.end('Bad Gateway: ' + err.message);
        });
      } catch (err) {
        console.error('[Proxy Error]', err.message);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
        }
        res.end('Proxy Error: ' + err.message);
      }
    });

    this.server.on('connect', async (req, clientSocket, head) => {
      const { host, port } = this._parseHostAndPort(req.url, 443);
      
      console.log(`[Record HTTPS CONNECT] ${host}:${port} (Note: HTTPS content cannot be decrypted and recorded)`);

      const targetSocket = new (require('net')).Socket();
      
      targetSocket.connect(port, host, () => {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        targetSocket.write(head);
        
        targetSocket.pipe(clientSocket);
        clientSocket.pipe(targetSocket);
      });

      targetSocket.on('error', (err) => {
        console.error('[HTTPS Connect Error]', err.message);
        clientSocket.end();
      });

      clientSocket.on('error', () => {
        targetSocket.end();
      });
    });
  }

  async start(options = {}) {
    const { sessionId, port } = options;
    
    this.sessionManager.createSession(sessionId);
    const actualPort = port || this.config.proxyPort;

    this._setupProxy();
    this._setupServer();

    return new Promise((resolve) => {
      this.server.listen(actualPort, () => {
        this.isRunning = true;
        console.log('========================================');
        console.log('  HTTP Recording Proxy');
        console.log('========================================');
        console.log(`  Session: ${this.sessionManager.currentSession}`);
        console.log(`  Proxy Port: ${actualPort}`);
        console.log(`  Sessions Dir: ${this.config.sessionsDir}`);
        console.log('');
        console.log('  Usage:');
        console.log(`    1. Set HTTP proxy to: http://localhost:${actualPort}`);
        console.log('    2. Make HTTP requests');
        console.log('    3. Press Ctrl+C to stop and save session');
        console.log('');
        console.log('  Note: HTTPS content cannot be decrypted and');
        console.log('        will not be recorded (only CONNECT events)');
        console.log('========================================');
        resolve({
          port: actualPort,
          sessionId: this.sessionManager.currentSession
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
        
        const savedPath = this.sessionManager.saveSession();
        const recordCount = this.sessionManager.getRecords().length;
        
        console.log('');
        console.log('========================================');
        console.log('  Recording Stopped');
        console.log('========================================');
        console.log(`  Records: ${recordCount}`);
        console.log(`  Saved to: ${savedPath}`);
        console.log('========================================');
        
        resolve({
          savedPath,
          recordCount
        });
      });
    });
  }
}

module.exports = Recorder;

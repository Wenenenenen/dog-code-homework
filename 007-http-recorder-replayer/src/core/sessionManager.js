const fs = require('fs');
const path = require('path');
const { getConfig } = require('./config');

class SessionManager {
  constructor(config = {}) {
    this.config = getConfig(config);
    this.sessionsDir = this.config.sessionsDir;
    this.currentSession = null;
    this.records = [];
    
    this._ensureSessionsDir();
  }

  _ensureSessionsDir() {
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  _generateSessionId() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10);
    const timeStr = date.toTimeString().slice(0, 5).replace(':', '-');
    return `session_${dateStr}_${timeStr}`;
  }

  _getSessionPath(sessionId) {
    return path.join(this.sessionsDir, `${sessionId}.json`);
  }

  createSession(sessionId = null) {
    this.currentSession = sessionId || this._generateSessionId();
    this.records = [];
    return this.currentSession;
  }

  loadSession(sessionId) {
    const sessionPath = this._getSessionPath(sessionId);
    
    if (!fs.existsSync(sessionPath)) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const content = fs.readFileSync(sessionPath, this.config.encoding);
    const sessionData = JSON.parse(content);
    
    this.currentSession = sessionId;
    this.records = sessionData.records || [];
    
    return this.records;
  }

  saveSession() {
    if (!this.currentSession) {
      throw new Error('No active session to save');
    }

    const sessionData = {
      sessionId: this.currentSession,
      createdAt: new Date().toISOString(),
      records: this.records
    };

    const sessionPath = this._getSessionPath(this.currentSession);
    fs.writeFileSync(
      sessionPath,
      JSON.stringify(sessionData, null, 2),
      this.config.encoding
    );

    return sessionPath;
  }

  addRecord(record) {
    this.records.push({
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      ...record
    });
  }

  listSessions() {
    if (!fs.existsSync(this.sessionsDir)) {
      return [];
    }

    const files = fs.readdirSync(this.sessionsDir)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const sessionId = path.basename(file, '.json');
        const sessionPath = this._getSessionPath(sessionId);
        const stats = fs.statSync(sessionPath);
        let recordCount = 0;
        
        try {
          const content = fs.readFileSync(sessionPath, this.config.encoding);
          const data = JSON.parse(content);
          recordCount = (data.records || []).length;
        } catch (e) {
          recordCount = 0;
        }

        return {
          sessionId,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString(),
          recordCount,
          size: stats.size
        };
      });

    return files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getRecords() {
    return this.records;
  }

  filterRecords(filters = {}) {
    return this.records.filter(record => {
      const { domain, path: pathFilter, statusCode, method } = filters;
      
      if (domain && record.request) {
        const recordHostname = record.request.hostname || record.request.host?.split(':')[0];
        const recordHost = record.request.host;
        if (recordHostname !== domain && recordHost !== domain) {
          return false;
        }
      }
      
      if (pathFilter && record.request) {
        const recordPath = record.request.path || '';
        if (typeof pathFilter === 'string') {
          if (!recordPath.includes(pathFilter)) return false;
        } else if (pathFilter instanceof RegExp) {
          if (!pathFilter.test(recordPath)) return false;
        }
      }
      
      if (statusCode !== undefined && record.response) {
        if (record.response.statusCode !== statusCode) return false;
      }
      
      if (method && record.request) {
        if (record.request.method.toUpperCase() !== method.toUpperCase()) return false;
      }
      
      return true;
    });
  }

  exportRecord(recordId, outputPath) {
    const record = this.records.find(r => r.id === recordId);
    if (!record) {
      throw new Error(`Record ${recordId} not found`);
    }

    fs.writeFileSync(
      outputPath,
      JSON.stringify(record, null, 2),
      this.config.encoding
    );

    return outputPath;
  }

  deleteSession(sessionId) {
    const sessionPath = this._getSessionPath(sessionId);
    if (!fs.existsSync(sessionPath)) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    fs.unlinkSync(sessionPath);
    return true;
  }
}

module.exports = SessionManager;

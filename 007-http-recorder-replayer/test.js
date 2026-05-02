const http = require('http');
const SessionManager = require('./src/core/sessionManager');
const Recorder = require('./src/core/recorder');
const Player = require('./src/core/player');
const { DEFAULT_CONFIG } = require('./src/core/config');

const TEST_SERVER_PORT = 9876;
const PROXY_PORT = 9877;
const MOCK_PORT = 9878;
const TEST_SESSION_ID = 'integration-test-' + Date.now();

let testServer = null;

function createTestServer() {
  return new Promise((resolve) => {
    testServer = http.createServer((req, res) => {
      const parsedUrl = require('url').parse(req.url);
      let body = [];
      
      req.on('data', (chunk) => {
        body.push(chunk);
      });
      
      req.on('end', () => {
        const requestBody = Buffer.concat(body).toString();
        
        if (parsedUrl.pathname === '/api/hello') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Hello World', timestamp: Date.now() }));
        } else if (parsedUrl.pathname === '/api/users') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ users: [{ id: 1, name: 'User 1' }, { id: 2, name: 'User 2' }] }));
        } else if (parsedUrl.pathname === '/api/not-found') {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not Found' }));
        } else if (parsedUrl.pathname === '/api/submit' && req.method === 'POST') {
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            received: requestBody ? JSON.parse(requestBody) : null,
            timestamp: Date.now()
          }));
        } else {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('OK');
        }
      });
    });

    testServer.listen(TEST_SERVER_PORT, () => {
      console.log(`[Test] Test server running on port ${TEST_SERVER_PORT}`);
      resolve(testServer);
    });
  });
}

function closeTestServer() {
  return new Promise((resolve) => {
    if (testServer) {
      testServer.close(() => resolve());
    } else {
      resolve();
    }
  });
}

function makeDirectRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const bodyBuffer = body ? Buffer.from(JSON.stringify(body)) : null;
    
    const options = {
      hostname: 'localhost',
      port: TEST_SERVER_PORT,
      path: path,
      method: method,
      headers: {}
    };
    
    if (bodyBuffer) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = bodyBuffer.length;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    if (bodyBuffer) {
      req.write(bodyBuffer);
    }
    req.end();
  });
}

function makeProxyRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const bodyBuffer = body ? Buffer.from(JSON.stringify(body)) : null;
    const fullUrl = `http://localhost:${TEST_SERVER_PORT}${path}`;
    const parsedUrl = require('url').parse(fullUrl);
    
    const options = {
      hostname: 'localhost',
      port: PROXY_PORT,
      path: fullUrl,
      method: method,
      headers: {
        'Host': `localhost:${TEST_SERVER_PORT}`
      }
    };
    
    if (bodyBuffer) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = bodyBuffer.length;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    if (bodyBuffer) {
      req.write(bodyBuffer);
    }
    req.end();
  });
}

function makeMockRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const bodyBuffer = body ? Buffer.from(JSON.stringify(body)) : null;
    
    const options = {
      hostname: 'localhost',
      port: MOCK_PORT,
      path: path,
      method: method,
      headers: {}
    };
    
    if (bodyBuffer) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = bodyBuffer.length;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    if (bodyBuffer) {
      req.write(bodyBuffer);
    }
    req.end();
  });
}

async function testSessionManager() {
  console.log('\n[Test] Testing SessionManager...');
  
  const sessionManager = new SessionManager({
    sessionsDir: DEFAULT_CONFIG.sessionsDir
  });

  const sessionId = sessionManager.createSession('unit-test-' + Date.now());
  console.log(`[Test] Created session: ${sessionId}`);

  const testRecord = {
    request: {
      method: 'GET',
      url: `http://localhost:${TEST_SERVER_PORT}/api/hello`,
      host: `localhost:${TEST_SERVER_PORT}`,
      hostname: 'localhost',
      pathname: '/api/hello',
      path: '/api/hello',
      headers: { 'Content-Type': 'application/json' },
      body: ''
    },
    response: {
      statusCode: 200,
      statusMessage: 'OK',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Test' })
    }
  };

  sessionManager.addRecord(testRecord);
  console.log(`[Test] Added test record`);

  const savedPath = sessionManager.saveSession();
  console.log(`[Test] Session saved to: ${savedPath}`);

  sessionManager.loadSession(sessionId);
  const records = sessionManager.getRecords();
  console.log(`[Test] Loaded session, records count: ${records.length}`);

  if (records.length !== 1) {
    throw new Error('SessionManager test failed: record count mismatch');
  }

  const filteredByPath = sessionManager.filterRecords({ path: '/api/hello' });
  console.log(`[Test] Filtered by path: ${filteredByPath.length}`);
  if (filteredByPath.length !== 1) {
    throw new Error('SessionManager filter by path failed');
  }

  const filteredByHostname = sessionManager.filterRecords({ domain: 'localhost' });
  console.log(`[Test] Filtered by hostname 'localhost': ${filteredByHostname.length}`);
  if (filteredByHostname.length !== 1) {
    throw new Error('SessionManager filter by hostname failed');
  }

  const filteredByStatusCode = sessionManager.filterRecords({ statusCode: 200 });
  console.log(`[Test] Filtered by statusCode 200: ${filteredByStatusCode.length}`);
  if (filteredByStatusCode.length !== 1) {
    throw new Error('SessionManager filter by statusCode failed');
  }

  const filteredByMethod = sessionManager.filterRecords({ method: 'GET' });
  console.log(`[Test] Filtered by method GET: ${filteredByMethod.length}`);
  if (filteredByMethod.length !== 1) {
    throw new Error('SessionManager filter by method failed');
  }

  console.log('[Test] SessionManager tests passed!');
  return true;
}

async function testMatchLogic() {
  console.log('\n[Test] Testing match logic...');

  const player = new Player();

  player.sessionManager.createSession('test-match');
  
  const records = [
    {
      id: '1',
      request: {
        method: 'GET',
        pathname: '/api/users',
        path: '/api/users?page=1',
        query: 'page=1'
      },
      response: { statusCode: 200, body: '{"page":1}' }
    },
    {
      id: '2',
      request: {
        method: 'GET',
        pathname: '/api/hello',
        path: '/api/hello',
        query: null
      },
      response: { statusCode: 200, body: '{"message":"hello"}' }
    },
    {
      id: '3',
      request: {
        method: 'POST',
        pathname: '/api/users',
        path: '/api/users',
        query: null
      },
      response: { statusCode: 201, body: '{"created":true}' }
    }
  ];

  player.sessionManager.records = records;

  console.log('[Test] Testing exact match strategy...');
  player.matchStrategy = 'exact';

  let result = player._matchRequest({
    method: 'GET',
    pathname: '/api/users',
    query: 'page=1'
  });
  console.log(`[Test] Exact match GET /api/users?page=1: matched=${result.matched}, id=${result.record?.id}`);
  if (!result.matched || result.record.id !== '1') {
    throw new Error('Exact match test failed');
  }

  result = player._matchRequest({
    method: 'GET',
    pathname: '/api/users',
    query: 'page=2'
  });
  console.log(`[Test] Exact match GET /api/users?page=2: matched=${result.matched}`);
  if (result.matched) {
    throw new Error('Exact match test failed: should not match');
  }

  console.log('[Test] Testing fuzzy match strategy...');
  player.matchStrategy = 'fuzzy';

  result = player._matchRequest({
    method: 'GET',
    pathname: '/api/users',
    query: 'page=2'
  });
  console.log(`[Test] Fuzzy match GET /api/users?page=2: matched=${result.matched}, id=${result.record?.id}`);
  if (!result.matched || result.record.id !== '1') {
    throw new Error('Fuzzy match test failed');
  }

  result = player._matchRequest({
    method: 'POST',
    pathname: '/api/users',
    query: null
  });
  console.log(`[Test] Fuzzy match POST /api/users: matched=${result.matched}, id=${result.record?.id}`);
  if (!result.matched || result.record.id !== '3') {
    throw new Error('Fuzzy match test failed for POST');
  }

  console.log('[Test] Match logic tests passed!');
  return true;
}

async function testRecordingFlow() {
  console.log('\n[Test] Testing recording flow...');

  const recorder = new Recorder({
    sessionsDir: DEFAULT_CONFIG.sessionsDir,
    proxyPort: PROXY_PORT
  });

  const recorderInfo = await recorder.start({
    sessionId: TEST_SESSION_ID,
    port: PROXY_PORT
  });
  console.log(`[Test] Recorder started on port ${recorderInfo.port}, session: ${recorderInfo.sessionId}`);

  await new Promise(r => setTimeout(r, 100));

  console.log('[Test] Making GET request through proxy...');
  const getResponse = await makeProxyRequest('/api/hello');
  console.log(`[Test] GET response status: ${getResponse.statusCode}`);
  console.log(`[Test] GET response body: ${getResponse.body.substring(0, 100)}...`);

  if (getResponse.statusCode !== 200) {
    throw new Error('Proxy GET request failed');
  }

  const getResponseBody = JSON.parse(getResponse.body);
  if (!getResponseBody.message) {
    throw new Error('GET response body is empty or invalid');
  }

  console.log('[Test] Making POST request through proxy...');
  const postData = { name: 'Test User', email: 'test@example.com' };
  const postResponse = await makeProxyRequest('/api/submit', 'POST', postData);
  console.log(`[Test] POST response status: ${postResponse.statusCode}`);
  console.log(`[Test] POST response body: ${postResponse.body.substring(0, 100)}...`);

  if (postResponse.statusCode !== 201) {
    throw new Error('Proxy POST request failed');
  }

  const postResponseBody = JSON.parse(postResponse.body);
  if (!postResponseBody.success) {
    throw new Error('POST response indicates failure');
  }
  if (!postResponseBody.received || postResponseBody.received.name !== 'Test User') {
    throw new Error('POST request body was not forwarded correctly to target server');
  }

  console.log('[Test] Making request to /api/not-found...');
  const notFoundResponse = await makeProxyRequest('/api/not-found');
  console.log(`[Test] Not Found response status: ${notFoundResponse.statusCode}`);

  await new Promise(r => setTimeout(r, 200));

  const recordsBeforeSave = recorder.sessionManager.getRecords();
  console.log(`[Test] Records before save: ${recordsBeforeSave.length}`);

  if (recordsBeforeSave.length !== 3) {
    throw new Error(`Expected 3 records, got ${recordsBeforeSave.length}`);
  }

  const firstRecord = recordsBeforeSave[0];
  console.log(`[Test] First record method: ${firstRecord.request.method}`);
  console.log(`[Test] First record response body length: ${firstRecord.response.body?.length || 0}`);
  console.log(`[Test] First record response bodyBuffer length: ${firstRecord.response.bodyBuffer?.length || 0}`);

  if (!firstRecord.response.body && !firstRecord.response.bodyBuffer) {
    throw new Error('Response body was not recorded! This is a critical bug.');
  }

  if (firstRecord.response.body) {
    console.log(`[Test] Response body sample: ${firstRecord.response.body.substring(0, 50)}...`);
  }

  const postRecord = recordsBeforeSave.find(r => r.request.method === 'POST');
  if (postRecord) {
    console.log(`[Test] POST record request body: ${postRecord.request.body?.substring(0, 50) || 'empty'}...`);
    if (!postRecord.request.body) {
      throw new Error('POST request body was not recorded!');
    }
    const recordedBody = JSON.parse(postRecord.request.body);
    if (recordedBody.name !== 'Test User') {
      throw new Error('POST request body was not recorded correctly');
    }
  } else {
    throw new Error('POST record not found');
  }

  const stopResult = await recorder.stop();
  console.log(`[Test] Recorder stopped, saved to: ${stopResult.savedPath}`);
  console.log(`[Test] Total records saved: ${stopResult.recordCount}`);

  if (stopResult.recordCount !== 3) {
    throw new Error(`Expected 3 records saved, got ${stopResult.recordCount}`);
  }

  console.log('[Test] Recording flow tests passed!');
  return true;
}

async function testPlaybackFlow() {
  console.log('\n[Test] Testing playback flow...');

  const player = new Player({
    sessionsDir: DEFAULT_CONFIG.sessionsDir,
    mockPort: MOCK_PORT
  });

  const playerInfo = await player.start({
    sessionId: TEST_SESSION_ID,
    port: MOCK_PORT,
    matchStrategy: 'exact'
  });
  console.log(`[Test] Player started on port ${playerInfo.port}`);
  console.log(`[Test] Total records: ${playerInfo.recordCount}`);

  await new Promise(r => setTimeout(r, 100));

  console.log('[Test] Making request to recorded path (should HIT)...');
  const hitResponse = await makeMockRequest('/api/hello');
  console.log(`[Test] HIT response status: ${hitResponse.statusCode}`);
  console.log(`[Test] HIT response body: ${hitResponse.body.substring(0, 100)}...`);

  if (hitResponse.statusCode !== 200) {
    throw new Error('Expected 200 for recorded path');
  }

  const hitBody = JSON.parse(hitResponse.body);
  if (!hitBody.message) {
    throw new Error('Playback response body is missing');
  }

  console.log('[Test] Making request to non-recorded path (should MISS)...');
  const missResponse = await makeMockRequest('/api/non-existent');
  console.log(`[Test] MISS response status: ${missResponse.statusCode}`);

  if (missResponse.statusCode !== 404) {
    throw new Error(`Expected 404 for non-recorded path, got ${missResponse.statusCode}`);
  }

  await player.stop();
  console.log('[Test] Player stopped');

  console.log('[Test] Restarting player with fuzzy matching...');
  const playerFuzzy = new Player({
    sessionsDir: DEFAULT_CONFIG.sessionsDir,
    mockPort: MOCK_PORT
  });

  await playerFuzzy.start({
    sessionId: TEST_SESSION_ID,
    port: MOCK_PORT,
    matchStrategy: 'fuzzy'
  });

  await new Promise(r => setTimeout(r, 100));

  console.log('[Test] Making request with different query params (fuzzy should HIT)...');
  const fuzzyResponse = await makeMockRequest('/api/hello?foo=bar');
  console.log(`[Test] Fuzzy response status: ${fuzzyResponse.statusCode}`);

  if (fuzzyResponse.statusCode !== 200) {
    throw new Error('Fuzzy match should have ignored query params');
  }

  await playerFuzzy.stop();

  console.log('[Test] Playback flow tests passed!');
  return true;
}

async function testFilteredPlayback() {
  console.log('\n[Test] Testing filtered playback...');

  const player = new Player({
    sessionsDir: DEFAULT_CONFIG.sessionsDir,
    mockPort: MOCK_PORT
  });

  await player.start({
    sessionId: TEST_SESSION_ID,
    port: MOCK_PORT,
    matchStrategy: 'exact',
    filters: {
      statusCode: 200
    }
  });

  await new Promise(r => setTimeout(r, 100));

  console.log('[Test] Filtered by statusCode=200');
  const helloResponse = await makeMockRequest('/api/hello');
  console.log(`[Test] /api/hello (200) response: ${helloResponse.statusCode}`);

  if (helloResponse.statusCode !== 200) {
    throw new Error('Expected 200 for /api/hello');
  }

  const submitResponse = await makeMockRequest('/api/submit');
  console.log(`[Test] /api/submit (201 filtered out) response: ${submitResponse.statusCode}`);

  if (submitResponse.statusCode !== 404) {
    throw new Error('Expected 404 for filtered out 201 status');
  }

  await player.stop();

  console.log('[Test] Filtered playback tests passed!');
  return true;
}

async function runTests() {
  console.log('========================================');
  console.log('  Running HTTP Recorder Tests');
  console.log('========================================');

  try {
    await createTestServer();

    await testSessionManager();
    await testMatchLogic();
    await testRecordingFlow();
    await testPlaybackFlow();
    await testFilteredPlayback();

    await closeTestServer();

    console.log('\n========================================');
    console.log('  All tests passed!');
    console.log('========================================');

    process.exit(0);
  } catch (err) {
    console.error('\n========================================');
    console.error('  Test failed:', err.message);
    console.error('========================================');
    console.error(err.stack);
    
    try {
      await closeTestServer();
    } catch (e) {}
    
    process.exit(1);
  }
}

runTests();

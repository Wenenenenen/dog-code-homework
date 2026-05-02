# HTTP 录制与回放服务

一个基于 Node.js 的本地 HTTP 录制与回放服务，支持拦截 HTTP/HTTPS 请求，将请求和响应录制到本地 JSON 文件，并在回放时启动 Mock 服务器返回录制的响应。

## 功能特性

- ✅ 代理服务：拦截 HTTP/HTTPS 请求，录制请求和响应
- ✅ 会话管理：支持多个录制会话，独立存储
- ✅ 回放服务：启动 Mock 服务器，返回录制的响应
- ✅ 匹配策略：支持精确匹配和模糊匹配两种模式
- ✅ 过滤回放：按域名、路径、状态码、HTTP 方法过滤回放
- ✅ CLI 接口：完整的命令行工具，支持录制、回放、列出、导出等操作
- ✅ 匹配日志：回放时输出详细的命中/未命中日志

## 项目结构

```
007-http-recorder-replayer/
├── src/
│   ├── core/
│   │   ├── config.js          # 配置管理
│   │   ├── sessionManager.js  # 会话管理器
│   │   ├── recorder.js        # 录制服务
│   │   └── player.js          # 回放服务
│   ├── cli/
│   │   └── cli.js             # CLI 命令处理
│   └── index.js               # 入口文件
├── sessions/                   # 录制会话存储目录
├── package.json
└── README.md
```

## 安装依赖

```bash
cd 007-http-recorder-replayer
npm install
```

## 快速开始

### 1. 录制请求

启动录制代理服务：

```bash
node src/index.js record -p 8080
```

或者指定会话名称：

```bash
node src/index.js record -s my-session -p 8080
```

**录制步骤：**

1. 启动录制服务后，控制台会显示代理地址
2. 设置系统或应用的 HTTP 代理为 `http://localhost:8080`
3. 发送 HTTP/HTTPS 请求，请求会被录制下来
4. 按 `Ctrl+C` 停止录制，会话会自动保存到 JSON 文件

### 2. 查看会话列表

```bash
node src/index.js list
```

### 3. 查看会话详情

```bash
node src/index.js view -s session_2026-05-01_11-58
```

或以 JSON 格式输出：

```bash
node src/index.js view -s session_2026-05-01_11-58 -j
```

### 4. 回放录制

启动回放服务：

```bash
node src/index.js play -s session_2026-05-01_11-58 -p 3000
```

**回放模式：**

- **精确匹配**（默认）：匹配 method + pathname + query 参数
- **模糊匹配**：仅匹配 method + pathname

使用模糊匹配：

```bash
node src/index.js play -s my-session -p 3000 --match-strategy fuzzy
```

### 5. 过滤回放

按域名过滤：

```bash
node src/index.js play -s my-session --filter-domain api.example.com
```

按路径过滤（包含匹配）：

```bash
node src/index.js play -s my-session --filter-path /api/users
```

按状态码过滤：

```bash
node src/index.js play -s my-session --filter-status 200
```

按 HTTP 方法过滤：

```bash
node src/index.js play -s my-session --filter-method GET
```

组合过滤：

```bash
node src/index.js play -s my-session --filter-domain api.example.com --filter-method GET --filter-status 200
```

### 6. 导出单条记录

先查看记录 ID：

```bash
node src/index.js view -s my-session
```

然后导出：

```bash
node src/index.js export -s my-session -r 1777607859880-abc123def -o output.json
```

### 7. 删除会话

```bash
node src/index.js delete -s my-session
```

## 命令参考

### record 命令

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-s, --session` | 会话名称 | 自动生成（如 `session_2026-05-01_11-58`） |
| `-p, --port` | 代理端口 | 8080 |
| `--sessions-dir` | 会话存储目录 | `./sessions` |

### play 命令

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-s, --session` | 会话名称（必需） | - |
| `-p, --port` | Mock 服务端口 | 3000 |
| `--match-strategy` | 匹配策略：`exact` 或 `fuzzy` | `exact` |
| `--filter-domain` | 按域名过滤 | - |
| `--filter-path` | 按路径过滤（包含匹配） | - |
| `--filter-status` | 按状态码过滤 | - |
| `--filter-method` | 按 HTTP 方法过滤 | - |
| `--sessions-dir` | 会话存储目录 | `./sessions` |

### list 命令

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--sessions-dir` | 会话存储目录 | `./sessions` |

### view 命令

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-s, --session` | 会话名称（必需） | - |
| `-j, --json` | 以 JSON 格式输出 | false |
| `--sessions-dir` | 会话存储目录 | `./sessions` |

### export 命令

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-s, --session` | 会话名称（必需） | - |
| `-r, --record` | 记录 ID（必需） | - |
| `-o, --output` | 输出文件路径（必需） | - |
| `--sessions-dir` | 会话存储目录 | `./sessions` |

### delete 命令

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-s, --session` | 会话名称（必需） | - |
| `--sessions-dir` | 会话存储目录 | `./sessions` |

## 匹配策略说明

### 精确匹配 (exact)

- 方法 (method) 必须相同
- 路径名 (pathname) 必须相同
- 查询参数 (query) 必须完全相同（键值对数量和值都要匹配）

例如：
- 请求 `GET /api/users?page=1&limit=10`
- 会匹配 `GET /api/users?page=1&limit=10`
- 不会匹配 `GET /api/users?page=1`
- 不会匹配 `GET /api/users?page=2&limit=10`

### 模糊匹配 (fuzzy)

- 方法 (method) 必须相同
- 路径名 (pathname) 必须相同
- 查询参数忽略

例如：
- 请求 `GET /api/users?page=1&limit=10`
- 会匹配 `GET /api/users?page=1&limit=10`
- 会匹配 `GET /api/users?page=1`
- 会匹配 `GET /api/users?any=param`
- 不会匹配 `GET /api/users/1`

## 会话文件格式

录制的会话以 JSON 格式存储，结构如下：

```json
{
  "sessionId": "session_2026-05-01_11-58",
  "createdAt": "2026-05-01T11:58:00.000Z",
  "records": [
    {
      "id": "1777607859880-abc123def",
      "timestamp": "2026-05-01T11:58:00.000Z",
      "request": {
        "method": "GET",
        "url": "http://api.example.com/api/users?page=1",
        "protocol": "http:",
        "host": "api.example.com",
        "hostname": "api.example.com",
        "port": 80,
        "path": "/api/users?page=1",
        "pathname": "/api/users",
        "query": "page=1",
        "headers": {
          "host": "api.example.com",
          "user-agent": "curl/7.68.0",
          "accept": "*/*"
        },
        "body": "",
        "bodyBuffer": ""
      },
      "response": {
        "statusCode": 200,
        "statusMessage": "OK",
        "headers": {
          "content-type": "application/json",
          "content-length": "123"
        },
        "body": "{\"data\":[]}",
        "bodyBuffer": "eyJkYXRhIjpbXX0="
      }
    }
  ]
}
```

## 使用示例

### 场景 1：录制并回放 API 测试

1. 启动录制：
```bash
node src/index.js record -s api-test
```

2. 设置代理并运行测试脚本：
```bash
export HTTP_PROXY=http://localhost:8080
export HTTPS_PROXY=http://localhost:8080
npm test
```

3. 停止录制（Ctrl+C）

4. 启动回放服务：
```bash
node src/index.js play -s api-test
```

5. 运行测试，使用 Mock 服务：
```bash
export API_BASE_URL=http://localhost:3000
npm test
```

### 场景 2：离线开发

1. 有网络时录制：
```bash
node src/index.js record -s offline-dev
```

2. 使用代理访问所需的所有 API

3. 停止录制

4. 离线时启动回放：
```bash
node src/index.js play -s offline-dev --match-strategy fuzzy
```

5. 应用配置 API 地址为 `http://localhost:3000`

## 注意事项

1. **HTTPS 支持**：当前版本通过 CONNECT 隧道支持 HTTPS 连接，但无法解密 HTTPS 流量内容进行录制。完整的 HTTPS 录制需要使用中间人技术（需要安装自签名证书）。

2. **二进制响应**：响应体会以 Base64 编码存储在 `bodyBuffer` 字段中，回放时会正确解码。

3. **代理配置**：录制时需要配置客户端使用本服务作为 HTTP/HTTPS 代理。

4. **端口冲突**：确保使用的端口未被其他程序占用。

## 依赖说明

- **commander**：命令行参数解析
- **http-proxy**：HTTP 代理服务

## 许可证

MIT

const { Command } = require('commander');
const SessionManager = require('../core/sessionManager');
const Recorder = require('../core/recorder');
const Player = require('../core/player');
const { DEFAULT_CONFIG } = require('../core/config');

class CLI {
  constructor() {
    this.program = new Command();
    this._setupCommands();
  }

  _setupCommands() {
    this.program
      .name('http-recorder')
      .description('本地 HTTP 录制与回放服务')
      .version('1.0.0');

    this.program
      .command('record')
      .description('启动录制服务')
      .option('-s, --session <sessionId>', '会话名称 (默认自动生成)')
      .option('-p, --port <port>', '代理服务端口', DEFAULT_CONFIG.proxyPort)
      .option('--sessions-dir <dir>', '会话存储目录', DEFAULT_CONFIG.sessionsDir)
      .action(this._handleRecord.bind(this));

    this.program
      .command('play')
      .description('启动回放服务')
      .requiredOption('-s, --session <sessionId>', '会话名称')
      .option('-p, --port <port>', 'Mock 服务端口', DEFAULT_CONFIG.mockPort)
      .option('--sessions-dir <dir>', '会话存储目录', DEFAULT_CONFIG.sessionsDir)
      .option('--match-strategy <strategy>', '匹配策略: exact 或 fuzzy', 'exact')
      .option('--filter-domain <domain>', '按域名过滤')
      .option('--filter-path <path>', '按路径过滤 (包含匹配)')
      .option('--filter-status <code>', '按状态码过滤', parseInt)
      .option('--filter-method <method>', '按 HTTP 方法过滤')
      .action(this._handlePlay.bind(this));

    this.program
      .command('list')
      .description('列出所有录制会话')
      .option('--sessions-dir <dir>', '会话存储目录', DEFAULT_CONFIG.sessionsDir)
      .action(this._handleList.bind(this));

    this.program
      .command('view')
      .description('查看会话详情')
      .requiredOption('-s, --session <sessionId>', '会话名称')
      .option('--sessions-dir <dir>', '会话存储目录', DEFAULT_CONFIG.sessionsDir)
      .option('-j, --json', '以 JSON 格式输出')
      .action(this._handleView.bind(this));

    this.program
      .command('export')
      .description('导出单条记录')
      .requiredOption('-s, --session <sessionId>', '会话名称')
      .requiredOption('-r, --record <recordId>', '记录 ID')
      .requiredOption('-o, --output <file>', '输出文件路径')
      .option('--sessions-dir <dir>', '会话存储目录', DEFAULT_CONFIG.sessionsDir)
      .action(this._handleExport.bind(this));

    this.program
      .command('delete')
      .description('删除会话')
      .requiredOption('-s, --session <sessionId>', '会话名称')
      .option('--sessions-dir <dir>', '会话存储目录', DEFAULT_CONFIG.sessionsDir)
      .action(this._handleDelete.bind(this));
  }

  async _handleRecord(options) {
    const config = {
      sessionsDir: options.sessionsDir,
      proxyPort: options.port
    };

    const recorder = new Recorder(config);
    
    try {
      const result = await recorder.start({
        sessionId: options.session,
        port: options.port
      });

      const cleanup = async () => {
        console.log('\n正在停止录制...');
        await recorder.stop();
        process.exit(0);
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

    } catch (err) {
      console.error('录制启动失败:', err.message);
      process.exit(1);
    }
  }

  async _handlePlay(options) {
    const config = {
      sessionsDir: options.sessionsDir,
      mockPort: options.port,
      matchStrategy: options.matchStrategy
    };

    const filters = {};
    if (options.filterDomain) filters.domain = options.filterDomain;
    if (options.filterPath) filters.path = options.filterPath;
    if (options.filterStatus !== undefined) filters.statusCode = options.filterStatus;
    if (options.filterMethod) filters.method = options.filterMethod;

    const player = new Player(config);

    try {
      const result = await player.start({
        sessionId: options.session,
        port: options.port,
        matchStrategy: options.matchStrategy,
        filters
      });

      const cleanup = async () => {
        console.log('\n正在停止回放服务器...');
        await player.stop();
        process.exit(0);
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

    } catch (err) {
      console.error('回放启动失败:', err.message);
      process.exit(1);
    }
  }

  _handleList(options) {
    const sessionManager = new SessionManager({ sessionsDir: options.sessionsDir });
    const sessions = sessionManager.listSessions();

    if (sessions.length === 0) {
      console.log('没有找到任何录制会话');
      return;
    }

    console.log('========================================');
    console.log('  录制会话列表');
    console.log('========================================');
    console.log('');

    sessions.forEach((session, index) => {
      console.log(`${index + 1}. ${session.sessionId}`);
      console.log(`   创建时间: ${session.createdAt}`);
      console.log(`   修改时间: ${session.modifiedAt}`);
      console.log(`   记录数量: ${session.recordCount}`);
      console.log(`   文件大小: ${session.size} bytes`);
      console.log('');
    });
  }

  _handleView(options) {
    const sessionManager = new SessionManager({ sessionsDir: options.sessionsDir });

    try {
      const records = sessionManager.loadSession(options.session);
      
      if (options.json) {
        console.log(JSON.stringify({
          sessionId: options.session,
          records
        }, null, 2));
        return;
      }

      console.log('========================================');
      console.log(`  会话详情: ${options.session}`);
      console.log('========================================');
      console.log(`  总记录数: ${records.length}`);
      console.log('');

      if (records.length === 0) {
        console.log('  该会话没有记录');
        return;
      }

      records.forEach((record, index) => {
        console.log(`[${index + 1}] ID: ${record.id}`);
        console.log(`    时间: ${record.timestamp}`);
        console.log(`    请求: ${record.request?.method} ${record.request?.url}`);
        console.log(`    响应: ${record.response?.statusCode} ${record.response?.statusMessage}`);
        console.log('');
      });

    } catch (err) {
      console.error('查看会话失败:', err.message);
      process.exit(1);
    }
  }

  _handleExport(options) {
    const sessionManager = new SessionManager({ sessionsDir: options.sessionsDir });

    try {
      sessionManager.loadSession(options.session);
      const outputPath = sessionManager.exportRecord(options.record, options.output);
      
      console.log(`记录已导出到: ${outputPath}`);
    } catch (err) {
      console.error('导出失败:', err.message);
      process.exit(1);
    }
  }

  _handleDelete(options) {
    const sessionManager = new SessionManager({ sessionsDir: options.sessionsDir });

    try {
      sessionManager.deleteSession(options.session);
      console.log(`会话已删除: ${options.session}`);
    } catch (err) {
      console.error('删除失败:', err.message);
      process.exit(1);
    }
  }

  run(args) {
    this.program.parse(args);
  }
}

module.exports = CLI;

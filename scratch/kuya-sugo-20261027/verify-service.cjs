const assert = require('node:assert/strict');
const { build } = require('esbuild');
const Module = require('node:module');

(async () => {
  const output = await build({
    entryPoints: ['src/services/ownerCopilotApiService.ts'], bundle: true, write: false,
    platform: 'node', format: 'cjs', external: ['axios'],
    plugins: [{ name: 'local-api-stub', setup(builder) {
      builder.onResolve({ filter: /^\.\/apiClient$/ }, () => ({ path: 'api-client', namespace: 'test' }));
      builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export const apiClient = { post: (...args) => globalThis.copilotTestPost(...args) };' }));
    } }],
  });
  const loaded = new Module(__filename);
  loaded.paths = module.paths;
  loaded._compile(output.outputFiles[0].text, __filename);
  const service = loaded.exports.ownerCopilotApiService;
  const messages = [{ role: 'user', content: 'How are sales today?' }];
  globalThis.copilotTestPost = async (path, payload, config) => {
    assert.equal(path, '/owner/copilot/chat');
    assert.deepEqual(payload, { messages, portalContext: { activeModule: 'dashboard' } });
    assert.equal(config.timeout, 45000);
    return { data: { reply: 'Your report is ready.', toolsUsed: [], actionLinks: [] } };
  };
  assert.equal((await service.sendMessage(messages, { activeModule: 'dashboard' })).reply, 'Your report is ready.');
  for (const status of [429, 401, 403, 500, undefined]) {
    globalThis.copilotTestPost = async () => { throw { isAxiosError: true, response: status ? { status, data: { error: 'private backend detail' } } : undefined, message: 'private backend detail' }; };
    const response = await service.sendMessage(messages);
    assert.ok(!response.reply.includes('private backend detail'));
    if (status === 429) assert.match(response.reply, /wait a minute/);
    else if (status === 401 || status === 403) assert.match(response.reply, /sign in/);
    else assert.match(response.reply, /connection and try again/);
    assert.deepEqual(response.actionLinks, []);
  }
  delete globalThis.copilotTestPost;
  console.log('Passed: unchanged API payload/timeout, success, 429, 401, 403, server and network failures, no raw error details.');
})().catch(error => { console.error(error); process.exitCode = 1; });

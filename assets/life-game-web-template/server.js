import http from 'node:http';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LIFE_FILE = process.env.LIFE_GAME_FILE || path.join(ROOT, 'memory/life-game.md');
const BACKUP_DIR = path.join(ROOT, 'memory/.life-game-backups');
const PORT = Number(process.env.PORT || 8090);
const HOST = process.env.HOST || '127.0.0.1';
const AUTH_TOKEN = process.env.LIFE_GAME_TOKEN || '';
const LOGIN_USER = process.env.LIFE_GAME_USER || 'polar';
const LOGIN_PASSWORD = process.env.LIFE_GAME_PASSWORD || '';
const SESSION_SECRET = process.env.LIFE_GAME_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_TTL = 1000 * 60 * 60 * 24 * 14;
const BASE_PATH = (process.env.BASE_PATH || '').replace(/\/$/, '');

function send(res, code, data, headers = {}) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  res.writeHead(code, { 'content-type': typeof data === 'string' ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8', ...headers });
  res.end(body);
}
function text(res, code, body, headers = {}) { res.writeHead(code, { 'content-type': 'text/plain; charset=utf-8', ...headers }); res.end(body); }
function parseCookies(req) { return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(v => { const i=v.indexOf('='); return [decodeURIComponent(v.slice(0,i).trim()), decodeURIComponent(v.slice(i+1).trim())]; })); }
function sign(payload) { return crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url'); }
function makeSession() { const payload = Buffer.from(JSON.stringify({ u: LOGIN_USER, exp: Date.now() + SESSION_TTL })).toString('base64url'); return `${payload}.${sign(payload)}`; }
function verifySession(cookie) { try { if (!cookie) return false; const [payload, sig] = cookie.split('.'); if (!payload || sig !== sign(payload)) return false; const obj = JSON.parse(Buffer.from(payload, 'base64url').toString()); return obj.exp > Date.now(); } catch { return false; } }
function safeEqual(a, b) { const aa = Buffer.from(String(a)); const bb = Buffer.from(String(b)); return aa.length === bb.length && crypto.timingSafeEqual(aa, bb); }
function isAuthed(req, url) {
  const cookies = parseCookies(req);
  if (verifySession(cookies.life_game_session)) return true;
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (AUTH_TOKEN && bearer && safeEqual(bearer, AUTH_TOKEN)) return true;
  if (AUTH_TOKEN && url.searchParams.get('token') && safeEqual(url.searchParams.get('token'), AUTH_TOKEN)) return true;
  return false;
}
async function readBody(req) { let b=''; for await (const c of req) b += c; try { return b ? JSON.parse(b) : {}; } catch { return {}; } }
function today() { return new Date().toISOString().slice(0,10); }
function parseNum(s) { return Number(String(s || '').replace(/[,，]/g, '').match(/-?\d+(\.\d+)?/)?.[0] || 0); }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function parseLife(md) {
  const state = {
    level: parseNum(md.match(/\*\*等级[:：]\*\*\s*([^\n]+)/)?.[1]),
    xp: parseNum(md.match(/\*\*当前经验[:：]\*\*\s*([^\n]+)/)?.[1]),
    nextRequired: parseNum(md.match(/\*\*下一级所需[:：]\*\*\s*([^\n]+)/)?.[1]),
    points: parseNum(md.match(/\*\*奖励分数余额[:：]\*\*\s*([^\n]+)/)?.[1])
  };
  const levels = [];
  const levelBlock = md.match(/## 📈 等级经验表[\s\S]*?(?=\n---|\n## )/)?.[0] || '';
  for (const line of levelBlock.split('\n')) {
    const m = line.match(/^\|\s*(\d+)\s*\|\s*([\d,，]+)\s*\|\s*([\d,，]+)\s*\|/);
    if (m) levels.push({ level: Number(m[1]), xp: parseNum(m[2]), reward: parseNum(m[3]) });
  }
  const tasks = [];
  const taskBlock = md.match(/## 📋 计划清单与分数[\s\S]*?(?=\n---\n\n##|\n## 📝 经验记录)/)?.[0] || '';
  let category = '未分类';
  for (const line of taskBlock.split('\n')) {
    const h = line.match(/^###\s+(.+)/); if (h) { category = h[1].trim(); continue; }
    const m = line.match(/^\|\s*(.+?)\s*\|\s*([\d,，]+)\s*\|\s*(.+?)\s*\|\s*$/);
    if (!m || m[1].includes('任务') || m[1].includes(':---')) continue;
    const status = m[3].trim();
    const completed = /^\[\d{4}-\d{2}-\d{2}\]$/.test(status);
    const repeatable = /可重复/.test(status);
    tasks.push({ id: crypto.createHash('sha1').update(`${category}|${m[1].trim()}`).digest('hex').slice(0,12), category, title: m[1].trim(), score: parseNum(m[2]), status, completed, repeatable, active: !completed || repeatable });
  }
  const recent = (md.match(/## 📝 近期记录[\s\S]*?(?=\n---)/)?.[0] || '').split('\n').filter(l => l.startsWith('- ')).slice(0, 12).map(l => l.slice(2));
  const progressBase = levels.find(l => l.level === state.level)?.xp ?? 0;
  const next = levels.find(l => l.level === state.level + 1)?.xp ?? state.nextRequired;
  state.progressPct = next > progressBase ? Math.max(0, Math.min(100, Math.round((state.xp - progressBase) / (next - progressBase) * 100))) : 100;
  state.toNext = Math.max(0, next - state.xp);
  return { state, levels, tasks, recent, updatedAt: new Date().toISOString() };
}
async function backup(md) { await fs.mkdir(BACKUP_DIR, { recursive: true }); await fs.writeFile(path.join(BACKUP_DIR, `life-game-${new Date().toISOString().replace(/[:.]/g,'-')}.md`), md); }
function updateState(md, xp, points, level, levels) {
  let newLevel = level; let newPoints = points; const notes = [];
  for (const row of levels.sort((a,b)=>a.level-b.level)) {
    if (row.level > newLevel && xp >= row.xp) { newLevel = row.level; newPoints += row.reward; notes.push(`- 🆙 **等级提升：LV.${newLevel-1} -> LV.${newLevel}**`); notes.push(`- 🎁 升级奖励：+${row.reward} 分数`); }
  }
  const nextReq = levels.find(l => l.level === newLevel + 1)?.xp || levels.find(l => l.level === newLevel)?.xp || xp;
  md = md.replace(/- \*\*等级[:：]\*\*\s*[^\n]+/, `- **等级：** ${newLevel}`)
         .replace(/- \*\*当前经验[:：]\*\*\s*[^\n]+/, `- **当前经验：** ${xp}`)
         .replace(/- \*\*下一级所需[:：]\*\*\s*[^\n]+/, `- **下一级所需：** ${nextReq.toLocaleString('en-US')}（${newLevel}→${newLevel+1} 需要累计 ${nextReq.toLocaleString('en-US')} 经验）`)
         .replace(/- \*\*奖励分数余额[:：]\*\*\s*[^\n]+/, `- **奖励分数余额：** ${newPoints}`);
  return { md, level: newLevel, points: newPoints, notes, nextReq };
}
async function mutate(mutator) {
  const md = await fs.readFile(LIFE_FILE, 'utf8');
  await backup(md);
  const parsed = parseLife(md);
  const next = mutator(md, parsed);
  await fs.writeFile(LIFE_FILE, next, 'utf8');
  return parseLife(next);
}
function findTaskLine(md, category, title) {
  const lines = md.split('\n'); let cat = '';
  for (let i=0; i<lines.length; i++) {
    const h = lines[i].match(/^###\s+(.+)/); if (h) cat = h[1].trim();
    const m = lines[i].match(/^\|\s*(.+?)\s*\|\s*([\d,，]+)\s*\|\s*(.+?)\s*\|\s*$/);
    if (m && cat === category && m[1].trim() === title) return { index: i, score: parseNum(m[2]), status: m[3].trim(), line: lines[i] };
  }
  return null;
}
function appendHistory(md, date, lines) {
  const entry = `\n### ${date}\n${lines.join('\n')}\n`;
  if (md.includes('## 📝 经验记录')) return md.replace(/(## 📝 经验记录\n)/, `$1${entry}`);
  return `${md}\n\n## 📝 经验记录\n${entry}`;
}

const assetBase = BASE_PATH || '';
function injectBase(s) {
  return s
    .replaceAll('__BASE_PATH__', assetBase)
    .replace('</head>', `<script>window.__LIFE_GAME_BASE_PATH__=${JSON.stringify(assetBase)}</script></head>`);
}
const appHtml = injectBase(fssync.readFileSync(path.join(__dirname, 'public/index.html'), 'utf8'));
const loginHtml = injectBase(fssync.readFileSync(path.join(__dirname, 'public/login.html'), 'utf8'));
const css = fssync.readFileSync(path.join(__dirname, 'public/style.css'), 'utf8');
const js = injectBase(fssync.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8'));

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (BASE_PATH) {
      if (url.pathname === BASE_PATH) return send(res, 302, '', { location: `${BASE_PATH}/` });
      if (!url.pathname.startsWith(`${BASE_PATH}/`)) return send(res, 404, { error: 'not found' });
      url.pathname = url.pathname.slice(BASE_PATH.length) || '/';
    }
    const withBase = (p) => `${BASE_PATH}${p}`;
    if (url.pathname === '/style.css') return text(res, 200, css, {'content-type':'text/css; charset=utf-8'});
    if (url.pathname === '/app.js') return text(res, 200, js, {'content-type':'application/javascript; charset=utf-8'});
    if (url.pathname === '/login' && req.method === 'GET') return send(res, 200, loginHtml);
    if (url.pathname === '/api/login' && req.method === 'POST') {
      const body = await readBody(req);
      const okToken = AUTH_TOKEN && body.token && safeEqual(body.token, AUTH_TOKEN);
      const okPass = LOGIN_PASSWORD && safeEqual(body.username || '', LOGIN_USER) && safeEqual(body.password || '', LOGIN_PASSWORD);
      if (!okToken && !okPass) return send(res, 401, { error: '验证失败' });
      return send(res, 200, { ok: true }, { 'set-cookie': `life_game_session=${makeSession()}; HttpOnly; Secure; SameSite=Lax; Path=${BASE_PATH || '/'}; Max-Age=${60*60*24*14}` });
    }
    if (!isAuthed(req, url)) return url.pathname.startsWith('/api/') ? send(res, 401, { error: '未登录' }) : send(res, 302, '', { location: withBase('/login') });
    if (url.searchParams.get('token')) res.setHeader('set-cookie', `life_game_session=${makeSession()}; HttpOnly; Secure; SameSite=Lax; Path=${BASE_PATH || '/'}; Max-Age=${60*60*24*14}`);
    if (url.pathname === '/' && req.method === 'GET') return send(res, 200, appHtml);
    if (url.pathname === '/api/state' && req.method === 'GET') return send(res, 200, parseLife(await fs.readFile(LIFE_FILE, 'utf8')));
    if (url.pathname === '/api/tasks' && req.method === 'POST') {
      const b = await readBody(req); const title = String(b.title || '').trim(); const category = String(b.category || '🎯 其他项目').trim(); const score = Math.max(0, Number(b.score || 0));
      if (!title || !score) return send(res, 400, { error: '任务名和分数必填' });
      const out = await mutate((md) => {
        const row = `| ${title.replace(/\|/g,'/')} | ${score} | ⬜ |`;
        const re = new RegExp(`(### ${category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n\\| 任务 \\| 分数 \\| 状态 \\|\\n\\|:---\\|:---:\\|:---:\\|\\n)([\\s\\S]*?)(?=\\n### |\\n---)`, 'm');
        if (re.test(md)) return md.replace(re, (_, head, body) => `${head}${body.trimEnd()}\n${row}\n`);
        return md.replace(/(## 📋 计划清单与分数\n)/, `$1\n### ${category}\n| 任务 | 分数 | 状态 |\n|:---|:---:|:---:|\n${row}\n`);
      });
      return send(res, 200, out);
    }
    if (url.pathname === '/api/tasks/complete' && req.method === 'POST') {
      const b = await readBody(req); const date = b.date || today();
      const out = await mutate((md, parsed) => {
        const task = parsed.tasks.find(t => t.id === b.id); if (!task) throw new Error('任务不存在');
        const found = findTaskLine(md, task.category, task.title); if (!found) throw new Error('任务行不存在');
        const lines = md.split('\n'); let gained = found.score;
        if (!/可重复/.test(found.status)) lines[found.index] = `| ${task.title} | ${found.score} | [${date}] |`;
        md = lines.join('\n');
        const xp = parsed.state.xp + gained; const basePoints = parsed.state.points + gained;
        let updated = updateState(md, xp, basePoints, parsed.state.level, parsed.levels);
        const hist = [`- ✅ ${task.title} +${gained} 经验 / +${gained} 分数`, ...updated.notes, `- 当前总经验：${xp}`, `- 距离 ${updated.level + 1} 级还差：${Math.max(0, updated.nextReq - xp)} 经验`];
        return appendHistory(updated.md, date, hist);
      });
      return send(res, 200, out);
    }
    if (url.pathname === '/api/tasks/reopen' && req.method === 'POST') {
      const b = await readBody(req);
      const out = await mutate((md, parsed) => {
        const task = parsed.tasks.find(t => t.id === b.id); if (!task) throw new Error('任务不存在');
        const found = findTaskLine(md, task.category, task.title); if (!found || /可重复/.test(found.status)) return md;
        const lines = md.split('\n'); lines[found.index] = `| ${task.title} | ${found.score} | ⬜ |`; return lines.join('\n');
      });
      return send(res, 200, out);
    }
    if (url.pathname === '/api/logout' && req.method === 'POST') return send(res, 200, { ok:true }, { 'set-cookie': `life_game_session=; HttpOnly; Secure; SameSite=Lax; Path=${BASE_PATH || '/'}; Max-Age=0` });
    return send(res, 404, { error: 'not found' });
  } catch (e) { console.error(e); return send(res, 500, { error: e.message || 'server error' }); }
}).listen(PORT, HOST, () => console.log(`Life Game web listening on http://${HOST}:${PORT}${BASE_PATH || ''}`));

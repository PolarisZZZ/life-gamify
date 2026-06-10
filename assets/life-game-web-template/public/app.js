let state = null;

const BASE = window.__LIFE_GAME_BASE_PATH__ || '';
const $ = (selector) => document.querySelector(selector);
const tasksEl = $('#tasks');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  window.setTimeout(() => el.classList.remove('show'), 1800);
}

async function api(url, opt = {}) {
  const res = await fetch(BASE + url, {
    headers: { 'content-type': 'application/json' },
    ...opt
  });
  if (res.status === 401) {
    location.href = BASE + '/login';
    return null;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

function render(data) {
  if (!data) return;
  state = data;

  $('#level').textContent = `LV.${data.state.level}`;
  $('#xpText').textContent = `${data.state.xp} / ${data.state.nextRequired} XP`;
  $('#points').textContent = data.state.points;
  $('#toNext').textContent = data.state.toNext;
  $('#pct').textContent = `${data.state.progressPct}%`;
  $('#ring').style.strokeDashoffset = 327 * (1 - data.state.progressPct / 100);
  $('#recent').innerHTML = data.recent.length
    ? data.recent.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    : '<li>暂无近期记录</li>';

  const categories = data.categories?.length
    ? data.categories
    : [...new Set(data.tasks.map((task) => task.category))];
  $('#category').innerHTML = categories.map((category) => `<option>${escapeHtml(category)}</option>`).join('');

  drawTasks();
  drawBodyHistory();
}

function drawBodyHistory() {
  const el = $('#bodyHistory');
  if (!state.bodyMetrics?.length) {
    el.innerHTML = '<p class="muted">暂无记录</p>';
    return;
  }

  const latest = state.bodyMetrics[0];
  el.innerHTML = `
    <div class="body-latest">
      <div><strong>${escapeHtml(latest.weight)}</strong><span>kg</span></div>
      <div><strong>${escapeHtml(latest.bodyfat)}</strong><span>%</span></div>
      <div><strong>${escapeHtml(latest.date.slice(5))}</strong><span>最近记录</span></div>
    </div>
    <table class="body-table">
      <thead><tr><th>日期</th><th>体重</th><th>体脂</th></tr></thead>
      <tbody>${state.bodyMetrics.slice(0, 10).map((entry) => `
        <tr>
          <td>${escapeHtml(entry.date)}</td>
          <td>${escapeHtml(entry.weight)} kg</td>
          <td>${escapeHtml(entry.bodyfat)}%</td>
        </tr>
      `).join('')}</tbody>
    </table>`;
}

function drawTasks() {
  const q = $('#search').value.trim().toLowerCase();
  const mode = $('#mode').value;
  const arr = state.tasks.filter((task) => {
    if (mode === 'active' && !task.active) return false;
    if (mode === 'done' && !task.completed) return false;
    return !q || `${task.title} ${task.category} ${task.status}`.toLowerCase().includes(q);
  });

  const groups = new Map();
  for (const task of arr) {
    if (!groups.has(task.category)) groups.set(task.category, []);
    groups.get(task.category).push(task);
  }

  tasksEl.innerHTML = [...groups].map(([category, list]) => `
    <section class="group">
      <h3><span>${escapeHtml(category)}</span><small>${list.length}</small></h3>
      ${list.map((task) => {
        const done = task.completed && !task.repeatable;
        return `
          <div class="task ${done ? 'done' : ''}" data-id="${escapeHtml(task.id)}">
            <button class="check icon-btn" data-id="${escapeHtml(task.id)}" data-act="${done ? 'reopen' : 'complete'}" aria-label="${done ? '重新打开' : '完成'}">${done ? '✓' : ''}</button>
            <div class="task-info">
              <div class="title">${escapeHtml(task.title)}</div>
              <div class="meta">${escapeHtml(task.status)}</div>
            </div>
            <div class="score">+${escapeHtml(task.score)}</div>
            <div class="task-actions">
              <span class="pill">${task.repeatable ? '可重复' : (task.completed ? '已完成' : '待完成')}</span>
              <button class="edit-btn icon-btn" data-id="${escapeHtml(task.id)}" title="编辑" aria-label="编辑">✎</button>
              <button class="del-btn icon-btn" data-id="${escapeHtml(task.id)}" title="删除" aria-label="删除">×</button>
            </div>
          </div>`;
      }).join('')}
    </section>
  `).join('') || '<section class="empty">没有匹配任务</section>';
}

async function load() {
  render(await api('/api/state'));
}

function closeModal() {
  $('#modal').classList.remove('show');
}

$('#bodyForm').elements.date.value = new Date().toISOString().slice(0, 10);
$('#search').oninput = drawTasks;
$('#mode').onchange = drawTasks;

$('#addForm').onsubmit = async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.target));
  render(await api('/api/tasks', { method: 'POST', body: JSON.stringify(body) }));
  event.target.reset();
  toast('任务已添加');
};

$('#catForm').onsubmit = async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.target));
  const category = body.category.trim();
  if (!category) return toast('分类名不能为空');
  render(await api('/api/categories', { method: 'POST', body: JSON.stringify({ category }) }));
  event.target.reset();
  toast('分类已创建');
};

$('#bodyForm').onsubmit = async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.target));
  const data = await api('/api/body', { method: 'POST', body: JSON.stringify(body) });
  render(data);
  event.target.date.value = new Date().toISOString().slice(0, 10);
  event.target.weight.value = '';
  event.target.bodyfat.value = '';
  toast(data.bodyEntryUpdated ? '身体数据已更新，不重复结算' : '身体数据已记录');
};

tasksEl.onclick = async (event) => {
  const btn = event.target.closest('button[data-id]');
  if (!btn) return;
  const id = btn.dataset.id;

  if (btn.classList.contains('edit-btn')) {
    const task = state.tasks.find((item) => item.id === id);
    if (!task) return;
    $('#editId').value = id;
    $('#editTitle').value = task.title;
    $('#editScore').value = task.score;
    $('#editCategory').value = task.category;
    $('#modal').classList.add('show');
    return;
  }

  if (btn.classList.contains('del-btn') && !confirm('确定删除这个任务？')) return;

  btn.disabled = true;
  try {
    if (btn.classList.contains('del-btn')) {
      render(await api('/api/tasks', { method: 'DELETE', body: JSON.stringify({ id }) }));
      toast('任务已删除');
      return;
    }
    const url = btn.dataset.act === 'reopen' ? '/api/tasks/reopen' : '/api/tasks/complete';
    render(await api(url, { method: 'POST', body: JSON.stringify({ id }) }));
    toast(btn.dataset.act === 'reopen' ? '已重新打开' : '已结算完成');
  } finally {
    btn.disabled = false;
  }
};

$('#editCancel').onclick = closeModal;
$('#modal').onclick = (event) => {
  if (event.target.id === 'modal') closeModal();
};
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeModal();
});

$('#editForm').onsubmit = async (event) => {
  event.preventDefault();
  const id = $('#editId').value;
  const title = $('#editTitle').value.trim();
  const score = Number($('#editScore').value);
  const category = $('#editCategory').value.trim();
  if (!title || !score || !category) return toast('请填写完整信息');
  render(await api('/api/tasks', { method: 'PUT', body: JSON.stringify({ id, title, score, category }) }));
  closeModal();
  toast('任务已更新');
};

$('#logout').onclick = async () => {
  await fetch(BASE + '/api/logout', { method: 'POST' });
  location.href = BASE + '/login';
};

load().catch((error) => toast(error.message));

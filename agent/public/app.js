const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const views = ['tasks', 'approvals', 'inbox', 'logs', 'tools'];
let currentView = 'tasks';
let lastState = { tasks: [], logs: [], inbox: [], tools: [] };

function setStatus(text, kind) {
  const el = $('#status');
  el.textContent = text;
  el.classList.remove('is-ok', 'is-bad');
  if (kind === 'ok') el.classList.add('is-ok');
  if (kind === 'bad') el.classList.add('is-bad');
}

function setView(name) {
  currentView = name;
  for (const v of views) {
    $(`#view-${v}`).classList.toggle('is-active', v === name);
  }
  for (const btn of $$('.nav__btn')) {
    btn.classList.toggle('is-active', btn.dataset.view === name);
  }
  render();
}

function pill(status) {
  const span = document.createElement('span');
  span.className = `pill is-${status}`;
  span.textContent = status;
  return span.outerHTML;
}

async function api(path, options) {
  const res = await fetch(path, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function renderTasks() {
  const el = $('#view-tasks');
  const tasks = lastState.tasks;

  const items = tasks
    .slice()
    .reverse()
    .map((t) => {
      const approveBtn =
        t.status === 'waiting_approval'
          ? `<button class="btn" data-approve="${t.id}">Approve Next Step</button>`
          : '';
      const editBtn =
        t.status === 'waiting_approval'
          ? `<button class="btn btn--ghost" data-edit="${t.id}">Edit Draft</button>`
          : '';
      return `
        <div class="card">
          <div class="row">
            <div>
              <div class="card__title">${escapeHtml(t.title)}</div>
              <div class="meta">id: ${t.id} • dibuat: ${formatTime(t.createdAt)} • step: ${t.currentStep}/${t.steps.length}</div>
            </div>
            <div class="row">
              ${pill(t.status)}
              ${editBtn}
              ${approveBtn}
            </div>
          </div>
          <div class="meta" style="margin-top:10px">Logs: ${t.logs?.length ?? 0}</div>
        </div>
      `;
    })
    .join('');

  el.innerHTML = `
    <div class="grid">
      <div class="card">
        <div class="card__title">Create Task</div>
        <div class="form">
          <input id="task-title" class="input" placeholder="Judul task" value="Uji Telegram + WebSearch" />
          <textarea id="task-steps" class="textarea">${defaultSteps()}</textarea>
          <div class="row">
            <button id="create-task" class="btn">Create</button>
            <span class="hint">Tool sendTelegram akan menunggu approval.</span>
          </div>
          <div id="task-error" class="hint" style="color: var(--danger)"></div>
        </div>
      </div>
      <div class="card">
        <div class="card__title">Tasks</div>
        <div class="hint">Klik Approve untuk melanjutkan step yang menunggu persetujuan.</div>
      </div>
    </div>
    <div style="height:12px"></div>
    <div class="grid" style="grid-template-columns: 1fr; gap: 12px">
      ${items || `<div class="card"><div class="meta">Belum ada task.</div></div>`}
    </div>
  `;

  $('#create-task').addEventListener('click', async () => {
    const title = $('#task-title').value.trim();
    const errorEl = $('#task-error');
    errorEl.textContent = '';
    let steps;
    try {
      steps = JSON.parse($('#task-steps').value);
    } catch (e) {
      errorEl.textContent = 'JSON steps tidak valid.';
      return;
    }
    try {
      await api('/tasks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, steps }),
      });
      await refresh();
      setView('tasks');
    } catch (e) {
      errorEl.textContent = String(e.message ?? e);
    }
  });

  for (const btn of $$('[data-approve]')) {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-approve');
      await api(`/approvals/${id}`, { method: 'POST' });
      await refresh();
    });
  }

  for (const btn of $$('[data-edit]')) {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-edit');
      const task = await api(`/tasks/${id}`);
      const step = task.steps?.[task.currentStep];
      if (!step) return;
      const json = JSON.stringify(step.params ?? {}, null, 2);
      const next = prompt('Edit params untuk step saat ini (JSON):', json);
      if (!next) return;
      let params;
      try {
        params = JSON.parse(next);
      } catch {
        alert('JSON tidak valid.');
        return;
      }
      await api(`/tasks/${id}/steps/${task.currentStep}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ params }),
      });
      await refresh();
    });
  }
}

function renderApprovals() {
  const el = $('#view-approvals');
  const approvals = lastState.tasks.filter((t) => t.status === 'waiting_approval');
  const rows = approvals
    .map((t) => {
      const last = t.logs?.[t.logs.length - 1];
      const tool = last?.tool ?? '(unknown)';
      return `
        <tr>
          <td>${escapeHtml(t.title)}</td>
          <td>${pill(t.status)}</td>
          <td>${escapeHtml(tool)}</td>
          <td>${t.id}</td>
          <td><button class="btn" data-approve="${t.id}">Approve</button></td>
        </tr>
      `;
    })
    .join('');

  el.innerHTML = `
    <div class="card">
      <div class="card__title">Approvals</div>
      <div class="hint">Daftar task yang menunggu approval.</div>
      <table class="table" style="margin-top:10px">
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Tool</th>
            <th>Task ID</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="5" class="meta">Tidak ada approval.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  for (const btn of $$('[data-approve]')) {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-approve');
      await api(`/approvals/${id}`, { method: 'POST' });
      await refresh();
    });
  }
}

function renderInbox() {
  const el = $('#view-inbox');
  const msgs = lastState.inbox.slice().reverse();
  const rows = msgs
    .map((m) => {
      const labels = Array.isArray(m.labels) ? m.labels.join(', ') : '';
      const replyBtn = `<button class="btn" data-reply="${m.id}">Reply Task</button>`;
      return `
        <tr>
          <td>${escapeHtml(m.channel)}</td>
          <td>${escapeHtml(m.chatId)}</td>
          <td>${escapeHtml(m.fromName ?? '')}</td>
          <td>${escapeHtml(m.subject ?? '')}</td>
          <td>${escapeHtml(m.text ?? '')}</td>
          <td class="meta">${escapeHtml(labels)}</td>
          <td class="meta">${formatTime(m.time)}</td>
          <td>${replyBtn}</td>
        </tr>
      `;
    })
    .join('');

  el.innerHTML = `
    <div class="card">
      <div class="row">
        <div>
          <div class="card__title">Inbox</div>
          <div class="hint">Menampilkan pesan yang masuk (in-memory).</div>
        </div>
        <div class="row">
          <button id="refresh-inbox" class="btn btn--ghost">Refresh Inbox</button>
        </div>
      </div>
      <table class="table" style="margin-top:10px">
        <thead>
          <tr>
            <th>Channel</th>
            <th>Chat</th>
            <th>From</th>
            <th>Subject</th>
            <th>Text</th>
            <th>Labels</th>
            <th>Time</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="8" class="meta">Belum ada pesan.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  $('#refresh-inbox').addEventListener('click', async () => {
    await refreshInbox();
    render();
  });

  for (const btn of $$('[data-reply]')) {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-reply');
      try {
        await api(`/inbox/messages/${id}/reply-task`, { method: 'POST' });
        await refresh();
        setView('tasks');
      } catch (e) {
        alert(String(e.message ?? e));
      }
    });
  }
}

function renderLogs() {
  const el = $('#view-logs');
  const logs = lastState.logs.slice().reverse();
  const rows = logs
    .map((l) => {
      const out = l.output ? truncate(JSON.stringify(l.output), 180) : '';
      const err = l.error ? truncate(String(l.error), 180) : '';
      return `
        <tr>
          <td class="meta">${formatTime(l.time)}</td>
          <td>${l.taskId}</td>
          <td>${l.stepIndex}</td>
          <td>${escapeHtml(l.tool)}</td>
          <td>${escapeHtml(l.status)}</td>
          <td class="meta">${escapeHtml(out || err)}</td>
        </tr>
      `;
    })
    .join('');

  el.innerHTML = `
    <div class="card">
      <div class="card__title">Logs</div>
      <div class="hint">Audit log terakhir (in-memory).</div>
      <table class="table" style="margin-top:10px">
        <thead>
          <tr>
            <th>Time</th>
            <th>Task</th>
            <th>Step</th>
            <th>Tool</th>
            <th>Status</th>
            <th>Output/Error</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="6" class="meta">Belum ada logs.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function renderTools() {
  const el = $('#view-tools');
  const tools = lastState.tools;
  const rows = tools
    .map((t) => {
      return `
        <tr>
          <td>${escapeHtml(t.name)}</td>
          <td class="meta">${escapeHtml(t.description)}</td>
          <td>${t.requiresApproval ? pill('waiting_approval') : ''}</td>
        </tr>
      `;
    })
    .join('');

  el.innerHTML = `
    <div class="card">
      <div class="card__title">Tools</div>
      <table class="table" style="margin-top:10px">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Approval</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="3" class="meta">Tidak ada tools.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function render() {
  if (currentView === 'tasks') return renderTasks();
  if (currentView === 'approvals') return renderApprovals();
  if (currentView === 'inbox') return renderInbox();
  if (currentView === 'logs') return renderLogs();
  if (currentView === 'tools') return renderTools();
}

async function refreshHealth() {
  try {
    const data = await api('/health');
    setStatus(`OK • v${data.version}`, 'ok');
  } catch (e) {
    setStatus('OFFLINE', 'bad');
  }
}

async function refreshTasks() {
  const data = await api('/tasks');
  lastState.tasks = data.tasks ?? [];
}

async function refreshLogs() {
  const data = await api('/logs');
  lastState.logs = data.logs ?? [];
}

async function refreshInbox() {
  const data = await api('/inbox/messages?limit=50');
  lastState.inbox = data.messages ?? [];
}

async function refreshTools() {
  const data = await api('/tools');
  lastState.tools = data.tools ?? [];
}

async function refresh() {
  await Promise.all([refreshHealth(), refreshTasks(), refreshLogs(), refreshInbox(), refreshTools()]);
}

function escapeHtml(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function truncate(s, n) {
  if (s.length <= n) return s;
  return s.slice(0, n) + '…';
}

function defaultSteps() {
  return JSON.stringify(
    [
      { tool: 'webSearch', params: { query: 'ringkas berita teknologi hari ini' } },
      { tool: 'sendTelegram', params: { chatId: '123', text: 'Halo dari MyClaw (via approval)' }, requiresApproval: true },
    ],
    null,
    2
  );
}

for (const btn of $$('.nav__btn')) {
  btn.addEventListener('click', () => setView(btn.dataset.view));
}

$('#refresh').addEventListener('click', async () => {
  await refresh();
  render();
});

await refresh();
setView('tasks');
setInterval(async () => {
  await refresh();
  render();
}, 3000);

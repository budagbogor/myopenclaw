const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const views = ['tasks', 'approvals', 'inbox', 'reminders', 'knowledge', 'present', 'guide', 'logs', 'tools'];
let currentView = 'tasks';
let lastState = { tasks: [], logs: [], inbox: [], reminders: [], tools: [], mode: 'safe', knowledgeDocs: [], kbSearch: [], present: null };
let globalSearch = '';
let lastRefreshAt = null;

const toastRoot = $('#toast-root');
const modalRoot = $('#modal-root');

function toast(title, text, kind = 'ok') {
  const stack = toastRoot.querySelector('.toast__stack') ?? (() => {
    const el = document.createElement('div');
    el.className = 'toast__stack';
    toastRoot.appendChild(el);
    return el;
  })();

  const item = document.createElement('div');
  item.className = `toast ${kind === 'bad' ? 'is-bad' : 'is-ok'}`;
  item.innerHTML = `
    <div class="toast__title">${escapeHtml(title)}</div>
    <div class="toast__text">${escapeHtml(text ?? '')}</div>
  `;
  stack.appendChild(item);
  setTimeout(() => item.remove(), 4500);
}

function closeModal() {
  modalRoot.innerHTML = '';
}

function openModal({ title, bodyHtml, primaryLabel, secondaryLabel, onPrimary }) {
  modalRoot.innerHTML = `
    <div class="modal__overlay" data-modal-overlay="1">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal__header">
          <div class="modal__title">${escapeHtml(title)}</div>
          <button class="btn btn--ghost" data-modal-close="1">Close</button>
        </div>
        <div class="modal__body">${bodyHtml}</div>
        <div class="modal__footer">
          ${secondaryLabel ? `<button class="btn btn--ghost" data-modal-secondary="1">${escapeHtml(secondaryLabel)}</button>` : ''}
          ${primaryLabel ? `<button class="btn" data-modal-primary="1">${escapeHtml(primaryLabel)}</button>` : ''}
        </div>
      </div>
    </div>
  `;

  const overlay = modalRoot.querySelector('[data-modal-overlay="1"]');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  modalRoot.querySelector('[data-modal-close="1"]').addEventListener('click', closeModal);
  const secondary = modalRoot.querySelector('[data-modal-secondary="1"]');
  if (secondary) secondary.addEventListener('click', closeModal);
  const primary = modalRoot.querySelector('[data-modal-primary="1"]');
  if (primary) primary.addEventListener('click', async () => onPrimary?.());
}

function setStatus(text, kind) {
  const el = $('#status');
  el.textContent = text;
  el.classList.remove('is-ok', 'is-bad');
  if (kind === 'ok') el.classList.add('is-ok');
  if (kind === 'bad') el.classList.add('is-bad');
}

function setView(name) {
  if (!views.includes(name)) name = 'tasks';
  currentView = name;
  for (const v of views) {
    $(`#view-${v}`).classList.toggle('is-active', v === name);
  }
  for (const btn of $$('.nav__btn')) {
    btn.classList.toggle('is-active', btn.dataset.view === name);
  }
  history.replaceState(null, '', `#${name}`);
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

function norm(s) {
  return String(s ?? '').toLowerCase().trim();
}

function hit(q, ...fields) {
  const query = norm(q);
  if (!query) return true;
  const combined = fields.map((f) => norm(f)).join(' ');
  return combined.includes(query);
}

function renderTasks() {
  const el = $('#view-tasks');
  const tasks = lastState.tasks.filter((t) => hit(globalSearch, t.title, t.id, t.status));

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
      const detailsBtn = `<button class="btn btn--ghost" data-task="${t.id}">Details</button>`;
      return `
        <div class="card">
          <div class="row">
            <div>
              <div class="card__title">${escapeHtml(t.title)}</div>
              <div class="meta">id: ${t.id} • dibuat: ${formatTime(t.createdAt)} • step: ${t.currentStep}/${t.steps.length}</div>
            </div>
            <div class="row">
              ${pill(t.status)}
              ${detailsBtn}
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
      toast('Task created', title, 'ok');
    } catch (e) {
      errorEl.textContent = String(e.message ?? e);
    }
  });

  for (const btn of $$('[data-approve]')) {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-approve');
      await api(`/approvals/${id}`, { method: 'POST' });
      await refresh();
      toast('Approved', `Task ${id}`, 'ok');
    });
  }

  for (const btn of $$('[data-edit]')) {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-edit');
      const task = await api(`/tasks/${id}`);
      const step = task.steps?.[task.currentStep];
      if (!step) return;
      const json = JSON.stringify(step.params ?? {}, null, 2);
      openModal({
        title: `Edit Draft • ${step.tool}`,
        bodyHtml: `
          <div class="form">
            <div class="hint">Hanya bisa edit step saat ini ketika status task waiting_approval.</div>
            <textarea id="modal-json" class="textarea">${escapeHtml(json)}</textarea>
            <div id="modal-error" class="hint" style="color: var(--danger)"></div>
          </div>
        `,
        primaryLabel: 'Save',
        secondaryLabel: 'Cancel',
        onPrimary: async () => {
          const errorEl = modalRoot.querySelector('#modal-error');
          errorEl.textContent = '';
          const raw = modalRoot.querySelector('#modal-json')?.value ?? '';
          let params;
          try {
            params = JSON.parse(raw);
          } catch {
            errorEl.textContent = 'JSON tidak valid.';
            return;
          }
          await api(`/tasks/${id}/steps/${task.currentStep}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ params }),
          });
          closeModal();
          toast('Draft updated', `Task ${id}`, 'ok');
          await refresh();
        },
      });
    });
  }

  for (const btn of $$('[data-task]')) {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-task');
      const task = await api(`/tasks/${id}`);
      const logs = Array.isArray(task.logs) ? task.logs : [];
      openModal({
        title: `Task Details • ${task.id}`,
        bodyHtml: `
          <div class="form">
            <div class="row">
              <div>
                <div class="meta">Title</div>
                <div style="margin-top:6px">${escapeHtml(task.title)}</div>
              </div>
              <div>${pill(task.status)}</div>
            </div>
            <div class="meta">Steps: ${task.currentStep}/${task.steps?.length ?? 0} • Created: ${escapeHtml(formatTime(task.createdAt))}</div>
            <pre class="meta" style="white-space: pre-wrap; margin:0">${escapeHtml(JSON.stringify(logs, null, 2))}</pre>
          </div>
        `,
        primaryLabel: '',
        secondaryLabel: 'Close',
      });
    });
  }
}

function renderApprovals() {
  const el = $('#view-approvals');
  const approvals = lastState.tasks.filter((t) => t.status === 'waiting_approval' && hit(globalSearch, t.title, t.id));
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
      toast('Approved', `Task ${id}`, 'ok');
    });
  }
}

function renderInbox() {
  const el = $('#view-inbox');
  const msgs = lastState.inbox
    .filter((m) =>
      hit(
        globalSearch,
        m.channel,
        m.chatId,
        m.fromName,
        m.fromId,
        m.subject,
        m.text,
        m.summary,
        Array.isArray(m.labels) ? m.labels.join(' ') : ''
      )
    )
    .slice()
    .reverse();
  const rows = msgs
    .map((m) => {
      const labels = Array.isArray(m.labels) ? m.labels.join(', ') : '';
      const actions = Array.isArray(m.actionItems) ? m.actionItems.join(' • ') : '';
      const replyBtn = `<button class="btn" data-reply="${m.id}">Reply Task</button>`;
      const threadBtn = `<button class="btn btn--ghost" data-thread-channel="${escapeHtml(m.channel)}" data-thread-chat="${escapeHtml(m.chatId)}">Thread</button>`;
      const followBtn = `<button class="btn btn--ghost" data-followup="${m.id}">Follow-up</button>`;
      return `
        <tr>
          <td>${escapeHtml(m.channel)}</td>
          <td>${escapeHtml(m.chatId)}</td>
          <td>${escapeHtml(m.fromName ?? '')}</td>
          <td>${escapeHtml(m.subject ?? '')}</td>
          <td>${escapeHtml(m.text ?? '')}</td>
          <td class="meta">${escapeHtml(labels)}</td>
          <td class="meta">${escapeHtml(m.summary ?? '')}</td>
          <td class="meta">${escapeHtml(actions)}</td>
          <td class="meta">${formatTime(m.time)}</td>
          <td class="row" style="justify-content:flex-end">${threadBtn}${followBtn}${replyBtn}</td>
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
            <th>Summary</th>
            <th>Actions</th>
            <th>Time</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="10" class="meta">Belum ada pesan.</td></tr>`}
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
        toast('Reply task created', `From message ${id}`, 'ok');
      } catch (e) {
        toast('Failed', String(e.message ?? e), 'bad');
      }
    });
  }

  for (const btn of $$('[data-thread-channel]')) {
    btn.addEventListener('click', async () => {
      const channel = btn.getAttribute('data-thread-channel') ?? '';
      const chatId = btn.getAttribute('data-thread-chat') ?? '';
      try {
        const data = await api(`/inbox/threads?channel=${encodeURIComponent(channel)}&chatId=${encodeURIComponent(chatId)}&limit=30`);
        const actionItems = Array.isArray(data.actionItems) ? data.actionItems : [];
        const messages = Array.isArray(data.messages) ? data.messages : [];
        openModal({
          title: `Thread • ${data.channel}:${data.chatId}`,
          bodyHtml: `
            <div class="form">
              <div>
                <div class="meta">Summary</div>
                <div style="margin-top:6px">${escapeHtml(data.summary ?? '')}</div>
              </div>
              <div>
                <div class="meta">Action Items</div>
                <div style="margin-top:6px">${escapeHtml(actionItems.join(' • '))}</div>
              </div>
              <div>
                <div class="meta">Messages (${messages.length})</div>
                <pre class="meta" style="margin:0; white-space:pre-wrap">${escapeHtml(
                  messages
                    .slice()
                    .reverse()
                    .map((m) => `[${formatTime(m.time)}] ${m.fromName ?? ''}: ${m.text ?? ''}`)
                    .join('\n')
                )}</pre>
              </div>
            </div>
          `,
          primaryLabel: '',
          secondaryLabel: 'Close',
        });
      } catch (e) {
        toast('Failed', String(e.message ?? e), 'bad');
      }
    });
  }

  for (const btn of $$('[data-followup]')) {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-followup');
      try {
        await api(`/inbox/messages/${id}/followup`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        });
        await refresh();
        setView('reminders');
        toast('Reminder created', `From message ${id}`, 'ok');
      } catch (e) {
        toast('Failed', String(e.message ?? e), 'bad');
      }
    });
  }
}

function renderReminders() {
  const el = $('#view-reminders');
  const reminders = lastState.reminders
    .filter((r) => hit(globalSearch, r.title, r.note, r.status, r.source?.chatId, r.source?.channel))
    .slice()
    .reverse();

  const rows = reminders
    .map((r) => {
      const doneBtn = r.status === 'open' ? `<button class="btn" data-done="${r.id}">Done</button>` : '';
      const src = r.source ? `${r.source.channel}:${r.source.chatId}` : '';
      return `
        <tr>
          <td>${escapeHtml(r.title)}</td>
          <td>${escapeHtml(r.status)}</td>
          <td class="meta">${formatTime(r.dueAt)}</td>
          <td class="meta">${escapeHtml(src)}</td>
          <td class="meta">${escapeHtml(r.note ?? '')}</td>
          <td>${doneBtn}</td>
        </tr>
      `;
    })
    .join('');

  el.innerHTML = `
    <div class="grid">
      <div class="card">
        <div class="card__title">Create Reminder</div>
        <div class="form">
          <input id="rem-title" class="input" placeholder="Judul reminder" />
          <input id="rem-due" class="input" placeholder="Due ISO (opsional)" />
          <textarea id="rem-note" class="textarea" placeholder="Catatan (opsional)"></textarea>
          <div class="row">
            <button id="create-rem" class="btn">Create</button>
            <span class="hint">Jika due kosong, default +1 jam.</span>
          </div>
          <div id="rem-error" class="hint" style="color: var(--danger)"></div>
        </div>
      </div>
      <div class="card">
        <div class="card__title">Reminders</div>
        <div class="hint">Reminder open bisa ditandai selesai.</div>
      </div>
    </div>
    <div style="height:12px"></div>
    <div class="card">
      <table class="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Due</th>
            <th>Source</th>
            <th>Note</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="6" class="meta">Belum ada reminder.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  $('#create-rem').addEventListener('click', async () => {
    const title = $('#rem-title').value.trim();
    const dueAt = $('#rem-due').value.trim();
    const note = $('#rem-note').value.trim();
    const errorEl = $('#rem-error');
    errorEl.textContent = '';
    try {
      const body = { title, note: note || undefined, dueAt: dueAt || undefined };
      await api('/reminders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      await refresh();
      setView('reminders');
      toast('Reminder created', title, 'ok');
    } catch (e) {
      errorEl.textContent = String(e.message ?? e);
    }
  });

  for (const btn of $$('[data-done]')) {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-done');
      await api(`/reminders/${id}/done`, { method: 'POST' });
      await refresh();
      toast('Marked done', `Reminder ${id}`, 'ok');
    });
  }
}

function renderLogs() {
  const el = $('#view-logs');
  const logs = lastState.logs
    .filter((l) => hit(globalSearch, l.tool, l.taskId, l.status, l.error, JSON.stringify(l.output ?? '')))
    .slice()
    .reverse();
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
  const tools = lastState.tools.filter((t) => hit(globalSearch, t.name, t.description, t.effect, String(t.allowed)));
  const rows = tools
    .map((t) => {
      const allowed = t.allowed ? 'allowed' : 'blocked';
      return `
        <tr>
          <td>${escapeHtml(t.name)}</td>
          <td class="meta">${escapeHtml(t.description)}</td>
          <td class="meta">${escapeHtml(t.effect ?? '')}</td>
          <td>${escapeHtml(allowed)}</td>
          <td>${t.requiresApproval ? 'required' : ''}</td>
        </tr>
      `;
    })
    .join('');

  el.innerHTML = `
    <div class="card">
      <div class="row">
        <div>
          <div class="card__title">Tools</div>
          <div class="hint">Mode policy aktif: <span class="pill">${escapeHtml(lastState.mode)}</span></div>
        </div>
      </div>
      <table class="table" style="margin-top:10px">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Effect</th>
            <th>Allowed</th>
            <th>Approval</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="6" class="meta">Tidak ada tools.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function renderKnowledge() {
  const el = $('#view-knowledge');
  const docs = lastState.knowledgeDocs
    .filter((d) => hit(globalSearch, d.title, d.text, Array.isArray(d.tags) ? d.tags.join(' ') : ''))
    .slice()
    .reverse();
  const rows = docs
    .map((d) => {
      return `
        <tr>
          <td>${escapeHtml(d.title)}</td>
          <td class="meta">${formatTime(d.createdAt)}</td>
          <td class="meta">${escapeHtml((d.tags ?? []).join(', '))}</td>
          <td class="meta">${escapeHtml(truncate(d.text ?? '', 180))}</td>
        </tr>
      `;
    })
    .join('');

  const searchRows = lastState.kbSearch
    .slice()
    .reverse()
    .map((d) => {
      return `
        <tr>
          <td>${escapeHtml(d.title)}</td>
          <td class="meta">${formatTime(d.createdAt)}</td>
          <td class="meta">${escapeHtml(truncate(d.text ?? '', 220))}</td>
        </tr>
      `;
    })
    .join('');

  el.innerHTML = `
    <div class="grid">
      <div class="card">
        <div class="card__title">Add Knowledge</div>
        <div class="form">
          <input id="kb-title" class="input" placeholder="Judul" />
          <input id="kb-tags" class="input" placeholder="Tags (csv, opsional)" />
          <textarea id="kb-text" class="textarea" placeholder="Isi dokumen"></textarea>
          <div class="row">
            <button id="kb-add" class="btn">Add</button>
            <span id="kb-add-error" class="hint" style="color: var(--danger)"></span>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card__title">Search</div>
        <div class="form">
          <input id="kb-q" class="input" placeholder="Query" />
          <div class="row">
            <button id="kb-search" class="btn">Search</button>
            <button id="kb-clear" class="btn btn--ghost">Clear</button>
          </div>
          <div class="hint">Search sederhana (substring) pada title/text.</div>
        </div>
      </div>
    </div>
    <div style="height:12px"></div>
    <div class="grid">
      <div class="card">
        <div class="card__title">Docs</div>
        <table class="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Created</th>
              <th>Tags</th>
              <th>Text</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="4" class="meta">Belum ada dokumen.</td></tr>`}
          </tbody>
        </table>
      </div>
      <div class="card">
        <div class="card__title">Search Results</div>
        <table class="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Created</th>
              <th>Text</th>
            </tr>
          </thead>
          <tbody>
            ${searchRows || `<tr><td colspan="3" class="meta">Belum ada hasil.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;

  $('#kb-add').addEventListener('click', async () => {
    const title = $('#kb-title').value.trim();
    const text = $('#kb-text').value.trim();
    const tagsCsv = $('#kb-tags').value.trim();
    const tags = tagsCsv ? tagsCsv.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
    const errEl = $('#kb-add-error');
    errEl.textContent = '';
    try {
      await api('/kb/docs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, text, tags }),
      });
      await refreshKnowledge();
      setView('knowledge');
    } catch (e) {
      errEl.textContent = String(e.message ?? e);
    }
  });

  $('#kb-search').addEventListener('click', async () => {
    const q = $('#kb-q').value.trim();
    const data = await api(`/kb/search?q=${encodeURIComponent(q)}&limit=20`);
    lastState.kbSearch = data.docs ?? [];
    render();
  });

  $('#kb-clear').addEventListener('click', async () => {
    lastState.kbSearch = [];
    render();
  });
}

function renderPresent() {
  const el = $('#view-present');
  const result = lastState.present;
  el.innerHTML = `
    <div class="grid">
      <div class="card">
        <div class="card__title">Generate Outline</div>
        <div class="form">
          <input id="pres-title" class="input" placeholder="Judul presentasi" value="Update MyClaw" />
          <textarea id="pres-context" class="textarea" placeholder="Context (opsional)"></textarea>
          <div class="row">
            <button id="pres-gen" class="btn">Generate</button>
            <span id="pres-err" class="hint" style="color: var(--danger)"></span>
          </div>
          <div class="hint">Endpoint: POST /presentations/outline</div>
        </div>
      </div>
      <div class="card">
        <div class="card__title">Result</div>
        <pre class="meta" style="white-space: pre-wrap; margin:0">${escapeHtml(result ? JSON.stringify(result, null, 2) : '')}</pre>
      </div>
    </div>
  `;

  $('#pres-gen').addEventListener('click', async () => {
    const title = $('#pres-title').value.trim();
    const contextText = $('#pres-context').value.trim();
    const errEl = $('#pres-err');
    errEl.textContent = '';
    try {
      lastState.present = await api('/presentations/outline', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, contextText: contextText || undefined }),
      });
      render();
    } catch (e) {
      errEl.textContent = String(e.message ?? e);
    }
  });
}

function renderGuide() {
  const el = $('#view-guide');
  el.innerHTML = `
    <div class="grid">
      <div class="card">
        <div class="card__title">Quick Start</div>
        <div class="hint">Jalankan agent dan buka dashboard.</div>
        <pre class="meta" style="white-space: pre-wrap; margin: 10px 0 0">npm run dev --prefix agent
open http://localhost:3100/</pre>
      </div>
      <div class="card">
        <div class="card__title">Dokumentasi</div>
        <div class="form">
          <div>
            <div class="meta">User guide</div>
            <div style="margin-top:6px">Lihat file USER_GUIDE.md di root repo untuk panduan lengkap.</div>
          </div>
          <div>
            <div class="meta">Admin guide</div>
            <div style="margin-top:6px">Lihat file ADMIN_GUIDE.md untuk mode policy, allowlist, retention, export/wipe.</div>
          </div>
        </div>
      </div>
    </div>

    <div style="height:12px"></div>

    <div class="grid">
      <div class="card">
        <div class="card__title">Workflow Utama</div>
        <div class="form">
          <div>
            <div class="meta">1) Buat Task</div>
            <div style="margin-top:6px">Tab Tasks → Create Task → isi langkah tools (JSON) → Create.</div>
          </div>
          <div>
            <div class="meta">2) Approval</div>
            <div style="margin-top:6px">Jika ada step write (sendTelegram/sendEmail/runCommand/gitSummary), task akan berhenti di waiting_approval. Approve di tab Approvals/Tasks.</div>
          </div>
          <div>
            <div class="meta">3) Inbox → Reply / Follow-up</div>
            <div style="margin-top:6px">Tab Inbox → Reply Task (membuat task balasan) atau Follow-up (membuat reminder).</div>
          </div>
          <div>
            <div class="meta">4) Reminders</div>
            <div style="margin-top:6px">Tab Reminders → tandai Done saat selesai.</div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card__title">Tips Pengguna</div>
        <div class="form">
          <div>
            <div class="meta">Global search</div>
            <div style="margin-top:6px">Pakai kotak Search di header untuk filter cepat (task/inbox/logs/tools).</div>
          </div>
          <div>
            <div class="meta">Draft editor</div>
            <div style="margin-top:6px">Edit Draft memakai modal JSON agar perubahan step lebih terkontrol.</div>
          </div>
          <div>
            <div class="meta">Toast feedback</div>
            <div style="margin-top:6px">Setiap aksi penting memunculkan notifikasi sukses/gagal.</div>
          </div>
        </div>
      </div>
    </div>

    <div style="height:12px"></div>

    <div class="grid">
      <div class="card">
        <div class="card__title">Workflow Knowledge</div>
        <div class="form">
          <div>
            <div class="meta">Tambah dokumen</div>
            <div style="margin-top:6px">Tab Knowledge → Add Knowledge → simpan catatan/brief.</div>
          </div>
          <div>
            <div class="meta">Cari dokumen</div>
            <div style="margin-top:6px">Tab Knowledge → Search → masukkan query.</div>
          </div>
          <div class="hint">KB saat ini in-memory, ikut retention policy.</div>
        </div>
      </div>
      <div class="card">
        <div class="card__title">Workflow Present</div>
        <div class="form">
          <div>
            <div class="meta">Generate outline</div>
            <div style="margin-top:6px">Tab Present → isi judul + konteks → Generate → hasil muncul sebagai JSON outline slide.</div>
          </div>
          <div class="hint">API juga tersedia: POST /presentations/outline</div>
        </div>
      </div>
    </div>

    <div style="height:12px"></div>

    <div class="grid">
      <div class="card">
        <div class="card__title">Konfigurasi (.env)</div>
        <div class="hint">Contoh minimal. Jangan commit token ke git.</div>
        <pre class="meta" style="white-space: pre-wrap; margin: 10px 0 0">PORT=3100

MYCLAW_MODE=safe
# MYCLAW_MODE=read_only
# MYCLAW_ALLOWED_TOOLS=webSearch,webFetch,sendTelegram

# Telegram
# TELEGRAM_BOT_TOKEN=xxxxx
# TELEGRAM_POLLING=true
# TELEGRAM_ALLOWLIST_CHAT_IDS=123,456

# Email IMAP (read-only)
# EMAIL_POLLING=true
# EMAIL_IMAP_HOST=imap.example.com
# EMAIL_IMAP_USER=user@example.com
# EMAIL_IMAP_PASS=xxxxx

# Email SMTP (sendEmail)
# EMAIL_SMTP_HOST=smtp.example.com
# EMAIL_SMTP_USER=user@example.com
# EMAIL_SMTP_PASS=xxxxx
# EMAIL_SMTP_FROM=\"MyClaw <user@example.com>\"

# Admin data ops
# MYCLAW_ADMIN_TOKEN=change-me

# Command allowlist (runCommand/gitSummary)
# MYCLAW_ALLOWED_COMMANDS=git status -sb,git diff --stat
# MYCLAW_ALLOWED_CWDS=i:\\\\projectWebApps2026\\\\TRAE IDE PROJECT\\\\MYOPENCLAW</pre>
      </div>
      <div class="card">
        <div class="card__title">Kebijakan & Keamanan</div>
        <div class="form">
          <div>
            <div class="meta">Mode read_only</div>
            <div style="margin-top:6px">Blok semua tool write walaupun di-approve. Cocok untuk mode observasi.</div>
          </div>
          <div>
            <div class="meta">Allowlist tools/commands</div>
            <div style="margin-top:6px">Batasi tool dan command yang boleh dipakai, terutama untuk runCommand/gitSummary.</div>
          </div>
          <div>
            <div class="meta">Data retention</div>
            <div style="margin-top:6px">MYCLAW_RETENTION_DAYS (default 14) + prune periodik.</div>
          </div>
          <div>
            <div class="meta">Export/Wipe data</div>
            <div style="margin-top:6px">Butuh header x-myclaw-admin-token untuk /data/export, /data/wipe, /data/prune.</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function render() {
  if (currentView === 'tasks') return renderTasks();
  if (currentView === 'approvals') return renderApprovals();
  if (currentView === 'inbox') return renderInbox();
  if (currentView === 'reminders') return renderReminders();
  if (currentView === 'knowledge') return renderKnowledge();
  if (currentView === 'present') return renderPresent();
  if (currentView === 'guide') return renderGuide();
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

async function refreshReminders() {
  const data = await api('/reminders?limit=100');
  lastState.reminders = data.reminders ?? [];
}

async function refreshKnowledge() {
  const data = await api('/kb/docs?limit=100');
  lastState.knowledgeDocs = data.docs ?? [];
}

async function refreshTools() {
  const data = await api('/tools');
  lastState.tools = data.tools ?? [];
  lastState.mode = data.mode ?? 'safe';
}

async function refresh() {
  await Promise.all([
    refreshHealth(),
    refreshTasks(),
    refreshLogs(),
    refreshInbox(),
    refreshReminders(),
    refreshKnowledge(),
    refreshTools(),
  ]);
  lastRefreshAt = new Date();
  if ($('#status')?.classList.contains('is-ok')) {
    const time = lastRefreshAt.toLocaleTimeString();
    const statusText = $('#status').textContent?.split(' • ')[0] ?? 'OK';
    setStatus(`${statusText} • refreshed ${time}`, 'ok');
  }
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

$('#global-search')?.addEventListener('input', (e) => {
  globalSearch = e.target.value ?? '';
  render();
});

$('#refresh').addEventListener('click', async () => {
  await refresh();
  render();
});

await refresh();
const initialView = (location.hash ?? '').replace('#', '');
setView(initialView || 'tasks');
setInterval(async () => {
  await refresh();
  render();
}, 3000);

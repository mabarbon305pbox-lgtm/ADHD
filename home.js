/* FocusLearn – vanilla JS. Data is saved in localStorage. */
const KEY = 'focuslearn_v1', LOGIN = 'focuslearn_login';
const TODAY = new Date(2026, 3, 25);           // demo "today" so sample dates make sense
const LABEL = { pending: 'Pending', progress: 'In Progress', completed: 'Completed' };
const $ = s => document.querySelector(s);

/* ---------- Data ---------- */
const std = ['Read the instructions', 'Do the work', 'Check your answers', 'Submit online'];
function mk(id, title, subject, due, status, steps = std, done = 0) {
  return { id, title, subject, due, status,
    steps: steps.map((t, i) => ({ t, done: status === 'completed' || i < done })) };
}
function seed() {
  return {
    assignments: [
      mk('a1', 'Math Assignment', 'Mathematics', '2026-04-25T10:00', 'pending'),
      mk('a2', 'Science Report', 'Science', '2026-04-26T14:00', 'progress',
        ['Research the topic', 'Write the summary', 'Add references', 'Submit online'], 2),
      mk('a3', 'English Reading', 'English', '2026-04-28T09:00', 'completed'),
      mk('a4', 'History Essay', 'History', '2026-04-30T12:00', 'pending'),
      mk('a5', 'Art Sketch', 'Art', '2026-05-02T15:00', 'pending'),
      mk('a6', 'Music Theory Worksheet', 'Music', '2026-05-04T09:00', 'progress', std, 1),
      mk('a7', 'Geometry Quiz', 'Mathematics', '2026-04-20T10:00', 'completed'),
      mk('a8', 'Vocabulary List', 'English', '2026-04-21T09:00', 'completed'),
      mk('a9', 'Lab Safety Form', 'Science', '2026-04-22T11:00', 'completed'),
      mk('a10', 'Chemistry Notes', 'Science', '2026-04-23T13:00', 'completed')
    ],
    notifs: [
      { id: 1, t: 'Assignment Completed', x: 'English Reading has been submitted.', when: '2h ago', read: false },
      { id: 2, t: 'Assignment Reminder', x: 'Math Assignment is due soon.', when: '5h ago', read: false },
      { id: 3, t: 'New Message', x: 'Your teacher sent you a message.', when: '1d ago', read: false }
    ],
    zen: false, big: false
  };
}
let data;
try { data = JSON.parse(localStorage.getItem(KEY)); } catch (e) { data = null; }
if (!data || !data.assignments) data = seed();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} };
const get = id => data.assignments.find(a => a.id === id);

/* ---------- UI state ---------- */
const ui = { view: 'home', id: null, filter: 'all', q: '', y: 2026, m: 3, sel: '2026-04-25', focusId: null };
const T = { mode: 'focus', total: 1500, left: 1500, running: false, end: 0, started: false, done: false };
let handle = null;

/* ---------- Helpers ---------- */
const fmtDate = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtTime = d => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function rel(a) {
  const d = new Date(a.due), day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((day - TODAY) / 864e5);
  const name = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : fmtDate(d).replace(/, \d+$/, '');
  return `${name}, ${fmtTime(d)}`;
}
const badge = s => `<span class="badge ${s}">${LABEL[s]}</span>`;
const pctOf = a => Math.round(a.steps.filter(s => s.done).length / a.steps.length * 100);
const count = s => data.assignments.filter(a => a.status === s).length;
const dueSoon = () => data.assignments.filter(a => a.status !== 'completed' && new Date(a.due) < new Date(2026, 3, 26));
const byDue = (a, b) => new Date(a.due) - new Date(b.due);
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.className = 'show';
  clearTimeout(toast.h); toast.h = setTimeout(() => t.className = '', 2600);
}
function notify(t, x) { data.notifs.unshift({ id: Date.now(), t, x, when: 'Just now', read: false }); }
function setStatus(a, s) { a.status = s; save(); }
function actionBtn(a) {
  if (a.status === 'pending') return `<button class="btn primary small" data-act="start" data-id="${a.id}">Start</button>`;
  if (a.status === 'progress') return `<button class="btn primary small" data-act="open" data-id="${a.id}">Continue</button>`;
  return `<button class="btn small" data-act="open" data-id="${a.id}">View</button>`;
}

/* ---------- Navigation ---------- */
function go(view, id) {
  ui.view = view; if (id) ui.id = id;
  document.body.classList.remove('menu-open'); $('#menuBtn').setAttribute('aria-expanded', 'false');
  render(); $('#main').focus(); window.scrollTo(0, 0);
}

/* ---------- Views ---------- */
const views = {
  home() {
    const soon = dueSoon(), next = data.assignments.filter(a => a.status !== 'completed').sort(byDue)[0];
    const top = [...data.assignments].sort(byDue).filter(a => new Date(a.due) >= TODAY).slice(0, 3);
    return `<h1>Welcome back, Lucas!</h1><p class="muted">You're doing great! Keep it up!</p>
    ${soon.length ? `<div class="banner">Reminder: ${soon[0].title} is due ${rel(soon[0]).toLowerCase()}.</div>` : ''}
    <div class="grid4">
      <div class="stat s-pending"><b>${count('pending')}</b>Pending</div>
      <div class="stat s-progress"><b>${count('progress')}</b>In Progress</div>
      <div class="stat s-completed"><b>${count('completed')}</b>Completed</div>
      <div class="stat s-due"><b>${soon.length}</b>Due Soon</div>
    </div>
    <h2>Today's Tasks</h2>
    ${top.map(a => `<div class="card item"><div><h3>${a.title}</h3><span class="small">Due: ${rel(a)} · ${LABEL[a.status]}</span></div>${actionBtn(a)}</div>`).join('')}
    ${next ? `<button class="btn good" data-act="start" data-id="${next.id}">Start Focus Session</button>` : '<p>All done. Enjoy your free time!</p>'}`;
  },

  assignments() {
    const chips = [['all', 'All'], ['pending', 'Pending'], ['progress', 'In Progress'], ['completed', 'Completed']];
    return `<h1>My Assignments</h1>
    <input id="q" type="search" placeholder="Search assignments..." aria-label="Search assignments" value="${ui.q}">
    <div class="row" style="margin:.8rem 0">${chips.map(([k, l]) =>
      `<button class="btn small ${ui.filter === k ? 'primary' : 'ghost'}" data-act="filter" data-f="${k}" aria-pressed="${ui.filter === k}">${l}</button>`).join('')}</div>
    <div id="list"></div>`;
  },

  focus() {
    const a = get(ui.focusId) || data.assignments.find(x => x.status !== 'completed');
    if (a) ui.focusId = a.id;
    const open = data.assignments.filter(x => x.status !== 'completed');
    const brk = T.mode === 'break';
    let btns;
    if (T.done) btns = brk
      ? `<button class="btn primary" data-act="tfocus">Back to focus</button>`
      : `<button class="btn primary" data-act="tbreak">Take a 5-minute break</button><button class="btn" data-act="treset">Focus again</button>`;
    else btns = (T.running ? `<button class="btn primary" data-act="tpause">Pause</button>`
      : T.started ? `<button class="btn primary" data-act="tstart">Resume</button>`
      : `<button class="btn good" data-act="tstart">Start</button>`) +
      `<button class="btn" data-act="treset">Reset</button>`;
    return `<div class="focus"><h1>${brk ? 'Break Time' : 'Focus Mode'}</h1>
    ${brk ? '' : `<p><strong>${a ? a.title : 'No open assignment'}</strong></p>
    ${open.length > 1 && !T.started ? `<label class="small" for="fsel">Change assignment</label><select id="fsel">${open.map(o => `<option value="${o.id}" ${a && o.id === a.id ? 'selected' : ''}>${o.title}</option>`).join('')}</select>` : ''}`}
    <div class="ring"><svg width="220" height="220" viewBox="0 0 220 220"><circle cx="110" cy="110" r="95" fill="none" stroke="#DBEAFE" stroke-width="14"/>
      <circle id="arc" cx="110" cy="110" r="95" fill="none" stroke="#22C55E" stroke-width="14" stroke-linecap="round" stroke-dasharray="596.9" stroke-dashoffset="0"/></svg>
      <div class="in"><div class="num" id="time"></div><span class="muted">Time Left</span></div></div>
    <p id="tmsg" role="status"><strong>${T.done ? (brk ? 'Break over. Ready for another round?' : 'Great job, Lucas! You completed your focus session!') : ''}</strong></p>
    <div class="row">${btns}<button class="btn ghost" data-act="tend">End Session</button></div></div>`;
  },

  calendar() {
    const first = new Date(ui.y, ui.m, 1), days = new Date(ui.y, ui.m + 1, 0).getDate();
    const has = new Set(data.assignments.map(a => a.due.slice(0, 10)));
    let cells = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="dow">${d}</div>`).join('');
    for (let i = 0; i < first.getDay(); i++) cells += '<div></div>';
    for (let d = 1; d <= days; d++) {
      const iso = isoDay(new Date(ui.y, ui.m, d));
      cells += `<button data-act="day" data-d="${iso}" class="${has.has(iso) ? 'has' : ''} ${iso === '2026-04-25' ? 'today' : ''} ${iso === ui.sel ? 'sel' : ''}" aria-label="${iso}${has.has(iso) ? ', has assignments' : ''}">${d}</button>`;
    }
    const day = data.assignments.filter(a => a.due.startsWith(ui.sel)).sort(byDue);
    const up = data.assignments.filter(a => new Date(a.due) >= TODAY).sort(byDue).slice(0, 5);
    return `<h1>My Schedule</h1><div class="two"><div class="card">
      <div class="cal-head"><button class="btn small ghost" data-act="prev" aria-label="Previous month">‹ Prev</button>
      <strong>${first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
      <button class="btn small ghost" data-act="next" aria-label="Next month">Next ›</button></div>
      <div class="cal">${cells}</div>
      <h2>${fmtDate(new Date(ui.sel + 'T00:00'))}</h2>
      ${day.length ? day.map(a => `<div class="item" style="padding:.4rem 0"><span>${a.title} · ${fmtTime(new Date(a.due))} ${badge(a.status)}</span>${'' }<button class="btn small" data-act="open" data-id="${a.id}">View</button></div>`).join('') : '<p class="muted">Nothing due this day.</p>'}
    </div><div class="card"><h2 style="margin-top:0">Upcoming</h2>
      ${up.map(a => `<p><strong>${a.title}</strong><br><span class="small">${fmtDate(new Date(a.due))} · ${fmtTime(new Date(a.due))}</span></p>`).join('')}</div></div>`;
  },

  details() {
    const a = get(ui.id); if (!a) return '<p>Assignment not found.</p>';
    const all = a.steps.every(s => s.done), p = pctOf(a);
    return `<button class="btn small ghost" data-act="nav" data-v="assignments">‹ Back</button>
    <h1 style="margin-top:1rem">${a.title} ${badge(a.status)}</h1>
    <p class="muted">Subject: ${a.subject}<br>Due Date: ${fmtDate(new Date(a.due))}, ${fmtTime(new Date(a.due))}</p>
    <div class="card"><h2 style="margin-top:0">Steps</h2>
    ${a.steps.map((s, i) => `<label class="check ${s.done ? 'done' : ''}"><input type="checkbox" data-step="${i}" ${s.done ? 'checked' : ''}><span>${s.t}</span></label>`).join('')}
    <p><strong>${p}% done</strong></p><div class="bar" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p}%"></i></div></div>
    <div class="row" style="margin-top:1rem">
      <button class="btn primary" data-act="cont" data-id="${a.id}" ${a.status === 'completed' ? 'disabled' : ''}>Continue Task</button>
      <button class="btn" data-act="start" data-id="${a.id}" ${a.status === 'completed' ? 'disabled' : ''}>Start Focus Mode</button>
      <button class="btn good" data-act="complete" data-id="${a.id}" ${!all || a.status === 'completed' ? 'disabled' : ''}>${a.status === 'completed' ? 'Completed' : 'Mark as Completed'}</button>
    </div>${!all && a.status !== 'completed' ? '<p class="small">Finish every step to mark this as completed.</p>' : ''}`;
  },

  progress() {
    const total = data.assignments.length, c = count('completed'), pct = total ? Math.round(c / total * 100) : 0;
    return `<h1>My Progress</h1><div class="card"><div class="ring"><svg width="220" height="220" viewBox="0 0 220 220">
      <circle cx="110" cy="110" r="95" fill="none" stroke="#DBEAFE" stroke-width="16"/>
      <circle cx="110" cy="110" r="95" fill="none" stroke="#22C55E" stroke-width="16" stroke-linecap="round" stroke-dasharray="596.9" stroke-dashoffset="${596.9 * (1 - pct / 100)}"/></svg>
      <div class="in"><div class="num">${pct}%</div><span class="muted">Overall Completion</span></div></div>
      <p style="text-align:center"><strong>Completed Assignments: ${c}</strong><br>In Progress: ${count('progress')} · Pending: ${count('pending')}</p>
      <div class="banner" style="text-align:center"><strong>Great job, Lucas! You're making progress!</strong></div></div>
    <h2>Completed</h2>${data.assignments.filter(a => a.status === 'completed').map(a =>
      `<div class="card item"><div><h3>${a.title}</h3><span class="small">${a.subject}</span></div><button class="btn small" data-act="open" data-id="${a.id}">View</button></div>`).join('') || '<p class="muted">Nothing completed yet. Pick one task to start.</p>'}`;
  },

  notifications() {
    const n = data.notifs;
    return `<h1>Notifications</h1><div class="row" style="margin-bottom:1rem">
      <button class="btn small" data-act="readall" ${n.some(x => !x.read) ? '' : 'disabled'}>Mark all as read</button>
      <button class="btn small ghost" data-act="clear" ${n.length ? '' : 'disabled'}>Clear Notifications</button></div>
    ${n.map(x => `<div class="card note item ${x.read ? '' : 'unread'}"><div><h3>${x.t}</h3><div>${x.x}</div><span class="small">${x.when}</span></div>
      ${x.read ? '' : `<button class="btn small" data-act="read" data-id="${x.id}">Mark as Read</button>`}</div>`).join('') || '<p class="muted">You\'re all caught up. No notifications.</p>'}`;
  },

  settings() {
    return `<h1>Settings</h1><div class="card">
      <label class="check"><input type="checkbox" id="setZen" ${data.zen ? 'checked' : ''}><span>Focus mode: hide the menu while I work</span></label>
      <label class="check"><input type="checkbox" id="setBig" ${data.big ? 'checked' : ''}><span>Larger text</span></label></div>
    <div class="row" style="margin-top:1rem"><button class="btn" data-act="nav" data-v="notifications">View notifications</button>
      <button class="btn ghost" data-act="reset">Reset demo data</button><button class="btn ghost" data-act="logout">Sign out</button></div>`;
  }
};

/* ---------- Render ---------- */
function render() {
  $('#main').innerHTML = views[ui.view]();
  const active = ['details'].includes(ui.view) ? 'assignments' : ui.view;
  document.querySelectorAll('#nav button').forEach(b => {
    if (b.dataset.v === active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  const unread = data.notifs.filter(n => !n.read).length;
  $('#bell').textContent = unread ? `Notifications (${unread})` : 'Notifications';
  document.body.classList.toggle('zen', data.zen);
  document.documentElement.classList.toggle('big', data.big);
  $('#zenExit').hidden = !data.zen;
  if (ui.view === 'assignments') drawList();
  if (ui.view === 'focus') drawTimer();
}
function drawList() {
  const q = ui.q.toLowerCase();
  const list = data.assignments.filter(a => (ui.filter === 'all' || a.status === ui.filter) &&
    (a.title + ' ' + a.subject).toLowerCase().includes(q)).sort(byDue);
  $('#list').innerHTML = list.map(a => `<div class="card item"><div><h3>${a.title}</h3>
    <span class="small">${a.subject} · Due ${fmtDate(new Date(a.due))}</span><br>${badge(a.status)}</div>
    <button class="btn small" data-act="open" data-id="${a.id}">View Details</button></div>`).join('')
    || '<p class="muted">No assignments found. Try a different search or filter.</p>';
}

/* ---------- Timer ---------- */
function drawTimer() {
  const t = $('#time'); if (!t) return;
  const m = Math.floor(T.left / 60), s = T.left % 60;
  t.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  $('#arc').setAttribute('stroke-dashoffset', 596.9 * (1 - T.left / T.total));
}
function tick() {
  T.left = Math.max(0, Math.ceil((T.end - Date.now()) / 1000));
  if (T.left === 0) {
    clearInterval(handle); T.running = false; T.done = true;
    if (ui.view === 'focus') render();
  } else drawTimer();
}
function tStart() {
  if (T.running) return;
  T.end = Date.now() + T.left * 1000; T.running = true; T.started = true;
  const a = get(ui.focusId);
  if (T.mode === 'focus' && a && a.status === 'pending') setStatus(a, 'progress');
  handle = setInterval(tick, 250); render();
}
function tPause() { clearInterval(handle); T.left = Math.max(1, Math.ceil((T.end - Date.now()) / 1000)); T.running = false; render(); }
function tReset(mode = 'focus') {
  clearInterval(handle);
  Object.assign(T, { mode, total: mode === 'focus' ? 1500 : 300, left: mode === 'focus' ? 1500 : 300, running: false, started: false, done: false });
}

/* ---------- Events ---------- */
const actions = {
  nav: b => go(b.dataset.v),
  open: b => go('details', b.dataset.id),
  start: b => { const a = get(b.dataset.id); if (a.status === 'pending') setStatus(a, 'progress'); ui.focusId = a.id; if (T.started) tReset(); go('focus'); },
  cont: b => {
    const a = get(b.dataset.id); if (a.status === 'pending') setStatus(a, 'progress');
    const next = a.steps.find(s => !s.done); render();
    toast(next ? `Next step: ${next.t}` : 'All steps are done. Mark it as completed!');
  },
  complete: b => {
    const a = get(b.dataset.id); a.steps.forEach(s => s.done = true); setStatus(a, 'completed');
    notify('Assignment Completed', `${a.title} has been submitted.`); save(); render(); toast('Nice work! Marked as completed.');
  },
  filter: b => { ui.filter = b.dataset.f; render(); },
  day: b => { ui.sel = b.dataset.d; render(); },
  prev: () => { ui.m--; if (ui.m < 0) { ui.m = 11; ui.y--; } render(); },
  next: () => { ui.m++; if (ui.m > 11) { ui.m = 0; ui.y++; } render(); },
  tstart: tStart, tpause: tPause,
  treset: () => { tReset(T.mode); render(); },
  tbreak: () => { tReset('break'); tStart(); },
  tfocus: () => { tReset(); render(); },
  tend: () => { tReset(); toast('Session ended.'); go('home'); },
  read: b => { data.notifs.find(n => n.id == b.dataset.id).read = true; save(); render(); },
  readall: () => { data.notifs.forEach(n => n.read = true); save(); render(); toast('All marked as read.'); },
  clear: () => { data.notifs = []; save(); render(); },
  zen: () => { data.zen = !data.zen; save(); render(); },
  reset: () => { data = seed(); save(); toast('Demo data restored.'); go('home'); },
  logout: () => { localStorage.removeItem(LOGIN); tReset(); $('#app').hidden = true; $('#login').hidden = false; $('#pw').value = ''; }
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (b && actions[b.dataset.act]) actions[b.dataset.act](b);
});
document.addEventListener('input', e => { if (e.target.id === 'q') { ui.q = e.target.value; drawList(); } });
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.step !== undefined) {                       // checklist item
    const a = get(ui.id), i = +el.dataset.step; a.steps[i].done = el.checked;
    const done = a.steps.filter(s => s.done).length;
    if (a.status === 'completed' && done < a.steps.length) a.status = 'progress';
    else if (a.status === 'pending' && done > 0) a.status = 'progress';
    save(); render(); document.querySelector(`[data-step="${i}"]`).focus();
  } else if (el.id === 'fsel') { ui.focusId = el.value; render(); }
  else if (el.id === 'setZen') { data.zen = el.checked; save(); render(); }
  else if (el.id === 'setBig') { data.big = el.checked; save(); render(); }
});
$('#menuBtn').addEventListener('click', () => {
  const open = document.body.classList.toggle('menu-open'); $('#menuBtn').setAttribute('aria-expanded', open);
});

/* ---------- Login ---------- */
function showApp() { $('#login').hidden = true; $('#app').hidden = false; go('home'); }
$('#loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const ok = $('#email').value.trim().toLowerCase() === 'lucas@student.com' && $('#pw').value === 'lucas123';
  if (ok) { localStorage.setItem(LOGIN, '1'); $('#loginMsg').textContent = ''; showApp(); }
  else { $('#loginMsg').className = 'msg'; $('#loginMsg').textContent = 'Email or password is wrong. Try lucas@student.com and lucas123.'; }
});
$('#showPw').addEventListener('click', () => {
  const p = $('#pw'), show = p.type === 'password'; p.type = show ? 'text' : 'password'; $('#showPw').textContent = show ? 'Hide' : 'Show';
});
const demoNote = e => { e.preventDefault(); $('#loginMsg').className = 'msg ok'; $('#loginMsg').textContent = 'This is a demo. Sign in with lucas@student.com and lucas123.'; };
$('#forgot').addEventListener('click', demoNote); $('#create').addEventListener('click', demoNote);

/* ---------- Start ---------- */
if (localStorage.getItem(LOGIN)) showApp();
/* =============================================================================
   Supreme Dark RP - forums app. Runs on any free static host (GitHub Pages).
   Data: Supabase (free tier) when config.js has keys, otherwise a local demo.
   ============================================================================= */
(() => {
'use strict';
const C = window.SUPREME_CONFIG || {};
const app = document.getElementById('app');
const CATS = C.categories || [];
const CAT = Object.fromEntries(CATS.map(c => [c.id, c]));
const QUESTIONS = C.applicationQuestions || [];
const STAFF_ROLES = ['moderator', 'admin', 'owner'];
const isStaff = p => !!p && STAFF_ROLES.includes(p.role);
const isAdmin = p => !!p && (p.role === 'admin' || p.role === 'owner');
const canPost = p => !!p && p.role !== 'banned';
const S = { me: null };
const me = () => S.me && S.me.profile;

/* ---------------------------------------------------------------- helpers */
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);
const qs = (s, r = document) => r.querySelector(s);

function ago(d) {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return 'just now';
  const units = [[60, 'minute'], [3600, 'hour'], [86400, 'day'], [604800, 'week'], [2629800, 'month'], [31557600, 'year']];
  let u = units[0];
  for (const x of units) if (s >= x[0]) u = x;
  const n = Math.floor(s / u[0]);
  return `${n} ${u[1]}${n > 1 ? 's' : ''} ago`;
}
const fullDate = d => new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const when = d => `<time title="${esc(fullDate(d))}">${ago(d)}</time>`;
function until(d) {
  let s = (new Date(d) - Date.now()) / 1000;
  if (s <= 0) return s > -3 * 3600 ? 'happening now' : 'ended';
  const dd = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
  return 'in ' + (dd ? `${dd}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`);
}
function dateBlock(d) {
  const x = new Date(d);
  return `<div class="date"><i>${x.toLocaleString(undefined, { month: 'short' }).toUpperCase()}</i><b>${x.getDate()}</b></div>`;
}

// small, safe markdown: everything is escaped first, then a few patterns are turned into tags
function md(src) {
  const keep = [];
  const hold = h => `\u0000${keep.push(h) - 1}\u0000`;
  let s = esc(String(src ?? '').replace(/\r/g, ''));
  s = s.replace(/`([^`\n]+)`/g, (_, c) => hold(`<code>${c}</code>`));
  s = s.replace(/!\[([^\]\n]*)\]\((https:\/\/[^\s)]+)\)/g, (_, a, u) => hold(`<img src="${u}" alt="${a}" loading="lazy">`));
  s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, t, u) => hold(`<a href="${u}" target="_blank" rel="noopener nofollow ugc">${t}</a>`));
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, (_, p, u) => p + hold(`<a href="${u}" target="_blank" rel="noopener nofollow ugc">${u}</a>`));
  s = s.replace(/^### (.+)$/gm, '<h4>$1</h4>').replace(/^## (.+)$/gm, '<h3>$1</h3>');
  s = s.replace(/^&gt; ?(.*)$/gm, '<blockquote>$1</blockquote>').replace(/<\/blockquote>\n<blockquote>/g, '<br>');
  s = s.replace(/^[-*] (.+)$/gm, '<li>$1</li>').replace(/(?:<li>.*<\/li>\n?)+/g, m => `<ul>${m.replace(/\n/g, '')}</ul>`);
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>').replace(/(^|[^\w])_([^_\n]+)_(?!\w)/g, '$1<i>$2</i>');
  s = s.replace(/(<\/h3>|<\/h4>|<\/ul>|<\/blockquote>)\n/g, '$1').replace(/\n/g, '<br>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => keep[i]);
}
const plain = (src, n) => {
  const t = String(src ?? '').replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/^\s*[-*] /gm, '· ').replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};

const ROLE_BADGE = { owner: ['Owner', '#e62832'], admin: ['Admin', '#f0781e'], moderator: ['Moderator', '#3cc85a'], banned: ['Banned', '#77707f'] };
const DONOR = Object.fromEntries((C.ranks || []).map(r => [r.id, r]));
function badges(p) {
  if (!p) return '';
  let h = '';
  const r = ROLE_BADGE[p.role];
  if (r) h += `<span class="badge" style="--b:${r[1]}">${r[0]}</span>`;
  const d = DONOR[p.donor_rank];
  if (d) h += `<span class="badge${d.rainbow ? ' rainbow' : ''}" style="--b:${esc(d.color)}">${esc(d.name)}</span>`;
  return h;
}
function avatar(p, size = 36) {
  const st = `width:${size}px;height:${size}px`;
  if (p && /^https:\/\//.test(p.avatar_url || '')) return `<img class="av" style="${st}" src="${esc(p.avatar_url)}" alt="" loading="lazy" referrerpolicy="no-referrer">`;
  const name = (p && p.username) || '?';
  let hsh = 0;
  for (const ch of name) hsh = (hsh * 31 + ch.charCodeAt(0)) | 0;
  return `<span class="av" style="${st};font-size:${Math.round(size * .42)}px;--h:${Math.abs(hsh) % 360}">${esc(name.slice(0, 1).toUpperCase())}</span>`;
}
const userLink = p => p ? `<a class="user" href="#/u/${esc(p.id)}">${esc(p.username)}</a>` : '<span class="user dim">[deleted]</span>';
const emptyBox = (t) => `<div class="empty">${t}</div>`;
const errBox = (t) => `<div class="err">${esc(t)}</div>`;

function toast(msg, bad) {
  const d = document.createElement('div');
  d.textContent = msg;
  if (bad) d.className = 'bad';
  qs('#toast').append(d);
  setTimeout(() => d.remove(), bad ? 5000 : 3000);
}
function modal(html) {
  closeModal();
  const m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal';
  m.innerHTML = `<div class="modal-card"><button class="modal-x" data-act="close-modal" aria-label="Close">×</button>${html}</div>`;
  m.addEventListener('mousedown', e => { if (e.target === m) closeModal(); });
  document.body.append(m);
  const f = m.querySelector('input'); if (f) f.focus();
}
function closeModal() { const m = qs('#modal'); if (m) m.remove(); }

/* ------------------------------------------------------------- Supabase */
function supaAPI() {
  const sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, { auth: { flowType: 'pkce' } });
  const A = 'author:profiles(id,username,role,donor_rank,avatar_url,created_at)';
  const LIST = 'id,category,title,body,reply_count,last_reply_at,created_at,pinned,locked,event_at,' + A;
  const ok = ({ data, error }) => {
    if (error && error.code === 'PGRST116') throw new Error('You can\'t do that (or it was already deleted).');
    if (error) throw new Error(error.message);
    return data;
  };
  const back = () => location.origin + location.pathname;
  return {
    demo: false,
    async session() {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return null;
      let profile = ok(await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle());
      return { user: session.user, profile };
    },
    onAuth(cb) { sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') setTimeout(cb, 0); }); },
    async signInDiscord() { ok(await sb.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: back() } })); },
    async signInEmail(email) { ok(await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: back() } })); },
    async signOut() { await sb.auth.signOut(); },
    async getProfile(id) { return ok(await sb.from('profiles').select('*').eq('id', id).maybeSingle()); },
    async updateProfile(id, patch) { ok(await sb.from('profiles').update(patch).eq('id', id).select('id').single()); },
    async members() { return ok(await sb.from('profiles').select('*').order('created_at')); },
    async threadsIndex() { return ok(await sb.from('threads').select('id,category,title,reply_count,last_reply_at,created_at,' + A).order('last_reply_at', { ascending: false }).limit(1000)); },
    async listThreads(cat, limit = 100, newest = false) {
      let q = sb.from('threads').select(LIST).eq('category', cat);
      q = newest ? q.order('created_at', { ascending: false }) : q.order('pinned', { ascending: false }).order('last_reply_at', { ascending: false });
      return ok(await q.limit(limit));
    },
    async events() { return ok(await sb.from('threads').select(LIST).eq('category', 'events').order('event_at', { ascending: true }).limit(200)); },
    async getThread(id) {
      const t = ok(await sb.from('threads').select('*,' + A).eq('id', id).maybeSingle());
      if (t) t.posts = ok(await sb.from('posts').select('*,' + A).eq('thread_id', id).order('created_at'));
      return t;
    },
    async createThread(o) { return ok(await sb.from('threads').insert(o).select('id').single()).id; },
    async updateThread(id, patch) { ok(await sb.from('threads').update(patch).eq('id', id).select('id').single()); },
    async deleteThread(id) { ok(await sb.from('threads').delete().eq('id', id)); },
    async reply(thread_id, body) { ok(await sb.from('posts').insert({ thread_id, body })); },
    async editPost(id, body) { ok(await sb.from('posts').update({ body }).eq('id', id).select('id').single()); },
    async deletePost(id) { ok(await sb.from('posts').delete().eq('id', id)); },
    async myApps(uid) { return ok(await sb.from('applications').select('*').eq('author', uid).order('created_at', { ascending: false })); },
    async allApps() { return ok(await sb.from('applications').select('*,author:profiles!applications_author_fkey(id,username,role,donor_rank,avatar_url,steam_id)').order('created_at', { ascending: false })); },
    async submitApp(answers) { ok(await sb.from('applications').insert({ answers })); },
    async reviewApp(id, status, staff_note) { ok(await sb.from('applications').update({ status, staff_note }).eq('id', id).select('id').single()); },
  };
}

/* ------------------------------------------------- demo (this browser only) */
function demoAPI() {
  const KEY = 'supreme_forum_demo_v1';
  let db = null;
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* storage blocked */ }
  if (!db || !db.users) db = seed();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* ignore */ } };
  const now = () => new Date().toISOString();
  const P = id => db.users.find(u => u.id === id) || null;
  const withA = o => o && ({ ...o, author: P(o.author) });
  const cur = () => P(db.me);
  const need = () => { const p = cur(); if (!p) throw new Error('Sign in first.'); if (p.role === 'banned') throw new Error('You are banned from posting.'); return p; };
  const T = id => db.threads.find(t => t.id === +id);
  const byLast = (a, b) => (b.pinned - a.pinned) || (new Date(b.last_reply_at) - new Date(a.last_reply_at));
  const clone = x => JSON.parse(JSON.stringify(x));

  function seed() {
    const h = n => new Date(Date.now() - n * 3600e3).toISOString();
    const staff = { id: 'u-staff', username: 'Supreme Staff', role: 'owner', donor_rank: '', steam_id: '', avatar_url: '', created_at: h(900) };
    const p1 = { id: 'u-p1', username: 'Kermit_RP', role: 'member', donor_rank: 'supremevip', steam_id: '', avatar_url: '', created_at: h(400) };
    const p2 = { id: 'u-p2', username: 'MethLord', role: 'moderator', donor_rank: 'vip', steam_id: '', avatar_url: '', created_at: h(300) };
    const ev = new Date(Date.now() + 3 * 86400e3); ev.setHours(20, 0, 0, 0);
    const ev2 = new Date(Date.now() + 9 * 86400e3); ev2.setHours(19, 0, 0, 0);
    return {
      me: null, seq: 100, users: [staff, p1, p2],
      threads: [
        { id: 1, category: 'updates', title: 'Welcome to the Supreme forums!', author: 'u-staff', pinned: true, locked: false, event_at: null, reply_count: 1, created_at: h(48), last_reply_at: h(20),
          body: 'The official **Supreme Dark RP** forums are live.\n\n## What\'s here\n- **Updates** for every patch\n- **Server Events** with dates and countdowns\n- **Staff Applications** (Staff Apps at the top)\n- **Donate** to get VIP and support the server\n\nRead the rules in game with `!motd`. See you in the city.' },
        { id: 2, category: 'updates', title: 'Update: knife cases now use CS2 market prices', author: 'u-staff', pinned: false, locked: false, event_at: null, reply_count: 0, created_at: h(6), last_reply_at: h(6),
          body: 'Every knife is now priced from the real **CS2 Steam Market**, so a Gamma Doppler is worth way more than a Rust Coat.\n\n- Basic Case: cheap finishes only\n- Supreme Case: Karambits, Butterflies and the Golden Knives\n- New opening animation with a proper reveal\n\nOpen one with F4 > Cases.' },
        { id: 3, category: 'events', title: 'Purge Night', author: 'u-staff', pinned: false, locked: false, event_at: ev.toISOString(), reply_count: 1, created_at: h(10), last_reply_at: h(3),
          body: 'For one hour **all crime is legal**. Police are off duty, raiding is open, and the last gang standing splits **$500,000**.\n\nReply if you\'re coming!' },
        { id: 4, category: 'events', title: 'Casino Tournament', author: 'u-staff', pinned: false, locked: false, event_at: ev2.toISOString(), reply_count: 0, created_at: h(5), last_reply_at: h(5),
          body: 'Blackjack bracket at the Supreme Casino. Buy-in **$25,000**, winner takes the pot plus a Supreme Case.' },
        { id: 5, category: 'general', title: 'Best gang base spots on downtown?', author: 'u-p1', pinned: false, locked: false, event_at: null, reply_count: 1, created_at: h(30), last_reply_at: h(2),
          body: 'Looking for somewhere with one entrance that the cops can\'t just walk into. Ideas?' },
        { id: 6, category: 'suggestions', title: 'Add a pawn shop job', author: 'u-p2', pinned: false, locked: false, event_at: null, reply_count: 0, created_at: h(14), last_reply_at: h(14),
          body: 'A job that can buy stolen goods off thieves and sell them back. Would make Pro Thief way more fun.' },
      ],
      posts: [
        { id: 1, thread_id: 1, author: 'u-p1', body: 'Finally! Looks clean.', created_at: h(20), edited_at: null },
        { id: 2, thread_id: 3, author: 'u-p2', body: 'My gang is in. Bring armor.', created_at: h(3), edited_at: null },
        { id: 3, thread_id: 5, author: 'u-p2', body: 'The apartments by the bank. Fading door on the stairs and you\'re set.', created_at: h(2), edited_at: null },
      ],
      apps: [],
    };
  }
  const commit = r => { save(); return r; };
  return {
    demo: true,
    async session() { const p = cur(); return p ? { user: { id: p.id }, profile: clone(p) } : null; },
    onAuth() {},
    async signInDemo(name, role) {
      name = String(name || '').trim().slice(0, 32);
      if (name.length < 2) throw new Error('Pick a name with at least 2 characters.');
      let u = db.users.find(x => x.username.toLowerCase() === name.toLowerCase());
      if (!u) { u = { id: 'u-' + (++db.seq), username: name, role, donor_rank: '', steam_id: '', avatar_url: '', created_at: now() }; db.users.push(u); }
      else u.role = role;
      db.me = u.id;
      commit();
    },
    async signOut() { db.me = null; commit(); },
    async getProfile(id) { return clone(P(id)); },
    async updateProfile(id, patch) {
      const u = P(id), m = need();
      if (id !== m.id && !isAdmin(m)) throw new Error('Not allowed.');
      if (('role' in patch || 'donor_rank' in patch) && !isAdmin(m)) throw new Error('Only admins can change ranks.');
      if (patch.username && db.users.some(x => x.id !== id && x.username.toLowerCase() === patch.username.toLowerCase())) throw new Error('That name is taken.');
      Object.assign(u, patch); commit();
    },
    async members() { return clone(db.users); },
    async threadsIndex() { return clone([...db.threads].sort((a, b) => new Date(b.last_reply_at) - new Date(a.last_reply_at)).map(withA)); },
    async listThreads(cat, limit = 100, newest = false) {
      const l = db.threads.filter(t => t.category === cat).sort(newest ? (a, b) => new Date(b.created_at) - new Date(a.created_at) : byLast);
      return clone(l.slice(0, limit).map(withA));
    },
    async events() { return clone(db.threads.filter(t => t.category === 'events').sort((a, b) => new Date(a.event_at) - new Date(b.event_at)).map(withA)); },
    async getThread(id) {
      const t = T(id);
      if (!t) return null;
      return clone({ ...withA(t), posts: db.posts.filter(p => p.thread_id === t.id).map(withA) });
    },
    async createThread(o) {
      const m = need();
      if (CAT[o.category]?.staffOnly && !isStaff(m)) throw new Error('Only staff can post there.');
      const t = { id: ++db.seq, category: o.category, title: o.title, body: o.body, author: m.id, pinned: false, locked: false,
        event_at: o.category === 'events' ? o.event_at : null, reply_count: 0, created_at: now(), last_reply_at: now() };
      db.threads.push(t); commit(); return t.id;
    },
    async updateThread(id, patch) {
      const t = T(id), m = need();
      if (!isStaff(m) && (t.author !== m.id || t.locked || 'pinned' in patch || 'locked' in patch)) throw new Error('Not allowed.');
      if ('title' in patch || 'body' in patch) t.edited_at = now();
      Object.assign(t, patch); commit();
    },
    async deleteThread(id) {
      const t = T(id), m = need();
      if (!isStaff(m) && !(t.author === m.id && !t.reply_count)) throw new Error('Not allowed.');
      db.threads = db.threads.filter(x => x !== t); db.posts = db.posts.filter(p => p.thread_id !== t.id); commit();
    },
    async reply(thread_id, body) {
      const m = need(), t = T(thread_id);
      if (t.locked && !isStaff(m)) throw new Error('This thread is locked.');
      db.posts.push({ id: ++db.seq, thread_id: t.id, author: m.id, body, created_at: now(), edited_at: null });
      t.reply_count++; t.last_reply_at = now(); commit();
    },
    async editPost(id, body) {
      const p = db.posts.find(x => x.id === +id), m = need();
      if (p.author !== m.id) throw new Error('Not allowed.');
      p.body = body; p.edited_at = now(); commit();
    },
    async deletePost(id) {
      const p = db.posts.find(x => x.id === +id), m = need();
      if (p.author !== m.id && !isStaff(m)) throw new Error('Not allowed.');
      db.posts = db.posts.filter(x => x !== p);
      const t = T(p.thread_id); if (t) t.reply_count = Math.max(0, t.reply_count - 1);
      commit();
    },
    async myApps(uid) { return clone(db.apps.filter(a => a.author === uid).reverse()); },
    async allApps() { if (!isStaff(cur())) throw new Error('Staff only.'); return clone([...db.apps].reverse().map(withA)); },
    async submitApp(answers) {
      const m = need();
      if (db.apps.some(a => a.author === m.id && a.status === 'pending')) throw new Error('You already have an application waiting for review.');
      db.apps.push({ id: ++db.seq, author: m.id, answers, status: 'pending', staff_note: null, created_at: now() }); commit();
    },
    async reviewApp(id, status, staff_note) {
      const a = db.apps.find(x => x.id === +id), m = need();
      if (!isStaff(m)) throw new Error('Staff only.');
      Object.assign(a, { status, staff_note, reviewed_by: m.id, reviewed_at: now() }); commit();
    },
  };
}

const LIVE = !!(C.supabaseUrl && C.supabaseAnonKey && window.supabase);
const api = LIVE ? supaAPI() : demoAPI();

/* ----------------------------------------------------------------- header */
function renderHeader(route) {
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.r === route));
  qs('#nav-staff').hidden = !isStaff(me());
  const p = me();
  qs('#userbox').innerHTML = p
    ? `<a class="me-btn" href="#/u/${esc(p.id)}">${avatar(p, 32)}<span class="nm">${esc(p.username)}</span></a>
       <button class="btn sm ghost" data-act="logout">Sign out</button>`
    : `<button class="btn gold sm" data-act="login">Sign in</button>`;
}

function loginModal() {
  if (api.demo) {
    modal(`<h2>Sign in (demo)</h2><p class="muted small">In demo mode you can be anyone. Once Supabase is set up this becomes Discord / email sign-in.</p>
      <form data-form="login-demo">
        <label class="f"><span>Name</span><input name="name" maxlength="32" required value="${esc(localStorage.getItem('sdemo_name') || '')}" placeholder="Your forum name"></label>
        <label class="f"><span>Try it as</span><select name="role" style="width:100%"><option value="owner">Owner (see the staff tools)</option><option value="moderator">Moderator</option><option value="member">Regular member</option></select></label>
        <button class="btn gold" style="width:100%">Sign in</button>
      </form>`);
    return;
  }
  modal(`<h2>Sign in</h2><p class="muted small">New here? Signing in creates your account.</p>
    <button class="btn discord lg" style="width:100%;margin-top:10px" data-act="login-discord">Continue with Discord</button>
    <div class="or">or</div>
    <form data-form="login-email">
      <label class="f"><span>Email</span><input type="email" name="email" required placeholder="you@example.com" autocomplete="email"></label>
      <button class="btn" style="width:100%">Email me a sign-in link</button>
    </form>`);
}
function needLogin(what) {
  return `<div class="notice">You need to <a href="#" data-act="login">sign in</a> to ${what}.</div>`;
}

/* ------------------------------------------------------------------ pages */
async function pageHome() {
  const [ups, evs, idx] = await Promise.all([api.listThreads('updates', 3, true), api.events(), api.threadsIndex()]);
  const soon = evs.filter(e => e.event_at && new Date(e.event_at) > Date.now() - 3 * 3600e3).slice(0, 3);
  const recent = idx.filter(t => !CAT[t.category] || !CAT[t.category].staffOnly).slice(0, 6);
  const members = new Set(idx.map(t => t.author && t.author.id)).size;
  const posts = idx.reduce((n, t) => n + 1 + (t.reply_count || 0), 0);
  return `
  <section class="hero">
    <div class="kicker">Garry's Mod · DarkRP</div>
    <h1>${esc(C.siteName || 'Supreme Dark RP')}</h1>
    <p>${esc(C.tagline || '')}</p>
    <div class="row">
      ${C.serverIP ? `<a class="btn gold lg" href="steam://connect/${esc(C.serverIP)}">▶ Join the server</a>
        <span class="ipchip" data-act="copy-ip" title="Click to copy">${esc(C.serverIP)} ⧉</span>` : ''}
      ${C.discordInvite ? `<a class="btn discord lg" href="${esc(C.discordInvite)}" target="_blank" rel="noopener">Discord</a>` : ''}
    </div>
    <div class="stats">
      <div><b>${idx.length}</b><span>Threads</span></div>
      <div><b>${posts}</b><span>Posts</span></div>
      <div><b>${soon.length}</b><span>Upcoming events</span></div>
      <div><b>${members}</b><span>Active posters</span></div>
    </div>
  </section>
  <div class="grid2">
    <div class="stack">
      <section class="panel">
        <div class="panel-h"><h3>📢 Latest updates</h3><span class="spacer"></span><a class="small" href="#/c/updates">All updates →</a></div>
        ${ups.length ? ups.map(t => `<a class="upd" href="#/t/${t.id}">
            <div class="row small"><span class="tag">Update</span><span class="dim">${when(t.created_at)} by ${esc(t.author ? t.author.username : '')}</span></div>
            <h4 style="margin-top:8px">${esc(t.title)}</h4><p>${esc(plain(t.body, 240))}</p></a>`).join('')
          : emptyBox('No updates yet.')}
      </section>
      <section class="panel">
        <div class="panel-h"><h3>💬 Recent discussions</h3><span class="spacer"></span><a class="small" href="#/forums">Forums →</a></div>
        ${recent.length ? recent.map(threadRow).join('') : emptyBox('Nothing here yet. <a href="#/forums">Start the first thread</a>.')}
      </section>
    </div>
    <div class="stack">
      <section class="panel">
        <div class="panel-h"><h3>🎉 Upcoming events</h3><span class="spacer"></span><a class="small" href="#/events">All →</a></div>
        ${soon.length ? soon.map(eventRow).join('') : emptyBox('No events planned yet.')}
      </section>
      <section class="panel">
        <div class="panel-h"><h3>⭐ Support the server</h3></div>
        <div class="panel-b"><p class="muted" style="margin-top:0">Donation ranks unlock VIP jobs, more props and a shiny chat tag, and keep the server running.</p>
          <a class="btn gold" href="#/donate">See ranks</a></div>
      </section>
      <section class="panel">
        <div class="panel-h"><h3>🛡️ Join the staff team</h3></div>
        <div class="panel-b"><p class="muted" style="margin-top:0">${C.applicationsOpen ? 'Staff applications are <b style="color:var(--green)">open</b>. Help run the city.' : 'Staff applications are closed right now.'}</p>
          <a class="btn" href="#/apply">Apply</a></div>
      </section>
    </div>
  </div>`;
}

function eventRow(t) {
  return `<a class="ev" href="#/t/${t.id}">${dateBlock(t.event_at)}<div style="min-width:0"><h4>${esc(t.title)}</h4>
    <div class="when">${esc(new Date(t.event_at).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }))} · <span class="countdown">${until(t.event_at)}</span></div></div></a>`;
}

function threadRow(t, showCat = true) {
  const c = CAT[t.category];
  return `<div class="trow${t.pinned ? ' pinned' : ''}">
    ${avatar(t.author, 34)}
    <div style="min-width:0">
      <div>${t.pinned ? '<span class="flag pin">PINNED</span>' : ''}${t.locked ? '<span class="flag lk">LOCKED</span>' : ''}<a class="tt" href="#/t/${t.id}">${esc(t.title)}</a></div>
      <div class="meta">${userLink(t.author)} · ${when(t.created_at)}${showCat && c ? ` · <a href="#/c/${c.id}" class="muted">${esc(c.name)}</a>` : ''}${t.event_at ? ` · <span class="countdown">${until(t.event_at)}</span>` : ''}</div>
    </div>
    <div class="fcount"><b>${t.reply_count || 0}</b>${t.reply_count === 1 ? 'reply' : 'replies'}</div>
    <div class="meta tlast">Last activity<br>${when(t.last_reply_at)}</div>
  </div>`;
}

async function pageForums() {
  const idx = await api.threadsIndex();
  const stats = {};
  for (const t of idx) {
    const s = stats[t.category] || (stats[t.category] = { threads: 0, posts: 0, last: null });
    s.threads++; s.posts += 1 + (t.reply_count || 0);
    if (!s.last || new Date(t.last_reply_at) > new Date(s.last.last_reply_at)) s.last = t;
  }
  const groups = [...new Set(CATS.map(c => c.group))];
  return `<div class="page-h"><div><h1>Forums</h1><p>Talk with the Supreme community.</p></div></div>
  ${groups.map(g => `<section class="panel fgroup"><div class="panel-h"><h3>${esc(g)}</h3></div>
    ${CATS.filter(c => c.group === g).map(c => {
      const s = stats[c.id] || { threads: 0, posts: 0, last: null };
      return `<div class="frow"><div class="ficon">${c.icon || '💬'}</div>
        <div style="min-width:0"><h4><a href="#/c/${c.id}">${esc(c.name)}</a>${c.staffOnly ? ' <span class="lock">🔒 staff post only</span>' : ''}</h4><p>${esc(c.desc || '')}</p></div>
        <div class="fcount"><b>${s.threads}</b>threads · ${s.posts} posts</div>
        <div class="flast">${s.last ? `${avatar(s.last.author, 30)}<div><a class="t" href="#/t/${s.last.id}">${esc(s.last.title)}</a><span class="dim">${when(s.last.last_reply_at)}</span></div>` : '<span class="dim">No posts yet</span>'}</div>
      </div>`;
    }).join('')}</section>`).join('')}`;
}

async function pageCategory(id) {
  const c = CAT[id];
  if (!c) return pageNotFound();
  const list = await api.listThreads(id);
  const p = me();
  const canStart = canPost(p) && (!c.staffOnly || isStaff(p));
  return `<div class="crumbs"><a href="#/forums">Forums</a> › ${esc(c.group)}</div>
  <div class="page-h"><div><h1>${c.icon || ''} ${esc(c.name)}</h1><p>${esc(c.desc || '')}</p></div><span class="spacer"></span>
    ${canStart ? `<a class="btn gold" href="#/new/${c.id}">+ New ${c.id === 'events' ? 'event' : 'thread'}</a>`
      : !p ? `<button class="btn" data-act="login">Sign in to post</button>` : ''}</div>
  <section class="panel">${list.length ? list.map(t => threadRow(t, false)).join('') : emptyBox('No threads here yet.')}</section>`;
}

async function pageThread(id) {
  const t = await api.getThread(id);
  if (!t) return pageNotFound('That thread was deleted or never existed.');
  const c = CAT[t.category] || { name: t.category, id: t.category };
  const p = me();
  const staff = isStaff(p);
  const mine = o => p && o.author && o.author.id === p.id;
  const post = (o, isThread) => `<article class="post" id="${isThread ? 'op' : 'p' + o.id}">
    <div class="post-side">${avatar(o.author, 64)}<div>${userLink(o.author)}</div>
      <div class="badges">${badges(o.author)}</div>
      ${o.author ? `<div class="small dim pjoined" style="margin-top:6px">Joined ${new Date(o.author.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</div>` : ''}</div>
    <div class="post-main">
      <div class="post-meta">${when(o.created_at)}${o.edited_at ? ' · edited' : ''}
        <span class="post-actions">
          ${mine(o) && canPost(p) && (!t.locked || staff) ? `<button class="btn sm ghost" data-act="${isThread ? 'edit-thread' : 'edit-post'}" data-id="${o.id}">Edit</button>` : ''}
          ${!isThread && (mine(o) || staff) ? `<button class="btn sm ghost danger" data-act="del-post" data-id="${o.id}">Delete</button>` : ''}
        </span></div>
      <div class="content" data-body="${isThread ? 'op' : o.id}">${md(o.body)}</div>
    </div></article>`;
  document.title = `${t.title} - ${C.siteName || 'Supreme'}`;
  return `<div class="crumbs"><a href="#/forums">Forums</a> › <a href="#/c/${esc(c.id)}">${esc(c.name)}</a></div>
  <div class="page-h"><div style="min-width:0"><h1 style="overflow-wrap:anywhere">${t.pinned ? '<span class="flag pin" style="font:700 12px var(--body)">PINNED</span>' : ''}${t.locked ? '<span class="flag lk" style="font:700 12px var(--body)">LOCKED</span>' : ''}${esc(t.title)}</h1>
    <p>${userLink(t.author)} · ${when(t.created_at)} · ${t.reply_count || 0} ${t.reply_count === 1 ? 'reply' : 'replies'}</p></div>
    <span class="spacer"></span>
    <div class="modbar">
      ${staff ? `<button class="btn sm" data-act="pin" data-id="${t.id}">${t.pinned ? 'Unpin' : 'Pin'}</button>
        <button class="btn sm" data-act="lock" data-id="${t.id}">${t.locked ? 'Unlock' : 'Lock'}</button>` : ''}
      ${staff || (mine(t) && !t.reply_count) ? `<button class="btn sm danger" data-act="del-thread" data-id="${t.id}" data-cat="${esc(t.category)}">Delete thread</button>` : ''}
    </div></div>
  ${t.event_at ? `<div class="ev-banner">${dateBlock(t.event_at)}<div><b>${esc(fullDate(t.event_at))}</b><div class="countdown">${until(t.event_at)}</div>
    <div class="small muted">Shown in your own timezone. Reply below if you're coming!</div></div></div>` : ''}
  <section class="panel">${post(t, true)}${(t.posts || []).map(o => post(o, false)).join('')}</section>
  <div style="margin-top:22px">${
    !p ? needLogin('reply') :
    !canPost(p) ? '<div class="notice">You are banned from posting.</div>' :
    t.locked && !staff ? '<div class="notice">🔒 This thread is locked.</div>' :
    `<section class="panel"><div class="panel-h"><h3>Reply</h3></div><div class="panel-b">
      <form data-form="reply" data-id="${t.id}">
        <textarea name="body" required maxlength="10000" placeholder="Write a reply..."></textarea>
        ${mdHint()}
        <button class="btn gold">Post reply</button>
      </form></div></section>`}</div>`;
}
const mdHint = () => `<div class="mdhint">Formatting: <code>**bold**</code> <code>_italic_</code> <code>[link](https://...)</code> <code>![image](https://...)</code> <code>- list</code> <code>## heading</code> <code>&gt; quote</code></div>`;

async function pageNew(cid) {
  const c = CAT[cid];
  if (!c) return pageNotFound();
  const p = me();
  if (!p) return `<div class="page-h"><h1>New thread</h1></div>${needLogin('post')}`;
  if (c.staffOnly && !isStaff(p)) return `<div class="page-h"><h1>New thread</h1></div><div class="notice">Only staff can post in ${esc(c.name)}.</div>`;
  const ev = cid === 'events';
  return `<div class="crumbs"><a href="#/forums">Forums</a> › <a href="#/c/${c.id}">${esc(c.name)}</a></div>
  <div class="page-h"><h1>${ev ? 'New event' : 'New thread'}</h1></div>
  <section class="panel"><div class="panel-b">
    <form data-form="new-thread" data-cat="${c.id}">
      <label class="f"><span>Title <i class="req">*</i></span><input name="title" required minlength="3" maxlength="120" placeholder="${ev ? 'e.g. Purge Night' : 'What is it about?'}"></label>
      ${ev ? `<label class="f"><span>Date and time <i class="req">*</i></span><input type="datetime-local" name="event_at" required style="max-width:280px"><div class="hint">Your local time. Everyone sees it in their own timezone.</div></label>` : ''}
      <label class="f"><span>${ev ? 'Details' : 'Message'} <i class="req">*</i></span><textarea name="body" required maxlength="20000" style="min-height:220px"></textarea></label>
      ${mdHint()}
      <div class="row"><button class="btn gold">${ev ? 'Post event' : 'Post thread'}</button><a class="btn ghost" href="#/c/${c.id}">Cancel</a></div>
    </form></div></section>`;
}

async function pageEvents() {
  const evs = await api.events();
  const cut = Date.now() - 3 * 3600e3;
  const soon = evs.filter(e => e.event_at && new Date(e.event_at) > cut);
  const past = evs.filter(e => e.event_at && new Date(e.event_at) <= cut).reverse().slice(0, 10);
  const big = t => `<a class="bigev" href="#/t/${t.id}">${dateBlock(t.event_at)}<div style="min-width:0">
      <div class="row small"><span class="tag red">${esc(new Date(t.event_at).toLocaleString(undefined, { weekday: 'long', hour: 'numeric', minute: '2-digit' }))}</span><span class="countdown">${until(t.event_at)}</span></div>
      <h3 style="margin-top:8px">${esc(t.title)}</h3><p>${esc(plain(t.body, 260))}</p>
      <div class="small dim" style="margin-top:8px">${t.reply_count || 0} ${t.reply_count === 1 ? 'reply' : 'replies'}</div></div></a>`;
  return `<div class="page-h"><div><h1>Server Events</h1><p>Times are shown in your timezone. Open an event and reply to say you're coming.</p></div><span class="spacer"></span>
    ${isStaff(me()) ? '<a class="btn gold" href="#/new/events">+ New event</a>' : ''}</div>
  <section class="panel">${soon.length ? soon.map(big).join('') : emptyBox('No events planned right now. Check back soon!')}</section>
  ${past.length ? `<h2 style="margin:30px 0 14px">Past events</h2><section class="panel">${past.map(eventRow).join('')}</section>` : ''}`;
}

async function pageDonate() {
  const ranks = C.ranks || [];
  const link = C.donateURL;
  return `<div class="page-h"><div><h1>Donation Ranks</h1><p>Every donation goes straight into keeping Supreme online. Ranks are permanent.</p></div></div>
  <div class="ranks">${ranks.map(r => `<div class="rank${r.best ? ' best' : ''}" style="--c:${esc(r.color)}">
      ${r.best ? '<span class="ribbon">BEST VALUE</span>' : ''}
      <h3>${esc(r.name)}</h3>
      <div class="price">$${esc(r.price)} <small>one time</small></div>
      <ul>${r.perks.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      ${link ? `<a class="btn ${r.best ? 'gold' : ''} lg" href="${esc(link)}" target="_blank" rel="noopener">Donate $${esc(r.price)}</a>` : '<button class="btn lg" disabled style="cursor:default">Coming soon</button>'}
    </div>`).join('')}</div>
  <section class="panel"><div class="panel-h"><h3>How it works</h3></div><div class="panel-b">
    <div class="steps">
      <div class="step"><b>1</b><p>Click <b>Donate</b> and send the rank's price${link ? '' : ' (the donation link goes live soon)'}.</p></div>
      <div class="step"><b>2</b><p>In the donation message write your <b>SteamID</b> and the <b>rank</b> you want. Find your SteamID by typing <code>status</code> in the game console.</p></div>
      <div class="step"><b>3</b><p>Staff give you the rank in game, usually within 24 hours, plus the matching badge here on the forums.</p></div>
      <div class="step"><b>4</b><p>Problems? Post in <a href="#/c/support">Help &amp; Bug Reports</a> and we'll sort it out.</p></div>
    </div>
    <p class="small dim" style="margin:18px 0 0">Donations are voluntary and non-refundable. Ranks give perks and cosmetics; breaking the rules can still get you banned. Upgrading? Just pay the difference.</p>
  </div></section>`;
}

async function pageApply() {
  const p = me();
  const head = `<div class="page-h"><div><h1>Staff Application</h1><p>Help run the city: answer sits, stop RDM, keep RP fun for everyone.</p></div></div>`;
  if (!C.applicationsOpen) return head + '<div class="notice">Staff applications are closed right now. Keep an eye on <a href="#/c/updates">Updates</a>.</div>';
  if (!p) return head + needLogin('apply');
  const mine = await api.myApps(p.id);
  const pending = mine.find(a => a.status === 'pending');
  const history = mine.length ? `<section class="panel" style="margin-bottom:22px"><div class="panel-h"><h3>Your applications</h3></div>
    ${mine.map(a => `<div class="trow" style="grid-template-columns:minmax(0,1fr) auto"><div><b>Sent ${when(a.created_at)}</b>
      ${a.staff_note ? `<div class="small muted" style="white-space:pre-wrap">Staff note: ${esc(a.staff_note)}</div>` : ''}</div>
      <span class="status ${esc(a.status)}">${esc(a.status)}</span></div>`).join('')}</section>` : '';
  if (pending) return head + history + '<div class="notice">Your application is waiting for review. Staff will update its status here.</div>';
  if (!canPost(p)) return head + history + '<div class="notice">Banned members can\'t apply.</div>';
  const field = q => {
    const pre = q.fromProfile ? esc(p[q.fromProfile] || '') : '';
    const req = q.required ? 'required' : '';
    const input = q.type === 'long'
      ? `<textarea name="${esc(q.id)}" ${req} maxlength="3000" style="min-height:110px"></textarea>`
      : `<input name="${esc(q.id)}" type="${q.type === 'number' ? 'number' : 'text'}" ${req} maxlength="200" value="${pre}" placeholder="${esc(q.placeholder || '')}" ${q.type === 'number' ? 'min="0" max="200" style="max-width:160px"' : ''}>`;
    return `<label class="f"><span>${esc(q.label)} ${q.required ? '<i class="req">*</i>' : ''}</span>${input}</label>`;
  };
  return head + history + `<section class="panel"><div class="panel-b">
    <form data-form="apply">
      ${QUESTIONS.map(field).join('')}
      <label class="row" style="margin:6px 0 18px;cursor:pointer"><input type="checkbox" name="agree" required style="width:auto"> <span>I've read the server rules and everything above is true.</span></label>
      <button class="btn gold lg">Send application</button>
    </form></div></section>`;
}

async function pageStaff(tab = 'apps') {
  const p = me();
  if (!isStaff(p)) return pageNotFound('Staff only.');
  const tabs = n => `<div class="tabs"><a href="#/staff/apps" class="${tab === 'apps' ? 'on' : ''}">Applications${n ? `<span class="n">${n}</span>` : ''}</a>
    <a href="#/staff/members" class="${tab === 'members' ? 'on' : ''}">Members &amp; ranks</a></div>`;
  const head = `<div class="page-h"><div><h1>Staff Panel</h1><p>Review applications and manage forum ranks.</p></div></div>`;
  if (tab === 'members') {
    const list = await api.members();
    const admin = isAdmin(p);
    const roleSel = u => {
      if (!admin || u.id === p.id || (u.role === 'owner' && p.role !== 'owner')) return badges({ role: u.role }) || '<span class="dim">Member</span>';
      const opts = ['member', 'moderator', 'admin', ...(p.role === 'owner' ? ['owner'] : []), 'banned'];
      return `<select data-change="role" data-id="${esc(u.id)}">${opts.map(o => `<option value="${o}"${u.role === o ? ' selected' : ''}>${o[0].toUpperCase() + o.slice(1)}</option>`).join('')}</select>`;
    };
    const donorSel = u => !admin ? (badges({ donor_rank: u.donor_rank }) || '<span class="dim">None</span>')
      : `<select data-change="donor" data-id="${esc(u.id)}"><option value="">None</option>${(C.ranks || []).map(r => `<option value="${esc(r.id)}"${u.donor_rank === r.id ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select>`;
    return head + tabs() + `<section class="panel"><div class="panel-h"><input data-filter="members" placeholder="Search members..." style="max-width:300px"><span class="spacer"></span><span class="small dim">${list.length} members${admin ? '' : ' · only admins can change ranks'}</span></div>
      <div class="tablewrap"><table class="members"><thead><tr><th>Member</th><th>SteamID</th><th>Joined</th><th>Staff rank</th><th>Donor rank</th></tr></thead><tbody>
      ${list.map(u => `<tr data-name="${esc(u.username.toLowerCase())} ${esc((u.steam_id || '').toLowerCase())}"><td><div class="row" style="flex-wrap:nowrap">${avatar(u, 28)}${userLink(u)}</div></td>
        <td class="small">${esc(u.steam_id || '-')}</td><td class="small muted">${new Date(u.created_at).toLocaleDateString()}</td>
        <td>${roleSel(u)}</td><td>${donorSel(u)}</td></tr>`).join('')}
      </tbody></table></div></section>
      <p class="small dim">Forum ranks are badges only. Give the in-game rank from the server console too, e.g. <code>ulx adduserid STEAM_0:1:2345 vip</code>.</p>`;
  }
  const apps = await api.allApps();
  const pending = apps.filter(a => a.status === 'pending').length;
  const label = id => (QUESTIONS.find(q => q.id === id) || { label: id }).label;
  return head + tabs(pending) + `<section class="panel">${apps.length ? apps.map(a => `<details class="app"${a.status === 'pending' ? ' open' : ''}>
      <summary>${avatar(a.author, 32)}<div style="min-width:0;flex:1"><b>${esc(a.answers.ign || (a.author && a.author.username) || '?')}</b> <span class="small dim">· ${userLink(a.author)} · ${when(a.created_at)}</span></div>
        <span class="status ${esc(a.status)}">${esc(a.status)}</span></summary>
      <dl class="answers">${Object.entries(a.answers || {}).map(([k, v]) => `<dt>${esc(label(k))}</dt><dd>${esc(v) || '<span class="dim">-</span>'}</dd>`).join('')}</dl>
      <form data-form="review" data-id="${a.id}" class="answers" style="padding-top:0">
        <label class="f" style="margin-bottom:10px"><span>Note to the applicant (they can see this)</span><textarea name="note" maxlength="2000" style="min-height:70px">${esc(a.staff_note || '')}</textarea></label>
        <div class="row"><button class="btn sm" name="status" value="accepted" style="color:#7ee392">✓ Accept</button>
          <button class="btn sm danger" name="status" value="denied">✗ Deny</button>
          ${a.status !== 'pending' ? '<button class="btn sm ghost" name="status" value="pending">Back to pending</button>' : ''}</div>
      </form></details>`).join('') : emptyBox('No applications yet.')}</section>`;
}

async function pageProfile(id) {
  const p = me();
  const u = await api.getProfile(id);
  if (!u) return pageNotFound('No member with that id.');
  const idx = await api.threadsIndex();
  const theirs = idx.filter(t => t.author && t.author.id === u.id).slice(0, 10);
  const own = p && p.id === u.id;
  const steam = (u.steam_id || '').trim();
  const steamLink = /^7656\d{13}$/.test(steam) ? `https://steamcommunity.com/profiles/${steam}` : '';
  return `<div class="page-h" style="align-items:center">${avatar(u, 84)}<div><h1>${esc(u.username)}</h1>
    <p>${badges(u) || '<span class="dim">Member</span>'} <span class="dim">· joined ${new Date(u.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span></p>
    ${steam ? `<p class="small">SteamID: ${steamLink ? `<a href="${steamLink}" target="_blank" rel="noopener">${esc(steam)}</a>` : esc(steam)}</p>` : ''}</div></div>
  <div class="grid2"><section class="panel"><div class="panel-h"><h3>Threads</h3></div>${theirs.length ? theirs.map(t => threadRow(t)).join('') : emptyBox('No threads yet.')}</section>
  ${own ? `<section class="panel"><div class="panel-h"><h3>Edit profile</h3></div><div class="panel-b">
    <form data-form="profile">
      <label class="f"><span>Forum name</span><input name="username" required minlength="2" maxlength="32" value="${esc(u.username)}"></label>
      <label class="f"><span>SteamID</span><input name="steam_id" maxlength="40" value="${esc(u.steam_id || '')}" placeholder="STEAM_0:1:12345 or 7656..."><div class="hint">Lets staff match you to your in-game account (donations, appeals).</div></label>
      <button class="btn gold">Save</button>
    </form></div></section>` : ''}</div>`;
}

function pageNotFound(msg) {
  return `<div class="empty" style="padding:80px 0"><h1>Not found</h1><p>${esc(msg || 'That page doesn\'t exist.')}</p><a class="btn" href="#/">Home</a></div>`;
}

/* ----------------------------------------------------------------- router */
const ROUTES = { '': pageHome, forums: pageForums, c: pageCategory, t: pageThread, new: pageNew, events: pageEvents,
  donate: pageDonate, apply: pageApply, staff: pageStaff, u: pageProfile };
let tok = 0, lastHash = null;
async function render() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').map(x => { try { return decodeURIComponent(x); } catch (e) { return x; } });
  const r = parts[0] || '';
  const fn = ROUTES[r] || (() => pageNotFound());
  const my = ++tok;
  const moved = lastHash !== location.hash;
  lastHash = location.hash;
  renderHeader(r);
  document.title = C.siteName ? `${C.siteName} - Forums` : 'Supreme Dark RP - Forums';
  if (moved) app.innerHTML = '<div class="loading"><span></span></div>';
  let html;
  try { html = await fn(...parts.slice(1)); } catch (e) { console.error(e); html = errBox('Something went wrong: ' + e.message); }
  if (my !== tok) return;
  app.innerHTML = html;
  if (moved) window.scrollTo(0, 0);
}
async function refreshSession() {
  try { S.me = await api.session(); } catch (e) { console.error(e); S.me = null; }
}

/* ---------------------------------------------------------------- actions */
async function busy(el, fn) {
  const btns = el.tagName === 'FORM' ? el.querySelectorAll('button') : [el];
  btns.forEach(b => { b.disabled = true; });
  try { await fn(); } catch (e) { console.error(e); toast(e.message || String(e), true); }
  finally { btns.forEach(b => { if (b.isConnected) b.disabled = false; }); }
}
function editBox(el, html) {
  const box = qs(`[data-body="${el.dataset.kind}"]`);
  if (box) box.innerHTML = html;
}
const ACT = {
  'close-modal': closeModal,
  login: loginModal,
  async 'login-discord'(el) { await busy(el, () => api.signInDiscord()); },
  async logout() { await api.signOut(); await refreshSession(); toast('Signed out.'); render(); },
  'copy-ip'() { navigator.clipboard?.writeText(C.serverIP).then(() => toast('Server IP copied. Paste it into the console: connect ' + C.serverIP), () => {}); },
  async pin(el) { await busy(el, async () => { const t = await api.getThread(el.dataset.id); await api.updateThread(t.id, { pinned: !t.pinned }); render(); }); },
  async lock(el) { await busy(el, async () => { const t = await api.getThread(el.dataset.id); await api.updateThread(t.id, { locked: !t.locked }); render(); }); },
  async 'del-thread'(el) {
    if (!confirm('Delete this whole thread and all its replies? This can\'t be undone.')) return;
    await busy(el, async () => { await api.deleteThread(el.dataset.id); toast('Thread deleted.'); location.hash = '#/c/' + el.dataset.cat; });
  },
  async 'del-post'(el) {
    if (!confirm('Delete this reply?')) return;
    await busy(el, async () => { await api.deletePost(el.dataset.id); toast('Reply deleted.'); render(); });
  },
  async 'edit-thread'(el) {
    const t = await api.getThread(location.hash.split('/')[2]);
    editBox({ dataset: { kind: 'op' } }, `<form data-form="edit-thread" data-id="${t.id}">
      <input name="title" required minlength="3" maxlength="120" value="${esc(t.title)}" style="margin-bottom:10px">
      <textarea name="body" required maxlength="20000" style="min-height:200px">${esc(t.body)}</textarea>
      <div class="row" style="margin-top:10px"><button class="btn gold sm">Save</button><button type="button" class="btn sm ghost" data-act="cancel-edit">Cancel</button></div></form>`);
  },
  async 'edit-post'(el) {
    const t = await api.getThread(location.hash.split('/')[2]);
    const o = t.posts.find(x => String(x.id) === el.dataset.id);
    if (!o) return;
    editBox({ dataset: { kind: o.id } }, `<form data-form="edit-post" data-id="${o.id}">
      <textarea name="body" required maxlength="10000">${esc(o.body)}</textarea>
      <div class="row" style="margin-top:10px"><button class="btn gold sm">Save</button><button type="button" class="btn sm ghost" data-act="cancel-edit">Cancel</button></div></form>`);
  },
  'cancel-edit'() { render(); },
};
const FORM = {
  async 'login-demo'(f, d) {
    localStorage.setItem('sdemo_name', d.get('name'));
    await api.signInDemo(d.get('name'), d.get('role'));
    closeModal(); await refreshSession(); toast('Signed in as ' + me().username + '.'); render();
  },
  async 'login-email'(f, d) {
    await api.signInEmail(d.get('email'));
    qs('.modal-card').innerHTML = `<h2>Check your email</h2><p class="muted">We sent a sign-in link to <b>${esc(d.get('email'))}</b>. Open it on this device.</p><button class="btn" data-act="close-modal">OK</button>`;
  },
  async 'new-thread'(f, d) {
    const o = { category: f.dataset.cat, title: d.get('title').trim(), body: d.get('body').trim() };
    if (o.title.length < 3) throw new Error('The title needs at least 3 characters.');
    if (!o.body) throw new Error('Write something first.');
    if (d.get('event_at')) o.event_at = new Date(d.get('event_at')).toISOString();
    const id = await api.createThread(o);
    toast('Posted!');
    location.hash = '#/t/' + id;
  },
  async reply(f, d) {
    const body = d.get('body').trim();
    if (!body) throw new Error('Write something first.');
    await api.reply(+f.dataset.id, body);
    lastHash = null; await render();
    const posts = document.querySelectorAll('.post'); posts[posts.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },
  async 'edit-thread'(f, d) { await api.updateThread(+f.dataset.id, { title: d.get('title').trim(), body: d.get('body').trim() }); toast('Saved.'); render(); },
  async 'edit-post'(f, d) { await api.editPost(+f.dataset.id, d.get('body').trim()); toast('Saved.'); render(); },
  async apply(f, d) {
    const answers = {};
    for (const q of QUESTIONS) answers[q.id] = String(d.get(q.id) || '').trim();
    await api.submitApp(answers);
    toast('Application sent. Good luck!');
    render();
  },
  async review(f, d, submitter) {
    const status = submitter && submitter.value;
    if (!status) return;
    await api.reviewApp(+f.dataset.id, status, d.get('note').trim() || null);
    toast('Application marked ' + status + '.');
    render();
  },
  async profile(f, d) {
    const username = d.get('username').trim(), steam_id = d.get('steam_id').trim() || null;
    if (username.length < 2) throw new Error('Name needs at least 2 characters.');
    await api.updateProfile(me().id, { username, steam_id });
    await refreshSession(); toast('Profile saved.'); render();
  },
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || !ACT[el.dataset.act]) return;
  e.preventDefault();
  Promise.resolve(ACT[el.dataset.act](el)).catch(err => { console.error(err); toast(err.message || String(err), true); });
});
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]');
  if (!f || !FORM[f.dataset.form]) return;
  e.preventDefault();
  const submitter = e.submitter;
  const d = new FormData(f);
  busy(f, () => FORM[f.dataset.form](f, d, submitter));
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-change]');
  if (!el) return;
  const patch = el.dataset.change === 'role' ? { role: el.value } : { donor_rank: el.value };
  el.disabled = true;
  api.updateProfile(el.dataset.id, patch).then(() => toast('Rank updated.'), err => { toast(err.message, true); render(); })
    .finally(() => { el.disabled = false; });
});
document.addEventListener('input', e => {
  const el = e.target.closest('[data-filter]');
  if (!el) return;
  const q = el.value.trim().toLowerCase();
  document.querySelectorAll('tr[data-name]').forEach(tr => { tr.hidden = q && !tr.dataset.name.includes(q); });
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ------------------------------------------------------------------ start */
(async () => {
  qs('#year').textContent = new Date().getFullYear();
  if (C.serverIP) qs('#foot-ip').innerHTML = `Server: <span class="ipchip" data-act="copy-ip" style="padding:3px 9px;font-size:12px">${esc(C.serverIP)}</span>`;
  if (!LIVE) {
    qs('#demo-bar').hidden = false;
    if (C.supabaseUrl && !window.supabase) qs('#demo-bar').textContent = 'Could not load the Supabase library (check your internet / ad blocker). Running in demo mode.';
  }
  await refreshSession();
  // tidy the address bar after a sign-in redirect (?code=...)
  if (location.search) history.replaceState(null, '', location.pathname + location.hash);
  api.onAuth(async () => { await refreshSession(); render(); });
  window.addEventListener('hashchange', render);
  render();
})();
})();

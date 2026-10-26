const $ = id => document.getElementById(id);
function msg(t, ok) { const m = $('msg'); m.textContent = t || ''; m.className = 'msg ' + (ok ? 'ok' : 'err'); }

async function api(path, body) {
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d.error || 'Request failed.'), { data: d });
  return d;
}
function tab(n) {
  $('login').hidden = n !== 'login'; $('signup').hidden = n !== 'signup';
  $('tl').classList.toggle('on', n === 'login'); $('ts').classList.toggle('on', n === 'signup');
  $('resend').hidden = true; msg('');
}
function account(u) {
  $('auth').hidden = true; $('acct').hidden = false;
  $('an').textContent = u.name; $('ae').textContent = u.email;
  $('av').textContent = u.verified ? 'Email verified' : 'Email not verified';
}
function busy(form, on) { form.querySelector('button[type=submit]').disabled = on; }

$('tl').onclick = () => tab('login');
$('ts').onclick = () => tab('signup');

$('login').onsubmit = async e => {
  e.preventDefault(); msg(''); busy(e.target, true);
  try { account((await api('/api/auth/login', Object.fromEntries(new FormData(e.target)))).user); }
  catch (x) { msg(x.message); $('resend').hidden = !(x.data && x.data.unverified); }
  busy(e.target, false);
};
$('signup').onsubmit = async e => {
  e.preventDefault(); msg(''); busy(e.target, true);
  try { const d = await api('/api/auth/signup', Object.fromEntries(new FormData(e.target))); msg(d.message, true); e.target.reset(); }
  catch (x) { msg(x.message); }
  busy(e.target, false);
};
$('resend').onclick = async () => {
  try { msg((await api('/api/auth/resend', { email: $('le').value })).message, true); } catch (x) { msg(x.message); }
};
$('out').onclick = async () => { await api('/api/auth/logout'); location.href = '/'; };

const q = new URLSearchParams(location.search);
if (q.get('verified') === '0') msg('That verification link is invalid or has expired. Sign in to request a new one.');
if (q.get('verified') === '1') msg('Email verified. You are signed in.', true);
if (q.has('verified')) history.replaceState(null, '', '/');
fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => { if (d) account(d.user); });

fetch('/api/config').then(r => r.json()).then(c => {
  if (!c.googleClientId) { $('gwrap').hidden = true; return; }
  const start = () => {
    google.accounts.id.initialize({
      client_id: c.googleClientId,
      callback: async r => { try { account((await api('/api/auth/google', { credential: r.credential })).user); } catch (x) { msg(x.message); } }
    });
    google.accounts.id.renderButton($('gbtn'), { theme: 'outline', size: 'large', text: 'continue_with', width: Math.min(360, window.innerWidth - 40) });
  };
  if (window.google && google.accounts) start(); else window.addEventListener('load', start);
});

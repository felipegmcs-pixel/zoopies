import { listOrders, updateTracking } from './db';
import type { Env } from './types';

export function requireAuth(request: Request, env: Env): Response | null {
  const auth = request.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Basic ')) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Zoopies Admin"' },
    });
  }
  const decoded = atob(auth.slice(6));
  const colon = decoded.indexOf(':');
  const password = colon >= 0 ? decoded.slice(colon + 1) : decoded;
  if (password !== env.ADMIN_PASSWORD) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Zoopies Admin"' },
    });
  }
  return null;
}

export async function handleAdmin(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === '/admin') {
    return new Response(ADMIN_HTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (url.pathname === '/api/orders' && request.method === 'GET') {
    const orders = await listOrders(env.DB);
    return Response.json({ orders });
  }

  if (url.pathname === '/api/tracking' && request.method === 'POST') {
    const { orderId, trackingCode } = await request.json<{ orderId: string; trackingCode: string }>();
    if (!orderId || !trackingCode) {
      return new Response('Missing fields', { status: 400 });
    }
    await updateTracking(env.DB, orderId, trackingCode.trim().toUpperCase());
    return Response.json({ ok: true });
  }

  return new Response('Not found', { status: 404 });
}

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Zoopies Admin</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root {
  --bg:       #060E08;
  --s1:       #0B1610;
  --s2:       #101E14;
  --s3:       #162619;
  --s4:       #1D3120;
  --green:    #2D6A4F;
  --green-l:  #52B788;
  --green-xl: #95D5B2;
  --gold:     #C9A84C;
  --gold-l:   #E2C97E;
  --gold-dim: rgba(201,168,76,0.10);
  --gold-b:   rgba(201,168,76,0.22);
  --text:     #E0EDE3;
  --text-2:   #8DB89A;
  --text-3:   #4A6B52;
  --border:   rgba(255,255,255,0.055);
  --radius:   16px;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  background: var(--bg);
  background-image:
    radial-gradient(ellipse 80% 50% at 10% -10%, rgba(45,106,79,0.18) 0%, transparent 60%),
    radial-gradient(ellipse 60% 40% at 90% 110%, rgba(201,168,76,0.07) 0%, transparent 60%);
  color: var(--text);
  min-height: 100vh;
}

/* ── HEADER ── */
header {
  position: sticky; top: 0; z-index: 100;
  height: 62px; padding: 0 24px;
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(6,14,8,0.85);
  backdrop-filter: blur(24px);
  border-bottom: 1px solid var(--gold-b);
}
.logo { display: flex; align-items: center; gap: 12px; }
.logo-mark {
  width: 34px; height: 34px; border-radius: 10px;
  background: linear-gradient(135deg, var(--s4) 0%, var(--green) 100%);
  border: 1px solid var(--gold-b);
  display: flex; align-items: center; justify-content: center;
  font-size: 17px; flex-shrink: 0;
  box-shadow: 0 0 0 1px rgba(201,168,76,0.08), 0 4px 16px rgba(0,0,0,0.4);
}
.logo-text { display: flex; flex-direction: column; gap: 1px; }
.logo-title { font-size: 14px; font-weight: 800; color: var(--text); letter-spacing: 0.04em; }
.logo-sub { font-size: 10px; color: var(--gold); letter-spacing: 0.14em; text-transform: uppercase; font-weight: 600; }
.btn-refresh {
  height: 34px; padding: 0 16px;
  background: rgba(255,255,255,0.05); border: 1px solid var(--border);
  color: var(--text-2); border-radius: 8px; cursor: pointer;
  font-size: 12px; font-weight: 600; font-family: inherit;
  letter-spacing: 0.04em; transition: all 0.15s; display: flex; align-items: center; gap: 6px;
}
.btn-refresh:hover { background: rgba(255,255,255,0.09); border-color: var(--gold-b); color: var(--gold-l); }

/* ── STATS ── */
.stats-wrap { max-width: 700px; margin: 0 auto; padding: 20px 20px 4px; display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
.stat {
  background: var(--s2); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 18px 16px; position: relative; overflow: hidden;
  transition: border-color 0.2s, transform 0.15s;
}
.stat:hover { border-color: rgba(201,168,76,0.18); transform: translateY(-1px); }
.stat::after {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  border-radius: 2px 2px 0 0;
}
.stat:nth-child(1)::after { background: linear-gradient(90deg, var(--green), var(--green-l)); }
.stat:nth-child(2)::after { background: linear-gradient(90deg, #B45309, #FCD34D); }
.stat:nth-child(3)::after { background: linear-gradient(90deg, var(--gold), var(--gold-l)); }
.stat-icon { font-size: 20px; margin-bottom: 12px; opacity: 0.85; }
.stat-num { font-size: 28px; font-weight: 800; color: var(--text); line-height: 1; letter-spacing: -0.02em; }
.stat-label { font-size: 10px; color: var(--text-3); margin-top: 5px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600; }

/* ── ORDERS ── */
.orders { max-width: 700px; margin: 0 auto; padding: 12px 20px 48px; display: flex; flex-direction: column; gap: 12px; }

/* ── CARD ── */
.card {
  background: var(--s1); border: 1px solid var(--border);
  border-radius: 20px; overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
  box-shadow: 0 2px 12px rgba(0,0,0,0.25);
}
.card:hover {
  border-color: rgba(82,183,136,0.18);
  box-shadow: 0 4px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(201,168,76,0.06);
  transform: translateY(-1px);
}
.card-top {
  padding: 20px 20px 16px;
  display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
}
.cname { font-weight: 700; font-size: 15px; color: var(--text); letter-spacing: 0.01em; }
.cdate { font-size: 11px; color: var(--text-3); margin-top: 4px; letter-spacing: 0.02em; }
.amount { font-size: 22px; font-weight: 800; color: var(--gold); letter-spacing: -0.03em; line-height: 1; }
.badge {
  font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 20px;
  display: inline-block; margin-top: 6px; letter-spacing: 0.07em; text-transform: uppercase;
}
.badge-pending { background: rgba(251,191,36,0.1); color: #FCD34D; border: 1px solid rgba(251,191,36,0.22); }
.badge-complete { background: rgba(82,183,136,0.1); color: var(--green-xl); border: 1px solid rgba(82,183,136,0.25); }

/* gold divider */
.divider {
  height: 1px; margin: 0 20px;
  background: linear-gradient(90deg, transparent, var(--gold-b), transparent);
}

/* details */
.details { padding: 16px 20px; display: flex; flex-direction: column; gap: 7px; }
.detail-row { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; }
.detail-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; opacity: 0.75; }
.detail-val { color: var(--text-2); line-height: 1.5; }
.detail-val strong { color: var(--text); font-weight: 600; }

/* action area */
.card-action { padding: 14px 20px 20px; }
.tracking-row { display: flex; gap: 8px; }
.tinput {
  flex: 1; min-width: 0; padding: 12px 14px;
  background: var(--s3); border: 1px solid var(--border); border-radius: 11px;
  font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.1em; color: var(--text);
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}
.tinput::placeholder { color: var(--text-3); letter-spacing: 0.06em; }
.tinput:focus {
  outline: none; background: var(--s4);
  border-color: var(--gold); box-shadow: 0 0 0 3px rgba(201,168,76,0.12);
}
.btn-wa {
  padding: 12px 18px; flex-shrink: 0;
  background: linear-gradient(135deg, #1DAF53 0%, #25D366 100%);
  color: #fff; border: none; border-radius: 11px;
  font-size: 13px; font-weight: 700; font-family: inherit;
  cursor: pointer; white-space: nowrap; letter-spacing: 0.02em;
  box-shadow: 0 4px 20px rgba(37,211,102,0.3);
  transition: opacity 0.15s, transform 0.1s, box-shadow 0.15s;
}
.btn-wa:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 6px 24px rgba(37,211,102,0.4); }
.btn-wa:active { transform: translateY(0); }
.btn-wa:disabled { opacity: 0.3; cursor: not-allowed; transform: none; box-shadow: none; }

.done-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.tcode {
  font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 500;
  letter-spacing: 0.12em; padding: 9px 14px; border-radius: 10px;
  background: var(--gold-dim); color: var(--gold-l); border: 1px solid var(--gold-b);
}
.resend-link { font-size: 13px; color: #25D366; text-decoration: none; font-weight: 600; transition: opacity 0.15s; }
.resend-link:hover { opacity: 0.75; }

.no-phone {
  margin-top: 10px; padding: 9px 13px; border-radius: 9px;
  font-size: 12px; color: #FCA5A5;
  background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.18);
}
.empty { text-align: center; padding: 72px 20px; color: var(--text-3); font-size: 15px; }
</style>
</head>
<body>
<header>
  <div class="logo">
    <div class="logo-mark">\uD83D\uDC3E</div>
    <div class="logo-text">
      <div class="logo-title">Zoopies</div>
      <div class="logo-sub">Painel de Pedidos</div>
    </div>
  </div>
  <button class="btn-refresh" onclick="loadOrders()">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
    Atualizar
  </button>
</header>
<div class="stats-wrap" id="stats"></div>
<div class="orders" id="orders"><p class="empty">Carregando...</p></div>
<script>
function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtMoney(cents) {
  return (cents / 100).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
}
function fmtDate(iso) {
  return new Date(iso).toLocaleString('pt-BR', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'});
}
function cleanPhone(p) {
  if (!p) return '';
  var d = p.replace(/\\D/g, '');
  return d.startsWith('55') ? d : '55' + d;
}
function buildWaLink(phone, name, code) {
  var wa = cleanPhone(phone);
  var firstName = (name || 'cliente').split(' ')[0];
  var msg = 'Oi ' + firstName + '! \uD83D\uDC3E\\n\\n'
    + 'Seu Zoopies Cat Crocs foi enviado!\\n\\n'
    + 'Rastreio: ' + code + '\\n'
    + 'Acompanhe: https://rastreamento.correios.com.br/app/index.php?label=' + code + '\\n\\n'
    + 'Qualquer d\u00FAvida \u00E9 s\u00F3 chamar! \uD83D\uDE0A\\n'
    + '\u2013 Equipe Zoopies';
  return 'https://wa.me/' + wa + '?text=' + encodeURIComponent(msg);
}
async function sendTracking(btn) {
  var id = btn.dataset.id;
  var phone = btn.dataset.phone;
  var name = btn.dataset.name;
  var input = document.getElementById('t-' + id);
  var code = input.value.trim().toUpperCase();
  if (!code) { alert('Digite o c\u00F3digo de rastreio'); return; }
  btn.disabled = true;
  try {
    var res = await fetch('/api/tracking', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({orderId: id, trackingCode: code})
    });
    if (!res.ok) throw new Error('Erro ao salvar');
    if (phone) {
      window.open(buildWaLink(phone, name, code), '_blank');
    } else {
      alert('Rastreio salvo!\\n\\nCliente sem telefone \u2014 copie o c\u00F3digo e envie por email.');
    }
    loadOrders();
  } catch(e) {
    alert('Erro: ' + e.message);
    btn.disabled = false;
  }
}
function renderCard(o) {
  var name = o.customer_name || o.customer_email;
  var addr = [o.address_line1, o.address_line2, o.address_city, o.address_state, o.address_postal]
    .filter(Boolean).join(', ');

  var top = '<div class="card-top">'
    + '<div><div class="cname">' + esc(name) + '</div><div class="cdate">' + fmtDate(o.created_at) + '</div></div>'
    + '<div style="text-align:right"><div class="amount">' + fmtMoney(o.amount_total) + '</div>'
    + (o.tracking_code
        ? '<span class="badge badge-complete">\u2713 Enviado</span>'
        : '<span class="badge badge-pending">Aguardando envio</span>')
    + '</div></div>';

  var details = '<div class="details">'
    + '<div class="detail-row"><span class="detail-icon">\uD83D\uDCE7</span><span class="detail-val">' + esc(o.customer_email) + '</span></div>'
    + (o.customer_phone ? '<div class="detail-row"><span class="detail-icon">\uD83D\uDCF1</span><span class="detail-val">' + esc(o.customer_phone) + '</span></div>' : '')
    + '<div class="detail-row"><span class="detail-icon">\uD83D\uDCCD</span><span class="detail-val">' + esc(addr) + '</span></div>'
    + (o.client_ref ? '<div class="detail-row"><span class="detail-icon">\uD83D\uDED2</span><span class="detail-val"><strong>' + esc(o.client_ref) + '</strong></span></div>' : '')
    + '</div>';

  var action;
  if (o.tracking_code) {
    action = '<div class="card-action"><div class="done-row"><span class="tcode">' + esc(o.tracking_code) + '</span>';
    if (o.customer_phone) {
      action += '<a class="resend-link" href="' + esc(buildWaLink(o.customer_phone, name, o.tracking_code)) + '" target="_blank">\uD83D\uDCF2 Reenviar WhatsApp</a>';
    }
    action += '</div></div>';
  } else {
    action = '<div class="card-action"><div class="tracking-row">'
      + '<input class="tinput" id="t-' + esc(o.id) + '" type="text" placeholder="C\u00F3digo Correios" maxlength="30">'
      + '<button class="btn-wa" data-id="' + esc(o.id) + '" data-phone="' + esc(o.customer_phone || '') + '" data-name="' + esc(name) + '" onclick="sendTracking(this)">\uD83D\uDCF2 Enviar no WhatsApp</button>'
      + '</div>';
    if (!o.customer_phone) {
      action += '<div class="no-phone">\u26A0\uFE0F Sem telefone \u2014 envie por email: ' + esc(o.customer_email) + '</div>';
    }
    action += '</div>';
  }

  return '<div class="card">' + top + '<div class="divider"></div>' + details + '<div class="divider"></div>' + action + '</div>';
}
async function loadOrders() {
  try {
    var res = await fetch('/api/orders');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var data = await res.json();
    var orders = data.orders || [];

    var pending = orders.filter(function(o) { return !o.tracking_code; }).length;
    var done = orders.filter(function(o) { return !!o.tracking_code; }).length;

    document.getElementById('stats').innerHTML =
      '<div class="stat"><div class="stat-icon">\uD83D\uDCE6</div><div class="stat-num">' + orders.length + '</div><div class="stat-label">Total de Pedidos</div></div>'
      + '<div class="stat"><div class="stat-icon">\u23F3</div><div class="stat-num">' + pending + '</div><div class="stat-label">Aguardando Envio</div></div>'
      + '<div class="stat"><div class="stat-icon">\u2728</div><div class="stat-num">' + done + '</div><div class="stat-label">Enviados</div></div>';

    var container = document.getElementById('orders');
    if (!orders.length) {
      container.innerHTML = '<p class="empty">Nenhum pedido ainda. \uD83D\uDE80</p>';
    } else {
      container.innerHTML = orders.map(renderCard).join('');
    }
  } catch(e) {
    document.getElementById('orders').innerHTML = '<p class="empty">Erro ao carregar: ' + e.message + '</p>';
  }
}
loadOrders();
</script>
</body>
</html>`;

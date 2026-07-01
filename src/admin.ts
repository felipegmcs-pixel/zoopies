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
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; background: #f0ede8; color: #1a1a1a; min-height: 100vh; }
header { background: #5E4A32; color: #FBF4EC; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 10; }
h1 { font-size: 17px; font-weight: 700; letter-spacing: 0.01em; }
.stats { display: flex; background: white; border-bottom: 1px solid #e5e5e5; }
.stat { flex: 1; text-align: center; padding: 12px 8px; border-right: 1px solid #f0f0f0; }
.stat:last-child { border-right: none; }
.stat-num { font-size: 22px; font-weight: 700; color: #5E4A32; }
.stat-label { font-size: 11px; color: #888; margin-top: 2px; }
.orders { padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; max-width: 600px; margin: 0 auto; }
.card { background: white; border-radius: 12px; padding: 16px; border: 1px solid #e5e5e5; }
.card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 10px; }
.cname { font-weight: 600; font-size: 15px; }
.cdate { font-size: 12px; color: #888; margin-top: 2px; }
.amount { font-size: 17px; font-weight: 700; color: #5E4A32; }
.badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; display: inline-block; margin-top: 4px; }
.badge-pending { background: #FFF3CD; color: #856404; }
.badge-complete { background: #D1E7DD; color: #0A3622; }
.details { font-size: 13px; color: #555; line-height: 1.75; margin-bottom: 10px; }
.tracking-row { display: flex; gap: 8px; }
.tinput { flex: 1; padding: 10px 12px; border: 1.5px solid #ddd; border-radius: 8px; font-size: 14px; font-family: monospace; text-transform: uppercase; min-width: 0; }
.tinput:focus { outline: none; border-color: #5E4A32; }
.btn-wa { padding: 10px 14px; background: #25D366; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
.btn-wa:disabled { opacity: 0.5; cursor: not-allowed; }
.done-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.tcode { font-family: monospace; background: #f0f0f0; padding: 6px 10px; border-radius: 6px; font-size: 13px; letter-spacing: 0.05em; }
.resend-link { font-size: 13px; color: #25D366; text-decoration: none; }
.no-phone { font-size: 12px; color: #dc3545; margin-top: 6px; }
.btn-refresh { background: rgba(255,255,255,0.18); border: none; color: white; padding: 7px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; }
.empty { text-align: center; padding: 48px 20px; color: #999; font-size: 15px; }
</style>
</head>
<body>
<header>
  <h1>🐾 Zoopies Admin</h1>
  <button class="btn-refresh" onclick="loadOrders()">↻ Atualizar</button>
</header>
<div class="stats" id="stats"></div>
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
    + '\uD83D\uDCE7 ' + esc(o.customer_email) + '<br>'
    + (o.customer_phone ? '\uD83D\uDCF1 ' + esc(o.customer_phone) + '<br>' : '')
    + '\uD83D\uDCCD ' + esc(addr)
    + (o.client_ref ? '<br>\uD83D\uDED2 ' + esc(o.client_ref) : '')
    + '</div>';

  var action;
  if (o.tracking_code) {
    action = '<div class="done-row"><span class="tcode">' + esc(o.tracking_code) + '</span>';
    if (o.customer_phone) {
      action += '<a class="resend-link" href="' + esc(buildWaLink(o.customer_phone, name, o.tracking_code)) + '" target="_blank">\uD83D\uDCF2 Reenviar WhatsApp</a>';
    }
    action += '</div>';
  } else {
    action = '<div class="tracking-row">'
      + '<input class="tinput" id="t-' + esc(o.id) + '" type="text" placeholder="C\u00F3digo Correios" maxlength="30">'
      + '<button class="btn-wa" data-id="' + esc(o.id) + '" data-phone="' + esc(o.customer_phone || '') + '" data-name="' + esc(name) + '" onclick="sendTracking(this)">\uD83D\uDCF2 Enviar no WhatsApp</button>'
      + '</div>';
    if (!o.customer_phone) {
      action += '<div class="no-phone">\u26A0\uFE0F Sem telefone \u2014 envie por email: ' + esc(o.customer_email) + '</div>';
    }
  }

  return '<div class="card">' + top + details + action + '</div>';
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
      '<div class="stat"><div class="stat-num">' + orders.length + '</div><div class="stat-label">Total</div></div>'
      + '<div class="stat"><div class="stat-num" style="color:#856404">' + pending + '</div><div class="stat-label">Aguardando</div></div>'
      + '<div class="stat"><div class="stat-num" style="color:#0A3622">' + done + '</div><div class="stat-label">Enviados</div></div>';

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

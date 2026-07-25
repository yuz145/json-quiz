import { json, isAdmin, safe } from '../../_utils.js';

// IPv6アドレスを8グループ・4桁16進数の完全展開形にする（"::"省略を復元）
function expandIPv6(ip) {
  if (ip.indexOf('::') === -1) {
    const groups = ip.split(':');
    if (groups.length !== 8) return null;
    return groups.map(g => g.padStart(4, '0'));
  }
  const parts = ip.split('::');
  if (parts.length !== 2) return null;
  const head = parts[0] ? parts[0].split(':') : [];
  const tail = parts[1] ? parts[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (missing < 0) return null;
  const middle = new Array(missing).fill('0');
  return [...head, ...middle, ...tail].map(g => g.padStart(4, '0'));
}

// 逆引き用のARPAドメイン名を組み立てる（IPv4は in-addr.arpa、IPv6は ip6.arpa）
function buildArpaName(ip) {
  if (ip.includes(':')) {
    const groups = expandIPv6(ip);
    if (!groups || groups.length !== 8) return null;
    const nibbles = groups.join('').split('').reverse().join('.');
    return nibbles + '.ip6.arpa';
  }
  const parts = ip.split('.');
  if (parts.length !== 4 || !parts.every(p => /^\d{1,3}$/.test(p) && Number(p) <= 255)) return null;
  return parts.reverse().join('.') + '.in-addr.arpa';
}

export const onRequestGet = safe(async ({ request, env }) => {
  if (!isAdmin(request, env)) {
    return json({ error: 'unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const ip = (url.searchParams.get('ip') || '').trim();
  if (!ip) return json({ error: 'ip query param is required' }, 400);

  const arpaName = buildArpaName(ip);
  if (!arpaName) {
    return json({ ip, hostname: null, error: '不正なIPアドレス形式のため逆引きできません' });
  }

  try {
    // Google Public DNS の DNS-over-HTTPS JSON API（無料・APIキー不要）でPTRレコードを問い合わせる
    const dohRes = await fetch('https://dns.google/resolve?name=' + encodeURIComponent(arpaName) + '&type=PTR');
    if (!dohRes.ok) {
      return json({ ip, hostname: null, error: '外部rDNS APIへの問い合わせに失敗しました（HTTP ' + dohRes.status + '）' });
    }
    const data = await dohRes.json();
    const answer = Array.isArray(data.Answer) ? data.Answer.find(a => a.type === 12) : null; // type 12 = PTR
    const hostname = answer ? answer.data.replace(/\.$/, '') : null;
    return json({
      ip,
      hostname,
      error: hostname ? null : '該当するPTRレコードが見つかりませんでした',
    });
  } catch (e) {
    return json({ ip, hostname: null, error: '外部rDNS APIの呼び出し中にエラーが発生しました: ' + e.message });
  }
});

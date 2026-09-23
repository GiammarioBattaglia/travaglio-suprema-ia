export default async function handler(req, res) {
  try {
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    if (!host) {
      return res.status(500).json({ ok: false, error: 'Missing host header' });
    }

    const upstream = await fetch(`${proto}://${host}/data/site.json`, {
      headers: { accept: 'application/json' },
      cache: 'no-store'
    });

    if (!upstream.ok) {
      return res.status(502).json({ ok: false, error: `site.json returned ${upstream.status}` });
    }

    const site = await upstream.json();
    return res.status(200).json({
      ok: true,
      current: site.current ?? null,
      archive: site.archive ?? []
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error?.message || error) });
  }
}

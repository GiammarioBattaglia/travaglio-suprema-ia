export default async function handler(req, res) {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const file = path.join(process.cwd(), 'data', 'site.json');
  const raw = await fs.readFile(file, 'utf-8');
  const site = JSON.parse(raw);
  res.status(200).json({ ok: true, current: site.current, archive: site.archive });
}

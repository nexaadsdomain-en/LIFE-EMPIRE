import crypto from 'node:crypto';

const SOURCE = 'https://www.innerscene.com/api/library/human-base-mesh-with-editable-53-bone-rig-8e7c8ab1/download';

export default async function handler(_request, response) {
  try {
    const upstream = await fetch(SOURCE, { redirect: 'follow' });
    const bytes = new Uint8Array(await upstream.arrayBuffer());
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    response.status(200).setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.end(JSON.stringify({
      upstreamStatus: upstream.status,
      upstreamType: upstream.headers.get('content-type'),
      bytes: bytes.byteLength,
      magic: Buffer.from(bytes.slice(0, 4)).toString('ascii'),
      sha256,
    }));
  } catch (error) {
    console.error(error);
    response.status(502).setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ ok: false, error: String(error?.message || error) }));
  }
}

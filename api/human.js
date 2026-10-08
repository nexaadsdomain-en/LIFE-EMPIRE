const SOURCE = 'https://www.innerscene.com/api/library/human-base-mesh-with-editable-53-bone-rig-8e7c8ab1/download';

export default async function handler(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.status(405).setHeader('Allow', 'GET, HEAD').end('Method Not Allowed');
    return;
  }

  try {
    const upstream = await fetch(SOURCE, {
      headers: { Accept: 'model/gltf-binary, application/octet-stream, */*' },
      redirect: 'follow',
    });

    if (!upstream.ok) {
      response.status(upstream.status).setHeader('Cache-Control', 'no-store').end(`Human asset upstream returned ${upstream.status}`);
      return;
    }

    const bytes = new Uint8Array(await upstream.arrayBuffer());
    response.status(200);
    response.setHeader('Content-Type', 'model/gltf-binary');
    response.setHeader('Content-Length', String(bytes.byteLength));
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.end(Buffer.from(bytes));
  } catch (error) {
    console.error('LIFE EMPIRE human proxy failed', error);
    response.status(502).setHeader('Cache-Control', 'no-store').end('Human asset proxy failed');
  }
}

// Netlify Function — Proxy OpenAI Whisper API
// La clé API reste côté serveur, jamais exposée au navigateur
exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: { message: 'OPENAI_API_KEY not set in Netlify environment variables' } })
    };
  }

  try {
    const { audioBase64, mimeType, language } = JSON.parse(event.body);
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    // Build multipart/form-data manually (no external dependencies needed)
    const boundary = '----FormBoundary' + Date.now().toString(36);
    const parts = [];

    // Audio file part
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="recording.webm"\r\nContent-Type: ${mimeType || 'audio/webm'}\r\n\r\n`,
      'utf8'
    ));
    parts.push(audioBuffer);
    parts.push(Buffer.from('\r\n', 'utf8'));

    // Model part
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n`,
      'utf8'
    ));

    // Language part (optional)
    if (language) {
      parts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${language}\r\n`,
        'utf8'
      ));
    }

    // Closing boundary
    parts.push(Buffer.from(`--${boundary}--\r\n`, 'utf8'));

    const body = Buffer.concat(parts);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: body
    });

    const data = await response.json();
    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: { message: err.message } })
    };
  }
};

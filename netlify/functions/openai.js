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
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ error: { message: 'OPENAI_API_KEY not set in Netlify environment variables' } })
          };
    }

    try {
          const contentType = event.headers['content-type'] || event.headers['Content-Type'];
          const bodyBuffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
              method: 'POST',
              headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': contentType
              },
              body: bodyBuffer
      });

      const data = await response.text();
          return {
                  statusCode: response.status,
                  headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                  },
                  body: data
          };
    } catch (err) {
          return {
                  statusCode: 500,
                  headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                  },
                  body: JSON.stringify({ error: { message: err.message } })
          };
    }
};

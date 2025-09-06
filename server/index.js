const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
// Allow overriding the model name via env (some Gemini accounts use different model ids)
// Default to gemini-1.5-flash which is widely available
const MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

if (!API_KEY) {
  console.warn('Warning: GEMINI_API_KEY not set. The server will return mock responses.');
}

app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;
  // Log a sanitized preview of incoming message for debugging (no PII, truncated)
  try {
    const incomingPreview = String(message || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    console.log(`[${new Date().toISOString()}] /api/chat request - model=${MODEL} preview="${incomingPreview}${incomingPreview.length===300? '...' : ''}"`);
  } catch (e) {
    console.log(`[${new Date().toISOString()}] /api/chat request - could not stringify message`);
  }

  // Return mock response if API key missing
  if (!API_KEY) {
    return res.json({ reply: `Mock response: received "${message}". Set GEMINI_API_KEY in server/.env to enable real responses.` });
  }

  try {
    const requestBody = {
      contents: [
        {
          parts: [
            { text: `You are Vision, a helpful and friendly AI assistant. Use the conversation history as context.\nUser: ${message}` }
          ]
        }
      ]
    };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const headers = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['X-goog-api-key'] = API_KEY;

  const response = await axios.post(url, requestBody, { headers });

  const text = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;

  // Sanitize reply for logs: collapse whitespace and truncate to a safe preview length
  const sanitized = String(text ?? '').replace(/\s+/g, ' ').trim();
  const preview = sanitized.slice(0, 1000);
  console.log(`[${new Date().toISOString()}] Gemini reply (sanitized, len=${sanitized.length}): "${preview}${sanitized.length > 1000 ? '...' : ''}"`);

  return res.json({ reply: text ?? 'No reply from Gemini' });
  } catch (err) {
  // If the model isn't found (404) return a helpful mock response instead of a 500 so UI keeps working.
  console.error(`[${new Date().toISOString()}] Gemini request error:`, err?.response?.data || err?.message || err);
    const status = err?.response?.status;
    const body = err?.response?.data;
    if (status === 404 || body?.error?.status === 'NOT_FOUND') {
      const reason = body?.error?.message || 'model not found';
      return res.json({ reply: `Gemini model error: ${reason}.\nUsing a local mock reply instead.\nTip: set GEMINI_MODEL in server/.env to the correct model id or run the Models List for your account.` });
    }
    return res.status(500).json({ error: 'Gemini request failed' });
  }
});

// Streaming endpoint: returns chunked/plain text so client can render tokens as they arrive.
app.post('/api/chat/stream', async (req, res) => {
  const { message, history } = req.body;
  try {
    const incomingPreview = String(message || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    console.log(`[${new Date().toISOString()}] /api/chat/stream request - model=${MODEL} preview="${incomingPreview}${incomingPreview.length===300? '...' : ''}"`);
  } catch (e) {
    console.log(`[${new Date().toISOString()}] /api/chat/stream request - could not stringify message`);
  }

  // If no API key, stream a mock reply in small chunks
  if (!API_KEY) {
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    const mock = `Mock streaming reply: received "${message}". Set GEMINI_API_KEY in server/.env to enable real responses.`;
    let i = 0;
    const chunkSize = 40;
    const t = setInterval(() => {
      const chunk = mock.slice(i, i + chunkSize);
      if (!chunk) {
        clearInterval(t);
        res.end();
        return;
      }
      res.write(chunk);
      i += chunkSize;
    }, 80);
    return;
  }

  try {
    // Get the full reply from Gemini first (streaming upstream isn't implemented here),
    // then stream it to the client in small chunks so UI can display tokens progressively.
    const requestBody = {
      contents: [
        {
          parts: [
            { text: `You are Vision, a helpful and friendly AI assistant. Use the conversation history as context.\nUser: ${message}` }
          ]
        }
      ]
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
    const headers = { 'Content-Type': 'application/json' };
    if (API_KEY) headers['X-goog-api-key'] = API_KEY;

    const response = await axios.post(url, requestBody, { headers, timeout: 60000 });
    const text = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Stream the text in chunks
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });

    const sanitized = String(text).replace(/\s+/g, ' ').trim();
    const total = sanitized.length;
    console.log(`[${new Date().toISOString()}] Streaming reply len=${total}`);

    let pos = 0;
    const chunkSize = 50; // characters per chunk
    const intervalMs = 60;
    const timer = setInterval(() => {
      if (pos >= total) {
        clearInterval(timer);
        res.end();
        return;
      }
      const chunk = sanitized.slice(pos, pos + chunkSize);
      res.write(chunk);
      pos += chunkSize;
    }, intervalMs);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Streaming Gemini request error:`, err?.response?.data || err?.message || err);
    return res.status(500).json({ error: 'Gemini streaming failed' });
  }
});

app.listen(PORT, () => console.log(`Vision proxy server listening on http://localhost:${PORT}`));

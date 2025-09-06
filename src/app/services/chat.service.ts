import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  // Call the local proxy server which forwards requests to Gemini.
  // Start the proxy with: cd server; npm install; copy .env.example to .env and set GEMINI_API_KEY, then npm start
  private proxyUrl = '/api/chat';

  constructor(private http: HttpClient) {}

  async sendMessage(message: string, conversationHistory: Message[]): Promise<string> {
    try {
  // Send the message and optional conversation history to the local proxy.
  const body = { message, history: conversationHistory };
  const resp: any = await this.http.post(this.proxyUrl, body).toPromise();
  return resp?.reply ?? 'No reply from server';

    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Streamed send: calls /api/chat/stream and invokes onChunk for each chunk received.
  streamMessage(message: string, conversationHistory: Message[], onChunk: (chunk: string) => void): Promise<void> {
    const url = '/api/chat/stream';
    return new Promise((resolve, reject) => {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: conversationHistory })
      }).then(async (resp) => {
        if (!resp.ok) {
          const text = await resp.text();
          reject(new Error(`Stream error: ${resp.status} ${text}`));
          return;
        }

  const reader = resp.body && resp.body.getReader ? resp.body.getReader() : undefined;
        const decoder = new TextDecoder('utf-8');
        if (!reader) {
          resolve();
          return;
        }

        // Capture reader in a local const so TypeScript knows it's defined inside the closure
        const r = reader;
        function read() {
          r.read().then(({ done, value }) => {
            if (done) {
              resolve();
              return;
            }
            const chunk = decoder.decode(value, { stream: true });
            onChunk(chunk);
            read();
          }).catch(reject);
        }

        read();
      }).catch(reject);
    });
  }
}

import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ChatService } from '../services/chat.service';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  
  messages: Message[] = [];
  newMessage: string = '';
  isLoading: boolean = false;

  constructor(private chatService: ChatService, private sanitizer: DomSanitizer) {}

  ngOnInit() {
    // Welcome message
    this.messages.push({
      role: 'assistant',
      content: 'Hi! I am Vision, your AI assistant. How can I help you today?',
      timestamp: new Date()
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  async sendMessage() {
    if (!this.newMessage.trim() || this.isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: this.newMessage,
      timestamp: new Date()
    };

    this.messages.push(userMessage);
    const messageToSend = this.newMessage;
    this.newMessage = '';
    this.isLoading = true;

    try {
      // Create assistant placeholder message and stream chunks into it
      const assistantMessage: Message = { role: 'assistant', content: '', timestamp: new Date() };
      this.messages.push(assistantMessage);

      await this.chatService.streamMessage(messageToSend, this.messages, (chunk) => {
        assistantMessage.content += chunk;
      });

    } catch (error) {
      this.messages.push({
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date()
      });
    }

    this.isLoading = false;
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // Format assistant messages for better readability
  formatMessage(content: string): SafeHtml {
    if (!content) return '';

    let formatted = content.trim();

    // Normalize Windows newlines
    formatted = formatted.replace(/\r\n?/g, '\n');

    // Fix malformed fenced code blocks like ``java ... ` (double start, single end)
    formatted = formatted.replace(/``(\w+)([\s\S]*?)(?<!`)`(?!`)/g, (_m, lang, code) => {
      const language = (lang || 'text').toLowerCase();
      const body = code.trim();
      return '\n\n' + '```' + language + '\n' + body + '\n```' + '\n\n';
    });
    // Also handle single-backtick long blocks that clearly contain multiple lines of code
    formatted = formatted.replace(/`(java|javascript|ts|typescript|json)\s+([\s\S]*?;[\s\S]*?)`/gi, (_m, lang, code) => {
      const language = (lang || 'text').toLowerCase();
      const body = code.trim();
      return '\n\n' + '```' + language + '\n' + body + '\n```' + '\n\n';
    });

    // Remove stray unmatched lone backticks at line ends
    formatted = formatted.replace(/([^`])`(\s|$)/g, '$1$2');

    // Heuristic: insert newline between tightly packed numbered list items: 1. Foo 2. Bar 3. Baz
    formatted = formatted.replace(/(\d+\.)\s+([^\n]+?)(?=\s+\d+\.)/g, (m, num, text) => `${num} ${text}\n`);

    // Insert newline before a numbered list starting mid-paragraph
    formatted = formatted.replace(/([^\n])\s+(\d+\.\s+)/g, (m, prev, start) => /[A-Za-z0-9)]$/.test(prev) ? `${prev}\n${start}` : `${prev} ${start}`);

    // Lettered list heuristic: A) Option B) Option
    formatted = formatted.replace(/([A-Z])\)\s+([^\n]+?)(?=\s+[A-Z]\)|$)/g, (m, letter, text) => `${letter}) ${text}\n`);

    // Promote lettered list markers to a unified placeholder (we'll detect later per-line)
    // (No direct replacement; handled in line parsing.)

    // Ensure each numbered list item (with potentially long description) ends with a newline
    formatted = formatted.replace(/(\d+\.)([^\d\n]+?)(?=(\s+\d+\.)|$)/g, (m, num, body) => {
      return `${num}${body.trim()}\n`;
    });

    // Insert newline before bold question-like segments starting mid-line (e.g., " ... **What ...**")
    formatted = formatted.replace(/(?<!\n)\s+(\*\*[A-Z][^*?]{2,}\?\*\*)/g, '\n$1');
    // Also newline after such bold block if followed immediately by more text without a blank line
    formatted = formatted.replace(/(\*\*[A-Z][^*?]{2,}\?\*\*)(?!\n)/g, '$1\n');

    // Normalize odd double-backtick fences appearing as ``\nlang\ncode\n``
    formatted = formatted.replace(/``\s*\n(\w+)\n([\s\S]*?)\n``/g, (_m, lang, code) => {
      return '\n\n```' + lang.toLowerCase() + '\n' + code.trim() + '\n```\n\n';
    });

    // Force standalone bold phrases to become their own paragraphs (common for headings ending with ':')
    formatted = formatted.replace(/(?<!\n)(\*\*[^*]+\*\*)(?=\s+[A-Za-z0-9])/g, '\n$1');
    formatted = formatted.replace(/(\*\*[^*]+\*\*)(?!\n)/g, '$1\n');

  // Newline before bold heading with trailing colon if embedded
  formatted = formatted.replace(/(?<!\n)\s+(\*\*[A-Z][^*]+?:\*\*)/g, '\n$1');
  formatted = formatted.replace(/(\*\*[A-Z][^*]+?:\*\*)(?!\n)/g, '$1\n');

  // Newline before roman numeral sections (I. II. III.) if inline
  formatted = formatted.replace(/(?<!\n)(\s+)([IVX]{1,4}\.)\s+(?=[A-Z])/g, '\n$2 ');

  // Newline after colon starting a list/outline
  formatted = formatted.replace(/:(\s*)(\d+\.)/g, ':\n$2');

    // Convert standalone roman numeral section lines into headings (e.g., "I. Fundamentals:" -> <h2>...)</h2>
    formatted = formatted.replace(/^([IVX]{1,4})\.\s+(.+?)(:)?$/gm, (_m, num, title, colon) => {
      // Avoid converting if line already contains HTML
      if (/<\w+/.test(title)) return _m; 
      return `<h2 class="heading-2">${num}. ${title.trim()}${colon ? ':' : ''}</h2>`;
    });

    // Stray backtick fixes BEFORE inline code handling later: wrap bare tokens followed or preceded by single unmatched backticks
    // word`
    formatted = formatted.replace(/(\b[\w\/.-]+)`(?!`)/g, '<code>$1</code>');
    // `word (leading)
    formatted = formatted.replace(/`([\w\/.-]+)(?!`)/g, '<code>$1</code>');

    // Newline before any numbered marker stuck in a sentence (fallback)
    formatted = formatted.replace(/(?<!\n)(\d+\.)(?=\s+[A-Z0-9])/g, '\n$1');

    // Collapse excessive blank lines
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

  // --- Fix: Merge isolated number lines (e.g., "12." followed by a heading) back into one line ---
  // Case with colon: 12.\nInput/Output:
  formatted = formatted.replace(/^(\d+)\.\s*\n([A-Z][^\n]{0,80}?):(?!.)/gm, '$1. $2:');
  // General case without colon: 12.\nTitle
  formatted = formatted.replace(/^(\d+)\.\s*\n([A-Z][^\n]{0,80})(?=\n)/gm, '$1. $2');

    // Fenced code blocks
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, lang, code) => {
      const language = (lang || 'text').toLowerCase();
      return `<div class=\"code-block\"><div class=\"code-header\">${language}</div><pre><code>${this.escapeHtml(code.trim())}</code></pre></div>`;
    });

    // Inline code (avoid those already inside code blocks) – keep simple
    formatted = formatted.replace(/`([^`\n]+)`/g, '<code class=\"inline-code\">$1</code>');

    // Bold & italic (order matters: bold first)
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong class=\"font-bold\">$1</strong>');
    formatted = formatted.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class=\"italic\">$1</em>');

    // Headings at start of line
    formatted = formatted.replace(/^###\s+(.+)$/gm, '<h3 class=\"heading-3\">$1</h3>');
    formatted = formatted.replace(/^##\s+(.+)$/gm, '<h2 class=\"heading-2\">$1</h2>');
    formatted = formatted.replace(/^#\s+(.+)$/gm, '<h1 class=\"heading-1\">$1</h1>');

    // Split paragraphs by blank lines (two or more newlines)
    const blocks = formatted.split(/\n{2,}/);
    const htmlBlocks: string[] = [];

    for (const block of blocks) {
      if (!block.trim()) continue;
      const lines = block.split(/\n+/);
      let listBuffer: string[] = [];
      let listType: 'ol' | 'ul' | null = null;

      const flushList = () => {
        if (listType && listBuffer.length) {
          htmlBlocks.push(`<div class=\"list-container\">${listBuffer.join('')}</div>`);
        }
        listBuffer = []; listType = null;
      };

      for (let raw of lines) {
        let line = raw.trim();
        if (!line) continue;

        // Skip if entire line is a code block wrapper already
        if (line.startsWith('<div class="code-block"')) { flushList(); htmlBlocks.push(line); continue; }
        if (/^<h[1-3]/.test(line)) { flushList(); htmlBlocks.push(line); continue; }

        // Numbered item
        let mNum = line.match(/^(\d+)\.\s+(.*)/);
        if (mNum) {
          if (listType && listType !== 'ol') flushList();
          listType = 'ol';
          listBuffer.push(`<div class=\"list-item numbered\"><span class=\"list-number\">${mNum[1]}.</span><span class=\"list-content\">${mNum[2]}</span></div>`);
          continue;
        }
        // Lettered item (A) B) ...)
        let mLet = line.match(/^([A-Z])\)\s+(.*)/);
        if (mLet) {
            if (listType && listType !== 'ol') flushList(); // treat as ordered
            listType = 'ol';
            listBuffer.push(`<div class=\"list-item numbered\"><span class=\"list-number\">${mLet[1]})</span><span class=\"list-content\">${mLet[2]}</span></div>`);
            continue;
        }
        // Bullet item (* - •)
        let mBul = line.match(/^(?:\*|-|•)\s+(.*)/);
        if (mBul) {
          if (listType && listType !== 'ul') flushList();
          listType = 'ul';
          listBuffer.push(`<div class=\"list-item bullet\"><span class=\"bullet\">•</span><span class=\"list-content\">${mBul[1]}</span></div>`);
          continue;
        }

        // Plain line
        flushList();
        htmlBlocks.push(`<p class=\"paragraph\">${line}</p>`);
      }
      flushList();
    }

    const finalHtml = htmlBlocks.join('');
    return this.sanitizer.bypassSecurityTrustHtml(finalHtml);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

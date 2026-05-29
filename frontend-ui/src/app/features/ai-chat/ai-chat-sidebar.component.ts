import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService } from '../../core/services/ai.service';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner.component';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

@Component({
  selector: 'app-ai-chat-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  template: `
    <aside class="panel flex h-full w-full flex-col p-4">
      <h3 class="mb-4 text-lg font-semibold text-cyan-200">AI Duty Assistant</h3>

      <div class="mb-3 flex-1 space-y-2 overflow-y-auto rounded-lg border border-slate-700 p-3">
        <div
          *ngFor="let msg of messages"
          class="rounded-md px-3 py-2 text-sm"
          [ngClass]="msg.role === 'user' ? 'bg-cyan-900/40' : 'bg-slate-800'"
        >
          <p class="mb-1 text-xs uppercase tracking-wide text-slate-400">{{ msg.role }}</p>
          <p class="text-slate-200">{{ msg.text }}</p>
        </div>
      </div>

      <app-loading-spinner *ngIf="loading"></app-loading-spinner>
      <p *ngIf="error" class="mb-2 text-sm text-rose-400">{{ error }}</p>

      <div class="mt-2 flex gap-2">
        <input [(ngModel)]="prompt" class="input-control" placeholder="Ask duty analysis..." />
        <button class="rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium hover:bg-cyan-500" (click)="send()">
          Send
        </button>
      </div>
    </aside>
  `
})
export class AiChatSidebarComponent {
  prompt = '';
  loading = false;
  error = '';
  messages: ChatMessage[] = [
    { role: 'assistant', text: 'Ready to assist with duty roster insights.' }
  ];

  constructor(private readonly aiService: AiService) {}

  send() {
    const text = this.prompt.trim();
    if (!text || this.loading) {
      return;
    }

    this.error = '';
    this.messages.push({ role: 'user', text });
    this.prompt = '';
    this.loading = true;

    this.aiService.sendMessage({ prompt: text }).subscribe({
      next: (response) => {
        this.messages.push({
          role: 'assistant',
          text: response || 'No response received from AI endpoint.'
        });
        this.loading = false;
      },
      error: (err: Error) => {
        this.error = err.message;
        this.messages.push({
          role: 'assistant',
          text: 'AI endpoint is unavailable. Verify backend route /api/ai/chat.'
        });
        this.loading = false;
      }
    });
  }
}

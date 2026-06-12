import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AiService } from '../../core/services/ai.service';
import { AuthService } from '../../core/services/auth.service';
import { DutyLogService } from '../../core/services/duty-log.service';
import { DutyLog } from '../../core/models/duty-log.models';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner.component';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  dutyId?: number;
  actions?: any[];
  hasDashboardAction?: boolean;
}

@Component({
  selector: 'app-ai-chat-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  template: `
    <aside class="panel flex h-full w-full flex-col p-4 bg-green-50/90 backdrop-blur border-green-700 shadow-panel animate-fade-in relative overflow-hidden">
      <!-- Header -->
      <div class="mb-4 flex items-center justify-between pb-2 border-b border-green-200/60">
        <div class="flex items-center gap-2">
          <span class="text-2xl">👨‍✈️</span>
          <div>
            <h3 class="text-lg font-extrabold text-green-950 flex items-center gap-1.5 leading-none">
              Operations Copilot
            </h3>
            <p class="text-[10px] text-green-700 font-bold uppercase mt-1">AI Cockpit Interface</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            (click)="clearChat()"
            class="rounded-lg bg-green-100 hover:bg-green-200 p-1.5 text-green-950 transition border border-green-300 flex items-center justify-center hover:scale-105 active:scale-95"
            title="Clear Chat"
          >
            🧹
          </button>
          <button
            *ngIf="!showDashboard"
            (click)="toggleDashboard(true)"
            class="rounded-lg bg-green-700 hover:bg-green-800 px-3 py-1.5 text-xs font-bold text-white transition shadow-sm border border-green-600 flex items-center gap-1 hover:scale-105 active:scale-95"
          >
            📊 Full Dashboard
          </button>
        </div>
      </div>

      <!-- Messages Stream -->
      <div #messageStream class="mb-3 flex-1 space-y-4 overflow-y-auto rounded-xl border border-green-200 bg-white/60 p-3 scrollbar-thin">
        
        <!-- Welcome Briefing / Greeting Card if no user messages yet -->
        <div *ngIf="messages.length === 0 && !loading" class="p-6 text-center space-y-4 animate-fade-in">
          <span class="text-5xl block animate-bounce">🤖</span>
          <h4 class="text-xl font-extrabold text-green-950">Welcome to your Cockpit</h4>
          <p class="text-sm text-green-800 max-w-xs mx-auto leading-relaxed">
            I am your Operations Copilot. You can query your schedule, view flight analytics, or request roster changes.
          </p>
          <div class="pt-2">
            <button
              (click)="sendSilentBriefing()"
              class="rounded-xl bg-gradient-to-r from-green-700 to-emerald-700 text-white px-4 py-2 text-xs font-bold shadow-md hover:scale-105 transition border border-green-600 active:scale-95"
            >
              💼 Generate Daily Briefing
            </button>
          </div>
        </div>

        <div
          *ngFor="let msg of messages"
          class="rounded-2xl px-4 py-3 text-sm shadow-sm transition duration-200 flex flex-col gap-1.5"
          [ngClass]="msg.role === 'user' 
            ? 'bg-gradient-to-r from-green-800 to-emerald-800 text-white rounded-tr-none ml-10 shadow-green-900/10' 
            : 'bg-white/95 text-green-950 border border-green-100 rounded-tl-none mr-10 shadow-slate-100/10'"
        >
          <div class="flex items-center justify-between text-[10px] font-extrabold tracking-wider uppercase">
            <span [ngClass]="msg.role === 'user' ? 'text-green-200' : 'text-green-800'">
              {{ msg.role === 'user' ? 'Pilot' : 'Copilot' }}
            </span>
          </div>
          <p class="whitespace-pre-line text-sm leading-relaxed">{{ msg.text }}</p>
          
          <div *ngIf="msg.hasDashboardAction" class="mt-2 pt-2 border-t border-green-200/30 flex justify-end">
            <button
              class="flex items-center gap-1.5 rounded-lg bg-green-700 hover:bg-green-800 px-3.5 py-1.5 text-xs font-bold text-white hover:scale-105 active:scale-95 transition shadow border border-green-600"
              (click)="executeActions(msg)"
            >
              🧭 Go to Dashboard
            </button>
          </div>
        </div>

        <!-- Premium Typing / Thinking Indicator -->
        <div *ngIf="loading" class="flex gap-1 bg-white/90 border border-green-100 text-green-950 rounded-2xl rounded-tl-none px-4 py-3 mr-10 w-max shadow-sm items-center animate-fade-in">
          <span class="text-[10px] font-bold text-green-800 mr-2 uppercase tracking-wide">Copilot is thinking</span>
          <div class="flex gap-1 items-center pt-0.5">
            <span class="w-1.5 h-1.5 bg-green-800 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
            <span class="w-1.5 h-1.5 bg-green-800 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
            <span class="w-1.5 h-1.5 bg-green-800 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
          </div>
        </div>
      </div>

      <p *ngIf="error" class="mb-2 text-xs text-rose-600 font-extrabold px-1">⚠️ Error: {{ error }}</p>

      <!-- Suggestion Chips -->
      <div class="mb-3 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto px-1 py-1">
        <button
          *ngFor="let chip of suggestionChips"
          class="rounded-full border border-green-400/60 bg-white/80 hover:bg-green-100 hover:text-green-950 px-3 py-1 text-[11px] font-bold text-green-900 hover:scale-105 active:scale-95 transition shadow-sm border border-green-300"
          (click)="sendQuick(chip.prompt)"
        >
          {{ chip.label }}
        </button>
      </div>

      <!-- Input Bar -->
      <div class="mt-2 flex gap-2 items-center bg-white/80 p-1.5 rounded-xl border border-green-200/80 shadow-inner">
        <input
          [(ngModel)]="prompt"
          class="w-full bg-transparent px-3 py-1.5 text-sm text-green-950 outline-none placeholder-green-700/60"
          placeholder="Ask something, e.g. Show my next duty..."
          (keyup.enter)="send()"
        />
        <button 
          class="rounded-lg bg-green-700 hover:bg-green-800 px-4 py-2 text-xs font-bold text-white hover:scale-105 active:scale-95 transition shadow shadow-green-900/30 border border-green-600 flex items-center justify-center" 
          (click)="send()"
        >
          Send
        </button>
      </div>
    </aside>
  `
})
export class AiChatSidebarComponent implements OnInit, OnDestroy {
  @ViewChild('messageStream') private messageStreamEl!: ElementRef;

  prompt = '';
  loading = false;
  error = '';
  duties: DutyLog[] = [];
  
  suggestionChips = [
    { label: '🧭 Next Duty', prompt: 'Show my next duty' },
    { label: '📅 Full Roster', prompt: 'Show my roster' },
    { label: '📈 Flight Hours', prompt: 'How many hours have I flown this month?' },
    { label: '📜 Timeline Registry', prompt: 'Show registry timeline' },
    { label: '📊 Open Analytics', prompt: 'Open analytics' },
    { label: '🏝️ Day Off', prompt: 'When is my next day off?' }
  ];

  messages: ChatMessage[] = [];
  showDashboard = true;
  private showSub?: Subscription;

  constructor(
    private readonly aiService: AiService,
    private readonly authService: AuthService,
    private readonly dutyLogService: DutyLogService,
    private readonly router: Router
  ) {
    this.loadDuties();
  }

  ngOnInit() {
    this.sendSilentBriefing();

    this.showSub = this.aiService.showDashboard$.subscribe((show) => {
      this.showDashboard = show;
    });
  }

  ngOnDestroy() {
    this.showSub?.unsubscribe();
  }

  toggleDashboard(show: boolean) {
    this.aiService.triggerShowDashboard(show);
  }

  clearChat() {
    this.messages = [];
    this.error = '';
  }

  scrollToBottom(): void {
    setTimeout(() => {
      try {
        if (this.messageStreamEl) {
          const el = this.messageStreamEl.nativeElement;
          el.scrollTop = el.scrollHeight;
        }
      } catch (err) {}
    }, 50);
  }

  sendSilentBriefing() {
    this.loading = true;
    this.error = '';
    this.scrollToBottom();
    this.aiService.sendMessage({ prompt: 'Generate daily briefing' }).subscribe({
      next: (result) => {
        let targetDutyId: number | undefined;
        let hasDashboardAction = false;
        if (result.actions && result.actions.length > 0) {
          const highlightAction = result.actions.find((act: any) => act.type === 'highlight_duty');
          if (highlightAction && highlightAction.id) {
            targetDutyId = highlightAction.id;
          }
          hasDashboardAction = result.actions.some((act: any) => 
            act.type === 'highlight_duty' || act.type.startsWith('navigate_')
          );
        }
        const newMsg: ChatMessage = {
          role: 'assistant',
          text: result.text || 'Briefing generated, but no response text returned.',
          dutyId: targetDutyId,
          actions: result.actions,
          hasDashboardAction: hasDashboardAction
        };
        this.messages.push(newMsg);
        this.loading = false;
        this.scrollToBottom();

        if (hasDashboardAction) {
          setTimeout(() => {
            this.executeActions(newMsg);
          }, 400);
        }
      },
      error: (err: Error) => {
        this.error = err.message;
        this.loading = false;
        this.scrollToBottom();
      }
    });
  }

  send() {
    const text = this.prompt.trim();
    if (!text || this.loading) {
      return;
    }

    this.error = '';
    this.messages.push({ role: 'user', text });
    this.prompt = '';
    this.loading = true;
    this.scrollToBottom();

    this.aiService.sendMessage({ prompt: text }).subscribe({
      next: (result) => {
        let targetDutyId: number | undefined;
        let hasDashboardAction = false;
        if (result.actions && result.actions.length > 0) {
          const highlightAction = result.actions.find((act: any) => act.type === 'highlight_duty');
          if (highlightAction && highlightAction.id) {
            targetDutyId = highlightAction.id;
          }
          hasDashboardAction = result.actions.some((act: any) => 
            act.type === 'highlight_duty' || act.type.startsWith('navigate_')
          );
        }

        const newMsg: ChatMessage = {
          role: 'assistant',
          text: result.text || 'No response received from AI endpoint.',
          dutyId: targetDutyId,
          actions: result.actions,
          hasDashboardAction: hasDashboardAction
        };
        this.messages.push(newMsg);

        if (result.dutiesChanged) {
          this.loadDuties();
        }

        this.loading = false;
        this.scrollToBottom();

        if (hasDashboardAction) {
          setTimeout(() => {
            this.executeActions(newMsg);
          }, 400);
        }
      },
      error: (err: Error) => {
        this.error = err.message;
        this.messages.push({
          role: 'assistant',
          text: 'AI endpoint is unavailable. Verify backend and ai-langgraph-service are running.'
        });
        this.loading = false;
        this.scrollToBottom();
      }
    });
  }

  sendQuick(text: string) {
    if (this.loading) {
      return;
    }

    this.prompt = text;
    this.send();
  }

  highlightDuty(dutyId: number) {
    if (!this.router.url.includes('/dashboard')) {
      this.router.navigate(['/dashboard']).then(() => {
        setTimeout(() => {
          this.aiService.triggerHighlightDuty(dutyId);
        }, 300);
      });
    } else {
      this.aiService.triggerHighlightDuty(dutyId);
    }
  }

  executeActions(msg: ChatMessage) {
    this.aiService.triggerShowDashboard(true);
    
    if (msg.dutyId) {
      this.highlightDuty(msg.dutyId);
    }

    if (msg.actions && msg.actions.length > 0) {
      for (const action of msg.actions) {
        if (action.type.startsWith('navigate_')) {
          const tab = action.type.replace('navigate_', '');
          if (!this.router.url.includes('/dashboard')) {
            this.router.navigate(['/dashboard']).then(() => {
              setTimeout(() => this.aiService.triggerNavigateTab(tab), 400);
            });
          } else {
            this.aiService.triggerNavigateTab(tab);
          }
        }
      }
    }
  }

  private loadDuties() {
    const source = this.authService.isAdmin()
      ? this.dutyLogService.getAll()
      : this.dutyLogService.getMyDuties();

    source.subscribe({
      next: (items) => (this.duties = items),
      error: () => (this.duties = [])
    });
  }
}

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
    <aside class="panel flex h-full w-full flex-col p-4 bg-slate-950/40 backdrop-blur-md border-slate-800 shadow-2xl animate-fade-in relative overflow-hidden">
      <!-- Header -->
      <div class="mb-4 flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div class="flex items-center gap-2">
          <span class="text-2xl">{{ isAdmin ? '💼' : '👨‍✈️' }}</span>
          <div>
            <h3 class="text-base font-extrabold text-slate-100 flex items-center gap-1.5 leading-none">
              {{ isAdmin ? 'Operations Controller' : 'Operations Copilot' }}
            </h3>
            <p class="text-[9px] text-cyan-400 font-extrabold uppercase mt-1.5 tracking-wider">
              {{ isAdmin ? 'Admin Management Terminal' : 'AI Cockpit Interface' }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            (click)="clearChat()"
            class="rounded-lg bg-slate-800/75 hover:bg-slate-700 p-1.5 text-slate-200 transition border border-slate-700/50 flex items-center justify-center hover:scale-105 active:scale-95"
            title="Clear Chat"
          >
            🧹
          </button>
          <button
            *ngIf="!showDashboard"
            (click)="toggleDashboard(true)"
            class="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 text-xs font-bold text-white transition shadow-md border border-cyan-500/30 flex items-center gap-1 hover:scale-105 active:scale-95"
          >
            📊 Full Dashboard
          </button>
        </div>
      </div>

      <!-- Messages Stream -->
      <div #messageStream class="mb-3 flex-1 space-y-4 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/10 p-3 scrollbar-thin">
        
        <!-- Welcome Briefing / Greeting Card if no user messages yet -->
        <div *ngIf="messages.length === 0 && !loading" class="p-6 text-center space-y-4 animate-fade-in">
          <span class="text-5xl block">🤖</span>
          <h4 class="text-lg font-extrabold text-slate-100">
            Welcome to your {{ isAdmin ? 'Management Console' : 'Cockpit' }}
          </h4>
          <p class="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            {{ isAdmin 
              ? 'I am your Operations Controller Assistant. You can create/modify/delete duties, check scheduling conflicts, or assign pilots via chat.' 
              : 'I am your Operations Copilot. You can query your schedule, view flight analytics, check rest limits, or request weather briefings.' 
            }}
          </p>
          <div class="pt-2">
            <button
              (click)="sendSilentBriefing()"
              class="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-2.5 text-xs font-bold shadow-md hover:scale-105 transition border border-cyan-500/20 active:scale-95"
            >
              💼 Generate {{ isAdmin ? 'Operations Briefing' : 'Daily Briefing' }}
            </button>
          </div>
        </div>

        <div
          *ngFor="let msg of messages"
          class="rounded-2xl px-4 py-3 text-sm shadow-sm transition duration-200 flex flex-col gap-1.5"
          [ngClass]="msg.role === 'user' 
            ? 'bg-gradient-to-br from-cyan-600 to-blue-700 text-white rounded-tr-none ml-10 border border-cyan-500/20 shadow-cyan-950/20' 
            : 'bg-slate-800/90 text-slate-100 border border-slate-700/50 rounded-tl-none mr-10 shadow-slate-950/30'"
        >
          <div class="flex items-center justify-between text-[9px] font-extrabold tracking-wider uppercase">
            <span [ngClass]="msg.role === 'user' ? 'text-cyan-200' : 'text-cyan-400'">
              {{ msg.role === 'user' 
                ? (isAdmin ? 'Admin' : 'Pilot') 
                : (isAdmin ? 'Controller Assistant' : 'Copilot') 
              }}
            </span>
          </div>
          <p class="whitespace-pre-line text-xs leading-relaxed">{{ msg.text }}</p>
        </div>

        <!-- Premium Typing / Thinking Indicator -->
        <div *ngIf="loading" class="flex gap-1.5 bg-slate-800/90 border border-slate-700/50 text-slate-100 rounded-2xl rounded-tl-none px-4 py-3 mr-10 w-max shadow-md items-center animate-fade-in">
          <span class="text-[9px] font-bold text-cyan-400 mr-1.5 uppercase tracking-wide">
            {{ isAdmin ? 'Assistant is coordinating' : 'Copilot is thinking' }}
          </span>
          <div class="flex gap-1 items-center pt-0.5">
            <span class="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
            <span class="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
            <span class="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
          </div>
        </div>
      </div>

      <p *ngIf="error" class="mb-2 text-xs text-rose-400 font-extrabold px-1">⚠️ {{ error }}</p>

      <!-- Suggestion Chips -->
      <div class="mb-3 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto px-1 py-1">
        <button
          *ngFor="let chip of suggestionChips"
          class="rounded-full border border-slate-700/80 bg-slate-800/60 hover:bg-slate-700 text-slate-200 hover:text-slate-100 px-3 py-1.5 text-[10px] font-bold hover:scale-105 active:scale-95 transition shadow-sm hover:border-cyan-500/50"
          (click)="sendQuick(chip.prompt)"
        >
          {{ chip.label }}
        </button>
      </div>

      <!-- Input Bar -->
      <div class="mt-1 flex gap-2 items-center bg-slate-950/75 p-1.5 rounded-xl border border-slate-800/80 shadow-inner">
        <input
          [(ngModel)]="prompt"
          class="w-full bg-transparent px-3 py-1.5 text-xs text-slate-100 outline-none placeholder-slate-500"
          [placeholder]="isAdmin ? 'Assign pilot to UA123...' : 'Ask about your schedule, weather, rest limit...'"
          (keyup.enter)="send()"
        />
        <button 
          class="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-bold text-white hover:scale-105 active:scale-95 transition shadow shadow-cyan-950/30 border border-cyan-500/30 flex items-center justify-center" 
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
  
  suggestionChips: { label: string; prompt: string }[] = [];

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

  get isAdmin() {
    return this.authService.isAdmin();
  }

  ngOnInit() {
    this.initSuggestionChips();
    this.sendSilentBriefing();

    this.showSub = this.aiService.showDashboard$.subscribe((show) => {
      this.showDashboard = show;
    });
  }

  ngOnDestroy() {
    this.showSub?.unsubscribe();
  }

  private initSuggestionChips() {
    if (this.isAdmin) {
      this.suggestionChips = [
        { label: '➕ Create Flight', prompt: 'Create flight UA100 from DXB to LHR tomorrow' },
        { label: '👥 Assign Pilot', prompt: 'Assign pilot 1 to flight UA100' },
        { label: '⚠️ Overlap Conflicts', prompt: 'Check for scheduling conflicts' },
        { label: '📜 Audit Registry', prompt: 'Show registry timeline' },
        { label: '📊 Analytics', prompt: 'Open analytics' },
        { label: '🌦️ DXB Weather', prompt: 'What is the weather at DXB?' }
      ];
    } else {
      this.suggestionChips = [
        { label: '🧭 Next Duty', prompt: 'Show my next duty' },
        { label: '📅 Full Roster', prompt: 'Show my roster' },
        { label: '📈 Flight Hours', prompt: 'How many hours have I flown this month?' },
        { label: '⚠️ Rest Gaps', prompt: 'Check for rest compliance warnings' },
        { label: '🌦️ DXB Weather', prompt: 'What is the weather at DXB?' },
        { label: '🏝️ Day Off', prompt: 'When is my next day off?' }
      ];
    }
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
        if (result.actions && result.actions.length > 0) {
          const highlightAction = result.actions.find((act: any) => act.type === 'highlight_duty');
          if (highlightAction && highlightAction.id) {
            targetDutyId = highlightAction.id;
          }
        }
        const newMsg: ChatMessage = {
          role: 'assistant',
          text: result.text || 'Briefing generated, but no response text returned.',
          dutyId: targetDutyId,
          actions: result.actions
        };
        this.messages.push(newMsg);
        this.loading = false;
        this.scrollToBottom();

        if (this.showDashboard) {
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
        if (result.actions && result.actions.length > 0) {
          const highlightAction = result.actions.find((act: any) => act.type === 'highlight_duty');
          if (highlightAction && highlightAction.id) {
            targetDutyId = highlightAction.id;
          }
        }

        const newMsg: ChatMessage = {
          role: 'assistant',
          text: result.text || 'No response received from AI endpoint.',
          dutyId: targetDutyId,
          actions: result.actions
        };
        this.messages.push(newMsg);

        if (result.dutiesChanged) {
          this.loadDuties();
        }

        this.loading = false;
        this.scrollToBottom();

        if (this.showDashboard) {
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
    if (!this.showDashboard) {
      return;
    }
    
    if (msg.dutyId) {
      this.highlightDuty(msg.dutyId);
    }

    if (msg.actions && msg.actions.length > 0) {
      for (const action of msg.actions) {
        if (action.type === 'navigate_weather') {
          const airport = action.payload?.airport || '';
          if (airport) {
            localStorage.setItem('selected_weather_airport', airport);
          }
          if (!this.router.url.includes('/dashboard')) {
            this.router.navigate(['/dashboard']).then(() => {
              setTimeout(() => this.aiService.triggerNavigateTab('weather'), 400);
            });
          } else {
            this.aiService.triggerNavigateTab('weather');
          }
        } else if (action.type.startsWith('navigate_')) {
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

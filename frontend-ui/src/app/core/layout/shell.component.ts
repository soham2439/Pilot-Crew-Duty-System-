import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { AiChatSidebarComponent } from '../../features/ai-chat/ai-chat-sidebar.component';
import { AuthService } from '../services/auth.service';
import { AiService } from '../services/ai.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, AiChatSidebarComponent],
  template: `
    <div class="grid h-screen grid-cols-12 gap-3 bg-slate-950/35 p-3 animate-fade-in">
      <!-- Sidebar Navigation Panel (Visible in dashboard mode) -->
      <aside *ngIf="showDashboard" class="panel col-span-2 flex flex-col p-4">
        <div class="mb-5 flex items-center justify-between text-xs text-slate-300">
          <span class="rounded-lg bg-cyan-500/10 border border-cyan-500/35 px-2.5 py-1.5 font-bold uppercase tracking-wider text-cyan-400 shadow-sm">
            Pilot Console
          </span>
          <button
            class="rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 px-2 py-1 text-[11px] text-slate-300 transition hover:scale-105 active:scale-95"
            (click)="logout()"
          >
            Logout
          </button>
        </div>
        <nav class="space-y-2 text-sm flex-1">
          <a
            routerLink="/dashboard"
            routerLinkActive="bg-cyan-500/15 !text-cyan-300 border-cyan-500/35"
            class="block rounded-lg border border-slate-800/80 bg-slate-900/10 px-3.5 py-2.5 font-semibold text-slate-400 hover:bg-slate-800/80 hover:text-slate-100 transition"
          >
            Dashboard
          </a>
          <a
            *ngIf="isAdmin"
            routerLink="/duty-logs"
            id="duty-logs-nav-link"
            routerLinkActive="bg-cyan-500/15 !text-cyan-300 border-cyan-500/35"
            class="block rounded-lg border border-slate-800/80 bg-slate-900/10 px-3.5 py-2.5 font-semibold !text-slate-400 hover:bg-slate-800/80 hover:!text-slate-100 transition"
          >
            Duty Logs
          </a>
          <!-- Button to switch back to Chat Cockpit (exclusive chat screen) -->
          <button
            *ngIf="!isAdmin"
            class="mt-4 w-full text-left rounded-lg bg-slate-900/10 hover:bg-cyan-500/10 hover:text-cyan-300 border border-slate-800/80 hover:border-cyan-500/30 px-3.5 py-2.5 font-semibold text-slate-400 transition flex items-center gap-1.5 shadow-sm"
            (click)="enterChatMode()"
          >
            💬 Chat Cockpit Mode
          </button>
        </nav>
      </aside>

      <!-- Main Dashboard Content Viewport (Visible in dashboard mode) -->
      <main *ngIf="showDashboard" class="col-span-7 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/40 p-6 shadow-2xl backdrop-blur-md">
        <router-outlet></router-outlet>
      </main>

      <!-- AI Chat Sidebar / Main Cockpit Workspace -->
      <section [ngClass]="showDashboard ? 'col-span-3' : 'col-span-12 lg:col-span-8 lg:col-start-2 xl:col-span-6 xl:col-start-4'" class="min-h-0 transition-all duration-300 ease-out">
        <app-ai-chat-sidebar></app-ai-chat-sidebar>
      </section>
    </div>
  `
})
export class ShellComponent implements OnInit, OnDestroy {
  showDashboard = true;
  private showSub?: Subscription;

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly aiService: AiService
  ) {}

  ngOnInit() {
    // Default to full dashboard for admin, and AI chat-only cockpit for pilots on login
    const initialShow = this.auth.isAdmin();
    this.aiService.triggerShowDashboard(initialShow);

    this.showSub = this.aiService.showDashboard$.subscribe((show) => {
      this.showDashboard = show;
    });
  }

  ngOnDestroy() {
    this.showSub?.unsubscribe();
  }

  get isAdmin() {
    return this.auth.isAdmin();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  enterChatMode() {
    this.aiService.triggerShowDashboard(false);
  }
}

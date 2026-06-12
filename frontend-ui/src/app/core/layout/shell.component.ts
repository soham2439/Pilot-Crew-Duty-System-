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
    <div class="grid h-screen grid-cols-12 gap-3 bg-green-950/80 p-3 animate-fade-in">
      <!-- Sidebar Navigation Panel (Visible in dashboard mode) -->
      <aside *ngIf="showDashboard" class="panel col-span-2 flex flex-col border-green-400 bg-green-900 p-3 shadow-panel">
        <div class="mb-4 flex items-center justify-between text-xs text-green-50">
          <span class="rounded-md bg-green-200 px-2 py-1 font-semibold uppercase tracking-wide text-green-950 shadow-sm">
            Pilot Crew Console
          </span>
          <button
            class="rounded bg-green-900/50 px-2 py-1 text-[11px] text-white hover:bg-green-900 transition"
            (click)="logout()"
          >
            Logout
          </button>
        </div>
        <nav class="space-y-2 text-sm flex-1">
          <a
            routerLink="/dashboard"
            routerLinkActive="bg-green-200 text-green-950 border-green-100"
            class="block rounded-md border-2 border-green-300 bg-green-800 px-3 py-2 font-semibold text-white hover:bg-green-200 hover:text-green-950 transition"
          >
            Dashboard
          </a>
          <a
            *ngIf="isAdmin"
            routerLink="/duty-logs"
            id="duty-logs-nav-link"
            routerLinkActive="bg-green-200 !text-green-950 border-green-100"
            class="block rounded-md border-2 border-green-300 bg-green-800 px-3 py-2 font-semibold !text-white hover:bg-green-200 hover:!text-green-950 transition"
          >
            Duty Logs
          </a>
          <!-- Button to switch back to Chat Cockpit (exclusive chat screen) -->
          <button
            *ngIf="!isAdmin"
            class="mt-4 w-full text-left rounded-md bg-green-800/60 hover:bg-green-200 hover:text-green-950 border-2 border-green-300/40 px-3 py-2 font-semibold text-white transition flex items-center gap-1 shadow-sm"
            (click)="enterChatMode()"
          >
            💬 Chat Cockpit Mode
          </button>
        </nav>
      </aside>

      <!-- Main Dashboard Content Viewport (Visible in dashboard mode) -->
      <main *ngIf="showDashboard" class="col-span-7 overflow-y-auto rounded-xl border-2 border-green-800 bg-green-50/80 p-4 shadow-panel">
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

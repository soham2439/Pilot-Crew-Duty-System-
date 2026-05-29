import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AiChatSidebarComponent } from '../../features/ai-chat/ai-chat-sidebar.component';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, AiChatSidebarComponent],
  template: `
    <div class="grid h-screen grid-cols-12 gap-3 p-3">
      <aside class="panel col-span-2 p-3 flex flex-col">
        <div class="mb-4 flex items-center justify-between text-xs text-slate-300">
          <span class="font-semibold uppercase tracking-wide text-cyan-200">Pilot Crew Console</span>
          <button
            class="rounded bg-slate-800 px-2 py-1 text-[11px] hover:bg-slate-700"
            (click)="logout()"
          >
            Logout
          </button>
        </div>
        <nav class="space-y-2 text-sm">
          <a
            routerLink="/dashboard"
            routerLinkActive="bg-slate-700 text-cyan-300"
            class="block rounded-md px-3 py-2 text-slate-300 hover:bg-slate-800"
          >
            Dashboard
          </a>
          <a
            routerLink="/duty-logs"
            routerLinkActive="bg-slate-700 text-cyan-300"
            class="block rounded-md px-3 py-2 text-slate-300 hover:bg-slate-800"
          >
            Duty Logs
          </a>
        </nav>
      </aside>

      <main class="col-span-7 overflow-y-auto rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
        <router-outlet></router-outlet>
      </main>

      <section class="col-span-3 min-h-0">
        <app-ai-chat-sidebar></app-ai-chat-sidebar>
      </section>
    </div>
  `
})
export class ShellComponent {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}

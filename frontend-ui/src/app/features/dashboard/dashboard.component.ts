import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { DutyLogService } from '../../core/services/duty-log.service';
import { DutyLog, RegistryLog } from '../../core/models/duty-log.models';
import { AuthService } from '../../core/services/auth.service';
import { AiService } from '../../core/services/ai.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mb-5 flex border-b-2 border-green-700/40 pb-2 gap-4">
      <button
        (click)="activeTab = 'roster'"
        [class]="activeTab === 'roster' ? 'border-b-2 border-green-700 font-bold text-green-950' : 'text-green-700 hover:text-green-900'"
        class="px-4 py-2 text-sm font-semibold transition outline-none"
      >
        📅 Roster Overview
      </button>
      <button
        (click)="activeTab = 'analytics'"
        [class]="activeTab === 'analytics' ? 'border-b-2 border-green-700 font-bold text-green-950' : 'text-green-700 hover:text-green-900'"
        class="px-4 py-2 text-sm font-semibold transition outline-none"
      >
        📊 Analytics & Insights
      </button>
      <button
        (click)="activeTab = 'registry'"
        [class]="activeTab === 'registry' ? 'border-b-2 border-green-700 font-bold text-green-950' : 'text-green-700 hover:text-green-900'"
        class="px-4 py-2 text-sm font-semibold transition outline-none"
      >
        📜 Registry Timeline
      </button>
    </div>

    <!-- 1. ROSTER TAB -->
    <div *ngIf="activeTab === 'roster'">
      <section *ngIf="isAdmin; else pilotDashboard" class="space-y-5">
        <div>
          <h1 class="text-2xl font-semibold text-slate-100">Admin Assignment Dashboard</h1>
          <p class="mt-1 text-sm text-slate-400">Monitor which duties are assigned, unassigned, and ready for pilots.</p>
        </div>

        <div class="grid gap-4 md:grid-cols-4">
          <div class="panel p-4">
            <p class="text-sm text-slate-400">Total Duties</p>
            <p class="mt-2 text-3xl font-bold text-cyan-300">{{ logs.length }}</p>
          </div>
          <div class="panel p-4">
            <p class="text-sm text-slate-400">Assigned Duties</p>
            <p class="mt-2 text-3xl font-bold text-emerald-300">{{ assignedCount }}</p>
          </div>
          <div class="panel p-4">
            <p class="text-sm text-slate-400">Unassigned Duties</p>
            <p class="mt-2 text-3xl font-bold text-amber-300">{{ unassignedCount }}</p>
          </div>
          <div class="panel p-4">
            <p class="text-sm text-slate-400">Flight Duties</p>
            <p class="mt-2 text-3xl font-bold text-rose-300">{{ upcomingFlightDuties.length }}</p>
          </div>
        </div>

        <p *ngIf="error" class="text-sm text-rose-400">{{ error }}</p>

        <div class="grid gap-4 lg:grid-cols-2">
          <div class="panel p-4">
            <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Needs Assignment</h2>
            <div class="space-y-2">
              <div *ngFor="let log of unassignedDuties" [attr.id]="'duty-card-' + log.id" class="rounded-md border-2 border-amber-500 bg-amber-50 p-3">
                <p class="font-semibold text-green-950">{{ log.flightNumber }} - {{ log.origin }} -> {{ log.destination }}</p>
                <p class="text-sm text-green-800">{{ log.departureTime | date: 'dd MMM, HH:mm' }} | {{ log.aircraftType }}</p>
              </div>
              <p *ngIf="!unassignedDuties.length" class="text-sm text-slate-400">All duties are assigned.</p>
            </div>
          </div>

          <div class="panel p-4">
            <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Assigned To Pilots</h2>
            <div class="space-y-2">
              <div *ngFor="let item of pilotAssignmentSummary" class="flex items-center justify-between rounded-md bg-green-100 p-3">
                <span class="font-semibold text-green-950">{{ item.name }}</span>
                <span class="rounded-full bg-green-700 px-2 py-1 text-xs font-semibold text-white">{{ item.count }} duties</span>
              </div>
              <p *ngIf="!pilotAssignmentSummary.length" class="text-sm text-slate-400">No duties assigned to pilots yet.</p>
            </div>
          </div>
        </div>

        <div class="panel overflow-hidden">
          <h2 class="p-3 text-sm font-semibold uppercase tracking-wide text-slate-300">All Assigned Duties</h2>
          <table class="min-w-full text-sm">
            <thead class="bg-slate-800 text-left text-slate-300">
              <tr>
                <th class="px-3 py-2">Duty</th>
                <th class="px-3 py-2">Flight</th>
                <th class="px-3 py-2">Route</th>
                <th class="px-3 py-2">Pilot</th>
                <th class="px-3 py-2">Times</th>
                <th class="px-3 py-2">Aircraft</th>
                <th class="px-3 py-2">Remarks</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of upcomingLogs" [attr.id]="'duty-card-' + log.id" class="border-t border-slate-700/60">
                <td class="px-3 py-2">
                  <span class="rounded-full px-2 py-1 text-xs font-semibold" [ngClass]="badgeClass(log.dutyCode)">
                    {{ log.dutyCode }}
                  </span>
                </td>
                <td class="px-3 py-2">{{ log.flightNumber }}</td>
                <td class="px-3 py-2">{{ log.origin }} -> {{ log.destination }}</td>
                <td class="px-3 py-2">{{ log.pilotName || 'Unassigned' }}</td>
                <td class="px-3 py-2">
                  {{ log.departureTime | date: 'dd MMM, HH:mm' }} - {{ log.arrivalTime | date: 'dd MMM, HH:mm' }}
                </td>
                <td class="px-3 py-2">{{ log.aircraftType }}</td>
                <td class="px-3 py-2">{{ log.remarks || '-' }}</td>
              </tr>
              <tr *ngIf="!upcomingLogs.length">
                <td colspan="7" class="px-3 py-6 text-center text-slate-400">No duties yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <ng-template #pilotDashboard>
        <section class="space-y-5">
          <div>
            <h1 class="text-2xl font-semibold text-slate-100">Pilot Duty Dashboard</h1>
            <p class="mt-1 text-sm text-slate-400">These are only the duties assigned to you.</p>
          </div>

          <p *ngIf="error" class="text-sm text-rose-400">{{ error }}</p>

          <div id="next-duty-panel" class="panel border-green-800 bg-green-100 p-5">
            <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Your Next Duty</h2>
            <div *ngIf="nextDuty; else noPilotDuty" class="space-y-3">
              <div class="flex items-center gap-3">
                <span class="rounded-full px-3 py-1 text-sm font-semibold" [ngClass]="badgeClass(nextDuty.dutyCode)">
                  {{ nextDuty.dutyCode }}
                </span>
                <span class="text-xl font-bold text-green-950">{{ nextDuty.flightNumber }}</span>
              </div>
              <p class="text-lg font-semibold text-green-900">{{ nextDuty.origin }} -> {{ nextDuty.destination }}</p>
              <p class="text-sm text-green-800">
                Report in {{ nextReportText }} | {{ nextDuty.departureTime | date: 'dd MMM, HH:mm' }} - {{ nextDuty.arrivalTime | date: 'dd MMM, HH:mm' }}
              </p>
              <p class="text-sm text-green-800">Aircraft: {{ nextDuty.aircraftType }}</p>
              <p class="text-sm text-green-800">Remarks: {{ nextDuty.remarks || '-' }}</p>
            </div>
            <ng-template #noPilotDuty>
              <p class="text-sm text-slate-400">No duty has been assigned to you yet.</p>
            </ng-template>
          </div>

          <div class="grid gap-4 md:grid-cols-3">
            <div class="panel p-4">
              <p class="text-sm text-slate-400">My Duties</p>
              <p class="mt-2 text-3xl font-bold text-cyan-300">{{ logs.length }}</p>
            </div>
            <div class="panel p-4">
              <p class="text-sm text-slate-400">Flight Duties</p>
              <p class="mt-2 text-3xl font-bold text-emerald-300">{{ upcomingFlightDuties.length }}</p>
            </div>
            <div class="panel p-4">
              <p class="text-sm text-slate-400">Unavailable / Off</p>
              <p class="mt-2 text-3xl font-bold text-rose-300">{{ unavailableCount }}</p>
            </div>
          </div>

          <div class="grid gap-3">
            <div *ngFor="let log of upcomingLogs" [attr.id]="'duty-card-' + log.id" class="panel flex items-center justify-between p-4">
              <div>
                <div class="flex items-center gap-2">
                  <span class="rounded-full px-2 py-1 text-xs font-semibold" [ngClass]="badgeClass(log.dutyCode)">
                    {{ log.dutyCode }}
                  </span>
                  <span class="font-semibold text-green-950">{{ log.flightNumber }}</span>
                </div>
                <p class="mt-1 text-sm text-green-800">{{ log.origin }} -> {{ log.destination }} | {{ log.aircraftType }}</p>
              </div>
              <div class="text-right text-sm text-green-800">
                <p>{{ log.departureTime | date: 'dd MMM, HH:mm' }}</p>
                <p>{{ log.arrivalTime | date: 'dd MMM, HH:mm' }}</p>
              </div>
            </div>
            <p *ngIf="!upcomingLogs.length" class="panel p-6 text-center text-sm text-slate-400">No assigned duties yet.</p>
          </div>
        </section>
      </ng-template>
    </div>

    <!-- 2. ANALYTICS TAB -->
    <div *ngIf="activeTab === 'analytics'" class="space-y-5">
      <div>
        <h1 class="text-2xl font-semibold text-slate-100">📊 Analytics & Roster Insights</h1>
        <p class="mt-1 text-sm text-slate-400">Analytics calculated from your active duty schedule.</p>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <!-- Flight Hours Card -->
        <div class="panel p-5 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-600">
          <h3 class="font-bold text-green-900 text-lg mb-2">⏱️ Monthly Flight Hours</h3>
          <p class="text-green-800 text-xs mb-3">Total hours flown in the current calendar month.</p>
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-extrabold text-green-950">{{ thisMonthFlightHours | number: '1.1-1' }}</span>
            <span class="text-sm text-green-800">/ 100 hrs limit</span>
          </div>
          <div class="w-full bg-green-200/50 rounded-full h-2.5 mt-4">
            <div class="bg-emerald-600 h-2.5 rounded-full" [style.width.%]="mathMin(thisMonthFlightHours, 100)"></div>
          </div>
        </div>

        <!-- Aircraft Usage Card -->
        <div class="panel p-5 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-600">
          <h3 class="font-bold text-blue-900 text-lg mb-2">✈️ Aircraft Utilization</h3>
          <p class="text-blue-800 text-xs mb-3">Breakdown of flight duties by aircraft model type.</p>
          <div class="space-y-2 mt-2">
            <div *ngFor="let item of aircraftUsageSummary" class="flex justify-between items-center text-sm text-green-950">
              <span class="font-bold">{{ item.type }}</span>
              <span>{{ item.count }} flight(s) ({{ item.hours | number: '1.1-1' }} hrs)</span>
            </div>
            <p *ngIf="!aircraftUsageSummary.length" class="text-slate-500 text-xs">No aircraft usage data found.</p>
          </div>
        </div>

        <!-- Delay Analysis Card -->
        <div class="panel p-5 bg-gradient-to-br from-rose-500/10 to-orange-500/10 border-rose-600">
          <h3 class="font-bold text-rose-900 text-lg mb-2">⚠️ Delay Analysis</h3>
          <p class="text-rose-800 text-xs mb-3">Operations logs flagged with delayed remarks.</p>
          <div class="flex items-baseline gap-2 mb-2">
            <span class="text-3xl font-extrabold text-rose-700">{{ delayCount }}</span>
            <span class="text-sm text-rose-800">delayed flight(s)</span>
          </div>
          <p class="text-xs text-rose-700 font-semibold" *ngIf="upcomingFlightDuties.length">
            Current Delay Rate: {{ (delayCount / upcomingFlightDuties.length * 100) | number: '1.0-0' }}%
          </p>
        </div>

        <!-- Roster statistics Card -->
        <div class="panel p-5 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-600">
          <h3 class="font-bold text-amber-900 text-lg mb-2">📈 Roster Completion</h3>
          <p class="text-amber-800 text-xs mb-3">Completed vs. scheduled duties in history.</p>
          <div class="flex items-baseline gap-2 mb-2">
            <span class="text-3xl font-extrabold text-amber-800">{{ completionRate | number: '1.0-0' }}%</span>
            <span class="text-sm text-amber-800">completion rate</span>
          </div>
          <p class="text-xs text-amber-800">
            Completed: {{ completedCount }} | Scheduled: {{ logs.length }}
          </p>
        </div>
      </div>
    </div>

    <!-- 3. REGISTRY TIMELINE TAB -->
    <div *ngIf="activeTab === 'registry'" class="space-y-5">
      <div>
        <h1 class="text-2xl font-semibold text-slate-100">📜 Audit Log & Registry Timeline</h1>
        <p class="mt-1 text-sm text-slate-400">Chronological history of changes, scheduling adjustments, and assignments.</p>
      </div>

      <div class="space-y-3">
        <div *ngFor="let item of registryLogs" class="panel p-4 flex gap-3 items-start border-l-4 bg-white/60" [ngClass]="getRegistryBorderClass(item.action)">
          <div class="text-xl pt-0.5">{{ getRegistryIcon(item.action) }}</div>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <span class="rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-green-950 bg-green-200">
                {{ item.action }}
              </span>
              <span class="text-[11px] text-green-700 font-medium">{{ item.timestamp | date: 'dd MMM yyyy, HH:mm:ss' }}</span>
            </div>
            <p class="text-sm text-green-950 font-bold mt-1">Flight: {{ item.flightNumber }}</p>
            <p class="text-sm text-green-900 mt-1">{{ item.details }}</p>
            <p class="text-xs text-green-700 mt-1 font-semibold">Actor: <span class="text-green-950 font-bold">{{ item.actorName }}</span></p>
          </div>
        </div>
        <p *ngIf="!registryLogs.length" class="panel p-6 text-center text-sm text-slate-400">No registry history records found.</p>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  logs: DutyLog[] = [];
  error = '';
  dutyCodes = ['FDUT', 'DOFF', 'VAC', 'SICK', 'AVBL'];

  activeTab: 'roster' | 'analytics' | 'registry' = 'roster';
  registryLogs: RegistryLog[] = [];

  private highlightSub?: Subscription;
  private navigateSub?: Subscription;
  private pendingHighlightId: number | null = null;

  constructor(
    private readonly dutyLogService: DutyLogService,
    private readonly authService: AuthService,
    private readonly aiService: AiService
  ) {}

  ngOnInit(): void {
    this.fetchData();

    this.highlightSub = this.aiService.highlightDuty$.subscribe((dutyId) => {
      if (this.logs && this.logs.length > 0) {
        this.highlightDuty(dutyId);
      } else {
        this.pendingHighlightId = dutyId;
      }
    });

    this.navigateSub = this.aiService.navigateTab$.subscribe((tab) => {
      if (['roster', 'analytics', 'registry'].includes(tab)) {
        this.activeTab = tab as any;
        if (tab === 'registry') {
          this.fetchRegistry();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.highlightSub?.unsubscribe();
    this.navigateSub?.unsubscribe();
  }

  fetchData() {
    const source = this.isAdmin ? this.dutyLogService.getAll() : this.dutyLogService.getMyDuties();
    source.subscribe({
      next: (items) => {
        this.logs = items;
        if (this.pendingHighlightId) {
          const id = this.pendingHighlightId;
          this.pendingHighlightId = null;
          setTimeout(() => this.highlightDuty(id), 200);
        }
      },
      error: (err: Error) => {
        this.error = err.message;
        this.logs = [];
      }
    });

    this.fetchRegistry();
  }

  fetchRegistry() {
    this.dutyLogService.getRegistry().subscribe({
      next: (items) => (this.registryLogs = items),
      error: () => (this.registryLogs = [])
    });
  }

  highlightDuty(dutyId: number) {
    document.querySelectorAll('.pulse-highlight').forEach((el) => {
      el.classList.remove('pulse-highlight');
    });

    if (this.nextDuty && this.nextDuty.id === dutyId) {
      const panelEl = document.getElementById('next-duty-panel');
      if (panelEl) {
        panelEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        panelEl.classList.add('pulse-highlight');
        setTimeout(() => panelEl.classList.remove('pulse-highlight'), 4500);
        return;
      }
    }

    const cardEl = document.getElementById(`duty-card-${dutyId}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      cardEl.classList.add('pulse-highlight');
      setTimeout(() => cardEl.classList.remove('pulse-highlight'), 4500);
    }
  }

  get upcomingLogs() {
    return [...this.logs].sort(
      (a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
    );
  }

  get isAdmin() {
    return this.authService.isAdmin();
  }

  get nextDuty() {
    const now = Date.now();
    return this.upcomingLogs.find((item) => new Date(item.departureTime).getTime() >= now) ?? null;
  }

  get nextReportText() {
    if (!this.nextDuty) {
      return '-';
    }

    const hours = Math.max(0, Math.round((new Date(this.nextDuty.departureTime).getTime() - Date.now()) / 36e5));
    return `${hours}h`;
  }

  get upcomingFlightDuties() {
    return this.upcomingLogs.filter((item) => item.dutyCode === 'FDUT');
  }

  get unavailableCount() {
    return this.logs.filter((item) => ['SICK', 'VAC', 'DOFF'].includes(item.dutyCode)).length;
  }

  get unassignedCount() {
    return this.logs.filter((item) => !item.pilotId).length;
  }

  get assignedCount() {
    return this.logs.length - this.unassignedCount;
  }

  get unassignedDuties() {
    return this.upcomingLogs.filter((item) => !item.pilotId);
  }

  get pilotAssignmentSummary() {
    const summary = new Map<string, number>();

    this.logs.forEach((item) => {
      if (!item.pilotName) {
        return;
      }

      summary.set(item.pilotName, (summary.get(item.pilotName) ?? 0) + 1);
    });

    return [...summary.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  // --- ANALYTICS GETTERS ---

  get thisMonthFlightHours(): number {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let total = 0;
    this.logs.forEach(log => {
      if (log.dutyCode === 'FDUT') {
        const dep = new Date(log.departureTime);
        const arr = new Date(log.arrivalTime);
        if (dep.getMonth() === currentMonth && dep.getFullYear() === currentYear) {
          total += (arr.getTime() - dep.getTime()) / 36e5;
        }
      }
    });
    return total;
  }

  get completedCount(): number {
    const now = Date.now();
    return this.logs.filter(log => new Date(log.arrivalTime).getTime() < now).length;
  }

  get completionRate(): number {
    if (!this.logs.length) return 0;
    return (this.completedCount / this.logs.length) * 100;
  }

  get delayCount(): number {
    return this.logs.filter(log => (log.remarks ?? '').toLowerCase().includes('delay')).length;
  }

  get aircraftUsageSummary() {
    const usage = new Map<string, { count: number; hours: number }>();
    this.logs.forEach(log => {
      if (log.dutyCode === 'FDUT' && log.aircraftType && log.aircraftType !== '-') {
        const type = log.aircraftType.trim().toUpperCase();
        const dep = new Date(log.departureTime);
        const arr = new Date(log.arrivalTime);
        const hrs = (arr.getTime() - dep.getTime()) / 36e5;
        const current = usage.get(type) ?? { count: 0, hours: 0 };
        current.count += 1;
        current.hours += hrs;
        usage.set(type, current);
      }
    });
    return Array.from(usage.entries()).map(([type, stats]) => ({
      type,
      count: stats.count,
      hours: stats.hours
    }));
  }

  mathMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  // --- TIMELINE REGISTRY FORMATTERS ---

  getRegistryIcon(action: string): string {
    switch ((action ?? '').toLowerCase()) {
      case 'created': return '➕';
      case 'updated': return '✏️';
      case 'deleted': return '❌';
      case 'assigned': return '👤';
      case 'unassigned': return '🔓';
      default: return '📝';
    }
  }

  getRegistryBorderClass(action: string): string {
    switch ((action ?? '').toLowerCase()) {
      case 'created': return 'border-l-emerald-500';
      case 'updated': return 'border-l-blue-500';
      case 'deleted': return 'border-l-rose-500';
      case 'assigned': return 'border-l-amber-500';
      case 'unassigned': return 'border-l-slate-400';
      default: return 'border-l-green-700';
    }
  }

  badgeClass(code: string) {
    const palette: Record<string, string> = {
      FDUT: 'bg-emerald-500/20 text-emerald-300',
      DOFF: 'bg-violet-500/20 text-violet-300',
      VAC: 'bg-amber-500/20 text-amber-300',
      SICK: 'bg-rose-500/20 text-rose-300',
      AVBL: 'bg-sky-500/20 text-sky-300'
    };
    return palette[code] ?? 'bg-slate-600/20 text-slate-200';
  }
}

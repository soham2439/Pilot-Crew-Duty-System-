import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DutyLogService } from '../../core/services/duty-log.service';
import { DutyLog } from '../../core/models/duty-log.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="space-y-5">
      <div>
        <h1 class="text-2xl font-semibold text-slate-100">My Duty Dashboard</h1>
        <p class="mt-1 text-sm text-slate-400">Your assigned roster from operations.</p>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <div class="panel p-4">
          <p class="text-sm text-slate-400">Assigned Duties</p>
          <p class="mt-2 text-3xl font-bold text-cyan-300">{{ logs.length }}</p>
        </div>
        <div class="panel p-4">
          <p class="text-sm text-slate-400">Next Flight Duties</p>
          <p class="mt-2 text-3xl font-bold text-emerald-300">{{ upcomingFlightDuties.length }}</p>
        </div>
        <div class="panel p-4">
          <p class="text-sm text-slate-400">Unavailable Duties</p>
          <p class="mt-2 text-3xl font-bold text-rose-300">{{ unavailableCount }}</p>
        </div>
      </div>

      <p *ngIf="error" class="text-sm text-rose-400">{{ error }}</p>

      <div class="panel overflow-hidden">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-800 text-left text-slate-300">
            <tr>
              <th class="px-3 py-2">Duty</th>
              <th class="px-3 py-2">Flight</th>
              <th class="px-3 py-2">Route</th>
              <th class="px-3 py-2">Times</th>
              <th class="px-3 py-2">Aircraft</th>
              <th class="px-3 py-2">Remarks</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let log of upcomingLogs" class="border-t border-slate-700/60">
              <td class="px-3 py-2">
                <span class="rounded-full px-2 py-1 text-xs font-semibold" [ngClass]="badgeClass(log.dutyCode)">
                  {{ log.dutyCode }}
                </span>
              </td>
              <td class="px-3 py-2">{{ log.flightNumber }}</td>
              <td class="px-3 py-2">{{ log.origin }} -> {{ log.destination }}</td>
              <td class="px-3 py-2">
                {{ log.departureTime | date: 'dd MMM, HH:mm' }} - {{ log.arrivalTime | date: 'dd MMM, HH:mm' }}
              </td>
              <td class="px-3 py-2">{{ log.aircraftType }}</td>
              <td class="px-3 py-2">{{ log.remarks || '-' }}</td>
            </tr>
            <tr *ngIf="!upcomingLogs.length">
              <td colspan="6" class="px-3 py-6 text-center text-slate-400">No assigned duties yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `
})
export class DashboardComponent implements OnInit {
  logs: DutyLog[] = [];
  error = '';

  constructor(private readonly dutyLogService: DutyLogService) {}

  ngOnInit(): void {
    this.dutyLogService.getMyDuties().subscribe({
      next: (items) => (this.logs = items),
      error: (err: Error) => {
        this.error = err.message;
        this.logs = [];
      }
    });
  }

  get upcomingLogs() {
    return [...this.logs].sort(
      (a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
    );
  }

  get upcomingFlightDuties() {
    return this.upcomingLogs.filter((item) => item.dutyCode === 'FDUT');
  }

  get unavailableCount() {
    return this.logs.filter((item) => ['SICK', 'VAC', 'DOFF'].includes(item.dutyCode)).length;
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

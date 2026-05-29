import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DutyLogService } from '../../core/services/duty-log.service';
import { DutyLog } from '../../core/models/duty-log.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section>
      <h1 class="mb-4 text-2xl font-semibold text-slate-100">Operations Dashboard</h1>
      <div class="grid gap-4 md:grid-cols-3">
        <div class="panel p-4">
          <p class="text-sm text-slate-400">Total Logs</p>
          <p class="mt-2 text-3xl font-bold text-cyan-300">{{ logs.length }}</p>
        </div>
        <div class="panel p-4">
          <p class="text-sm text-slate-400">Flight Duties</p>
          <p class="mt-2 text-3xl font-bold text-emerald-300">{{ countBy('FDUT') }}</p>
        </div>
        <div class="panel p-4">
          <p class="text-sm text-slate-400">Unavailable (SICK)</p>
          <p class="mt-2 text-3xl font-bold text-rose-300">{{ countBy('SICK') }}</p>
        </div>
      </div>
    </section>
  `
})
export class DashboardComponent implements OnInit {
  logs: DutyLog[] = [];

  constructor(private readonly dutyLogService: DutyLogService) {}

  ngOnInit(): void {
    this.dutyLogService.getAll().subscribe({
      next: (items) => (this.logs = items),
      error: () => (this.logs = [])
    });
  }

  countBy(code: string) {
    return this.logs.filter((item) => item.dutyCode === code).length;
  }
}

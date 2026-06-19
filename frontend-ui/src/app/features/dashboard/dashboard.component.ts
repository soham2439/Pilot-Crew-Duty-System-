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
    <div class="mb-5 flex border-b border-slate-800 pb-2 gap-4">
      <button
        (click)="activeTab = 'roster'"
        [class]="activeTab === 'roster' ? 'border-b-2 border-cyan-500 font-bold text-cyan-400' : 'text-slate-400 hover:text-slate-200'"
        class="px-4 py-2 text-sm font-semibold transition outline-none"
      >
        📅 Roster Overview
      </button>
      <button
        (click)="activeTab = 'analytics'"
        [class]="activeTab === 'analytics' ? 'border-b-2 border-cyan-500 font-bold text-cyan-400' : 'text-slate-400 hover:text-slate-200'"
        class="px-4 py-2 text-sm font-semibold transition outline-none"
      >
        📊 Analytics & Insights
      </button>
      <button
        (click)="activeTab = 'registry'"
        [class]="activeTab === 'registry' ? 'border-b-2 border-cyan-500 font-bold text-cyan-400' : 'text-slate-400 hover:text-slate-200'"
        class="px-4 py-2 text-sm font-semibold transition outline-none"
      >
        📜 Registry Timeline
      </button>
      <button
        (click)="activeTab = 'weather'"
        [class]="activeTab === 'weather' ? 'border-b-2 border-cyan-500 font-bold text-cyan-400' : 'text-slate-400 hover:text-slate-200'"
        class="px-4 py-2 text-sm font-semibold transition outline-none"
      >
        🌦️ Weather Briefing
      </button>
    </div>

    <!-- 1. ROSTER TAB -->
    <div *ngIf="activeTab === 'roster'">
      <section *ngIf="isAdmin; else pilotDashboard" class="space-y-5">
        <div>
          <h1 class="text-2xl font-bold text-slate-100">Admin Assignment Dashboard</h1>
          <p class="mt-1 text-sm text-slate-400">Monitor which duties are assigned, unassigned, and ready for pilots.</p>
        </div>

        <div class="grid gap-4 md:grid-cols-4">
          <div class="panel p-5">
            <p class="text-sm text-slate-400 font-medium">Total Duties</p>
            <p class="mt-2 text-3xl font-extrabold text-cyan-400 tracking-tight">{{ logs.length }}</p>
          </div>
          <div class="panel p-5">
            <p class="text-sm text-slate-400 font-medium">Assigned Duties</p>
            <p class="mt-2 text-3xl font-extrabold text-emerald-400 tracking-tight">{{ assignedCount }}</p>
          </div>
          <div class="panel p-5">
            <p class="text-sm text-slate-400 font-medium">Unassigned Duties</p>
            <p class="mt-2 text-3xl font-extrabold text-amber-400 tracking-tight">{{ unassignedCount }}</p>
          </div>
          <div class="panel p-5">
            <p class="text-sm text-slate-400 font-medium">Flight Duties</p>
            <p class="mt-2 text-3xl font-extrabold text-rose-400 tracking-tight">{{ upcomingFlightDuties.length }}</p>
          </div>
        </div>

        <p *ngIf="error" class="text-sm text-rose-400 font-semibold">⚠️ {{ error }}</p>

        <div class="grid gap-4 lg:grid-cols-2">
          <div class="panel p-5">
            <h2 class="mb-4 text-sm font-extrabold uppercase tracking-wider text-slate-400">Needs Assignment</h2>
            <div class="space-y-3">
              <div *ngFor="let log of unassignedDuties" [attr.id]="'duty-card-' + log.id" class="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-sm hover:border-amber-500/50 transition">
                <p class="font-bold text-amber-300">{{ log.flightNumber }} - {{ log.origin }} &rarr; {{ log.destination }}</p>
                <p class="text-sm text-amber-400/80 mt-1">{{ log.departureTime | date: 'dd MMM, HH:mm' }} | {{ log.aircraftType }}</p>
              </div>
              <p *ngIf="!unassignedDuties.length" class="text-sm text-slate-500">All duties are assigned.</p>
            </div>
          </div>

          <div class="panel p-5">
            <h2 class="mb-4 text-sm font-extrabold uppercase tracking-wider text-slate-400">Assigned To Pilots</h2>
            <div class="space-y-3">
              <div *ngFor="let item of pilotAssignmentSummary" class="flex items-center justify-between rounded-xl bg-slate-900/50 border border-slate-800/60 p-4">
                <span class="font-bold text-slate-200">{{ item.name }}</span>
                <span class="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-xs font-bold text-cyan-400">{{ item.count }} duties</span>
              </div>
              <p *ngIf="!pilotAssignmentSummary.length" class="text-sm text-slate-500">No duties assigned to pilots yet.</p>
            </div>
          </div>
        </div>

        <div class="panel overflow-hidden">
          <h2 class="p-4 text-sm font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800/80">All Assigned Duties</h2>
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead class="bg-slate-900/60 text-left text-slate-300">
                <tr>
                  <th class="px-4 py-3 font-semibold">Duty</th>
                  <th class="px-4 py-3 font-semibold">Flight</th>
                  <th class="px-4 py-3 font-semibold">Route</th>
                  <th class="px-4 py-3 font-semibold">Pilot</th>
                  <th class="px-4 py-3 font-semibold">Times</th>
                  <th class="px-4 py-3 font-semibold">Aircraft</th>
                  <th class="px-4 py-3 font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/40">
                <tr *ngFor="let log of upcomingLogs" [attr.id]="'duty-card-' + log.id" class="hover:bg-slate-800/20 transition border-t border-slate-800/40">
                  <td class="px-4 py-3">
                    <span class="rounded-full px-2.5 py-1 text-xs font-bold" [ngClass]="badgeClass(log.dutyCode)">
                      {{ log.dutyCode }}
                    </span>
                  </td>
                  <td class="px-4 py-3 font-semibold text-slate-200">{{ log.flightNumber }}</td>
                  <td class="px-4 py-3 text-slate-300">{{ log.origin }} &rarr; {{ log.destination }}</td>
                  <td class="px-4 py-3 font-medium text-slate-200">{{ log.pilotName || 'Unassigned' }}</td>
                  <td class="px-4 py-3 text-slate-300">
                    {{ log.departureTime | date: 'dd MMM, HH:mm' }} - {{ log.arrivalTime | date: 'dd MMM, HH:mm' }}
                  </td>
                  <td class="px-4 py-3 text-slate-300">{{ log.aircraftType }}</td>
                  <td class="px-4 py-3 text-slate-400 italic">{{ log.remarks || '-' }}</td>
                </tr>
                <tr *ngIf="!upcomingLogs.length">
                  <td colspan="7" class="px-4 py-8 text-center text-slate-500">No duties scheduled yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <ng-template #pilotDashboard>
        <section class="space-y-5">
          <div>
            <h1 class="text-2xl font-bold text-slate-100">Pilot Duty Dashboard</h1>
            <p class="mt-1 text-sm text-slate-400">These are only the duties assigned to you.</p>
          </div>

          <p *ngIf="error" class="text-sm text-rose-400 font-semibold">⚠️ {{ error }}</p>

          <div id="next-duty-panel" class="panel border-emerald-500/20 bg-emerald-950/10 p-5 shadow-lg hover:border-emerald-500/40 transition">
            <h2 class="mb-4 text-xs font-extrabold uppercase tracking-wider text-slate-400">Your Next Duty</h2>
            <div *ngIf="nextDuty; else noPilotDuty" class="space-y-3.5">
              <div class="flex items-center gap-3">
                <span class="rounded-full px-2.5 py-1 text-xs font-bold" [ngClass]="badgeClass(nextDuty.dutyCode)">
                  {{ nextDuty.dutyCode }}
                </span>
                <span class="text-xl font-extrabold text-slate-100 tracking-tight">{{ nextDuty.flightNumber }}</span>
              </div>
              <p class="text-lg font-bold text-emerald-400">{{ nextDuty.origin }} &rarr; {{ nextDuty.destination }}</p>
              <div class="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                <p class="flex items-center gap-1.5"><span class="text-slate-500">Report:</span> <span class="font-bold text-emerald-300">in {{ nextReportText }}</span></p>
                <p class="flex items-center gap-1.5"><span class="text-slate-500">Timing:</span> <span>{{ nextDuty.departureTime | date: 'dd MMM, HH:mm' }} - {{ nextDuty.arrivalTime | date: 'dd MMM, HH:mm' }}</span></p>
                <p class="flex items-center gap-1.5"><span class="text-slate-500">Aircraft:</span> <span>{{ nextDuty.aircraftType }}</span></p>
                <p class="flex items-center gap-1.5"><span class="text-slate-500">Remarks:</span> <span class="italic text-slate-400">{{ nextDuty.remarks || '-' }}</span></p>
              </div>
            </div>
            <ng-template #noPilotDuty>
              <p class="text-sm text-slate-500">No duty has been assigned to you yet.</p>
            </ng-template>
          </div>

          <div class="grid gap-4 md:grid-cols-3">
            <div class="panel p-5">
              <p class="text-sm text-slate-400 font-medium">My Duties</p>
              <p class="mt-2 text-3xl font-extrabold text-cyan-400 tracking-tight">{{ logs.length }}</p>
            </div>
            <div class="panel p-5">
              <p class="text-sm text-slate-400 font-medium">Flight Duties</p>
              <p class="mt-2 text-3xl font-extrabold text-emerald-400 tracking-tight">{{ upcomingFlightDuties.length }}</p>
            </div>
            <div class="panel p-5">
              <p class="text-sm text-slate-400 font-medium">Unavailable / Off</p>
              <p class="mt-2 text-3xl font-extrabold text-rose-400 tracking-tight">{{ unavailableCount }}</p>
            </div>
          </div>

          <div class="grid gap-3">
            <div *ngFor="let log of upcomingLogs" [attr.id]="'duty-card-' + log.id" class="panel flex items-center justify-between p-4 hover:border-slate-700/80 hover:bg-slate-900/10 transition">
              <div>
                <div class="flex items-center gap-2.5">
                  <span class="rounded-full px-2 py-0.5 text-xs font-bold" [ngClass]="badgeClass(log.dutyCode)">
                    {{ log.dutyCode }}
                  </span>
                  <span class="font-bold text-slate-200">{{ log.flightNumber }}</span>
                </div>
                <p class="mt-1 text-sm text-slate-400">{{ log.origin }} &rarr; {{ log.destination }} | {{ log.aircraftType }}</p>
              </div>
              <div class="text-right text-xs text-slate-400 font-semibold space-y-0.5">
                <p class="text-slate-200 font-bold">DEP: {{ log.departureTime | date: 'dd MMM, HH:mm' }}</p>
                <p>ARR: {{ log.arrivalTime | date: 'dd MMM, HH:mm' }}</p>
              </div>
            </div>
            <p *ngIf="!upcomingLogs.length" class="panel p-8 text-center text-sm text-slate-500">No assigned duties yet.</p>
          </div>
        </section>
      </ng-template>
    </div>

    <!-- 2. ANALYTICS TAB -->
    <div *ngIf="activeTab === 'analytics'" class="space-y-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-100">📊 Analytics & Roster Insights</h1>
        <p class="mt-1 text-sm text-slate-400">Analytics calculated from your active duty schedule.</p>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <!-- Flight Hours Card -->
        <div class="panel p-5 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-500/30">
          <h3 class="font-bold text-emerald-400 text-lg mb-2 flex items-center gap-1.5">⏱️ Monthly Flight Hours</h3>
          <p class="text-slate-400 text-xs mb-3">Total hours flown in the current calendar month.</p>
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-extrabold text-slate-100">{{ thisMonthFlightHours | number: '1.1-1' }}</span>
            <span class="text-sm text-slate-400">/ 100 hrs limit</span>
          </div>
          <div class="w-full bg-slate-800/80 rounded-full h-2 mt-4 overflow-hidden border border-slate-700/30">
            <div class="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full" [style.width.%]="mathMin(thisMonthFlightHours, 100)"></div>
          </div>
        </div>

        <!-- Aircraft Usage Card -->
        <div class="panel p-5 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border-cyan-500/30">
          <h3 class="font-bold text-cyan-400 text-lg mb-2 flex items-center gap-1.5">✈️ Aircraft Utilization</h3>
          <p class="text-slate-400 text-xs mb-3">Breakdown of flight duties by aircraft model type.</p>
          <div class="space-y-2.5 mt-2 max-h-40 overflow-y-auto">
            <div *ngFor="let item of aircraftUsageSummary" class="flex justify-between items-center text-sm text-slate-300">
              <span class="font-bold text-slate-200">{{ item.type }}</span>
              <span class="text-slate-400">{{ item.count }} flight(s) (<strong class="text-cyan-400 font-semibold">{{ item.hours | number: '1.1-1' }} hrs</strong>)</span>
            </div>
            <p *ngIf="!aircraftUsageSummary.length" class="text-slate-500 text-xs italic">No aircraft usage data found.</p>
          </div>
        </div>

        <!-- Delay Analysis Card -->
        <div class="panel p-5 bg-gradient-to-br from-rose-500/5 to-orange-500/5 border-rose-500/30">
          <h3 class="font-bold text-rose-400 text-lg mb-2 flex items-center gap-1.5">⚠️ Delay Analysis</h3>
          <p class="text-slate-400 text-xs mb-3">Operations logs flagged with delayed remarks.</p>
          <div class="flex items-baseline gap-2 mb-2">
            <span class="text-3xl font-extrabold text-rose-500">{{ delayCount }}</span>
            <span class="text-sm text-slate-400">delayed flight(s)</span>
          </div>
          <p class="text-xs text-rose-400 font-semibold" *ngIf="upcomingFlightDuties.length">
            Current Delay Rate: {{ (delayCount / upcomingFlightDuties.length * 100) | number: '1.0-0' }}%
          </p>
        </div>

        <!-- Roster statistics Card -->
        <div class="panel p-5 bg-gradient-to-br from-amber-500/5 to-yellow-500/5 border-amber-500/30">
          <h3 class="font-bold text-amber-400 text-lg mb-2 flex items-center gap-1.5">📈 Roster Completion</h3>
          <p class="text-slate-400 text-xs mb-3">Completed vs. scheduled duties in history.</p>
          <div class="flex items-baseline gap-2 mb-2">
            <span class="text-3xl font-extrabold text-amber-400">{{ completionRate | number: '1.0-0' }}%</span>
            <span class="text-sm text-slate-400">completion rate</span>
          </div>
          <p class="text-xs text-slate-400">
            Completed: <strong class="text-slate-200">{{ completedCount }}</strong> | Scheduled: <strong class="text-slate-200">{{ logs.length }}</strong>
          </p>
        </div>
      </div>
    </div>

    <!-- 3. REGISTRY TIMELINE TAB -->
    <div *ngIf="activeTab === 'registry'" class="space-y-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-100">📜 Audit Log & Registry Timeline</h1>
        <p class="mt-1 text-sm text-slate-400">Chronological history of changes, scheduling adjustments, and assignments.</p>
      </div>

      <div class="space-y-3.5">
        <div *ngFor="let item of registryLogs" class="panel p-4 flex gap-4 items-start border-l-4 bg-slate-900/10" [ngClass]="getRegistryBorderClass(item.action)">
          <div class="text-xl pt-0.5">{{ getRegistryIcon(item.action) }}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <span class="rounded px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider text-slate-200 bg-slate-800/80 border border-slate-700/50">
                {{ item.action }}
              </span>
              <span class="text-[11px] text-slate-400 font-semibold">{{ item.timestamp | date: 'dd MMM yyyy, HH:mm:ss' }}</span>
            </div>
            <p class="text-sm text-slate-200 font-bold mt-2">Flight: <span class="text-cyan-400 font-extrabold">{{ item.flightNumber }}</span></p>
            <p class="text-sm text-slate-300 mt-1 leading-relaxed">{{ item.details }}</p>
            <p class="text-xs text-slate-400 mt-2 font-medium">Actor: <span class="text-slate-200 font-bold">{{ item.actorName }}</span></p>
          </div>
        </div>
        <p *ngIf="!registryLogs.length" class="panel p-8 text-center text-sm text-slate-500">No registry history records found.</p>
      </div>
    </div>

    <!-- 4. WEATHER TAB -->
    <div *ngIf="activeTab === 'weather'" class="space-y-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-100">🌦️ Airport Weather Briefing</h1>
        <p class="mt-1 text-sm text-slate-400">Current meteorology (METAR) and conditions for major destinations.</p>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <!-- Airport Select list -->
        <div class="panel p-4 md:col-span-1">
          <h3 class="font-bold text-slate-200 text-sm mb-3">Select Airport</h3>
          <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
            <button
              *ngFor="let item of weatherAirports"
              (click)="selectWeatherAirport(item.code)"
              [class]="selectedAirport === item.code ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-bold' : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-800/50'"
              class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-xs text-left transition"
            >
              <span>{{ item.city }} ({{ item.code }})</span>
              <span class="text-[10px] uppercase font-bold text-slate-500">{{ item.condition }}</span>
            </button>
          </div>
        </div>

        <!-- Selected Airport Details -->
        <div class="panel p-5 md:col-span-2 bg-gradient-to-br from-slate-900/60 to-slate-950/40 border-slate-800 flex flex-col justify-between min-h-[300px]">
          <div *ngIf="activeWeatherData; else noWeatherSelect" class="space-y-4">
            <div class="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h2 class="text-xl font-black text-slate-100 tracking-tight">{{ selectedAirportCity }} International</h2>
                <p class="text-xs text-slate-400 font-semibold tracking-wider mt-0.5">IATA: {{ selectedAirport }} | ICAO: {{ activeWeatherData.icao }}</p>
              </div>
              <span class="text-4xl block">{{ getWeatherEmoji(activeWeatherData.condition) }}</span>
            </div>

            <div class="grid gap-4 sm:grid-cols-2 text-xs">
              <div class="p-3 bg-slate-900/30 border border-slate-800/60 rounded-xl space-y-1">
                <span class="text-slate-500 block font-medium">Temperature</span>
                <span class="text-xl font-bold text-slate-200">{{ activeWeatherData.temp }}°C</span>
              </div>
              <div class="p-3 bg-slate-900/30 border border-slate-800/60 rounded-xl space-y-1">
                <span class="text-slate-500 block font-medium">Condition</span>
                <span class="text-xl font-bold text-slate-200">{{ activeWeatherData.condition }}</span>
              </div>
              <div class="p-3 bg-slate-900/30 border border-slate-800/60 rounded-xl space-y-1">
                <span class="text-slate-500 block font-medium">Winds</span>
                <span class="text-xl font-bold text-slate-200">{{ activeWeatherData.wind }}</span>
              </div>
              <div class="p-3 bg-slate-900/30 border border-slate-800/60 rounded-xl space-y-1">
                <span class="text-slate-500 block font-medium">Visibility</span>
                <span class="text-xl font-bold text-slate-200">{{ activeWeatherData.visibility }}</span>
              </div>
            </div>

            <div class="pt-3">
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">METAR (Raw Meteorological Report)</h4>
              <div class="p-3 bg-slate-950/80 border border-slate-800 rounded-xl font-mono text-[11px] text-cyan-300 select-all leading-relaxed whitespace-pre-wrap">
                {{ activeWeatherData.metar }}
              </div>
            </div>
          </div>
          <ng-template #noWeatherSelect>
            <div class="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2">
              <span class="text-4xl">🌦️</span>
              <h3 class="font-bold text-slate-200 text-sm">No Airport Selected</h3>
              <p class="text-slate-400 text-xs max-w-xs leading-relaxed">Select an airport from the list on the left, or ask the chatbot for a weather update.</p>
            </div>
          </ng-template>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  logs: DutyLog[] = [];
  error = '';
  dutyCodes = ['FDUT', 'DOFF', 'VAC', 'SICK', 'AVBL'];

  activeTab: 'roster' | 'analytics' | 'registry' | 'weather' = 'roster';
  registryLogs: RegistryLog[] = [];

  weatherAirports = [
    { code: 'DXB', city: 'Dubai', icao: 'OMDB', condition: 'Sunny', temp: 39, wind: '11kt N', visibility: '10km+', metar: 'OMDB 180800Z 35011KT 9999 FEW030 39/22 Q1008 NOSIG' },
    { code: 'DOH', city: 'Doha', icao: 'OTBD', condition: 'Clear', temp: 37, wind: '9kt NE', visibility: '10km+', metar: 'OTBD 180800Z 04009KT 9999 SKC 37/24 Q1007 NOSIG' },
    { code: 'MAA', city: 'Chennai', icao: 'VOMM', condition: 'Scattered Clouds', temp: 31, wind: '14kt SW', visibility: '8km', metar: 'VOMM 180800Z 22014KT 8000 FEW025 SCT100 31/26 Q1005 NOSIG' },
    { code: 'BOM', city: 'Mumbai', icao: 'VABB', condition: 'Monsoon Rain', temp: 28, wind: '18kt W', visibility: '4km', metar: 'VABB 180800Z 26018KT 4000 RA SCT015 BKN080 28/25 Q1004 TEMPO 3000' },
    { code: 'DEL', city: 'Delhi', icao: 'VIDP', condition: 'Haze', temp: 42, wind: '5kt NW', visibility: '3km', metar: 'VIDP 180800Z 31005KT 3000 HZ NSC 42/20 Q1006 NOSIG' },
    { code: 'LHR', city: 'London', icao: 'EGLL', condition: 'Showers', temp: 17, wind: '12kt WSW', visibility: '10km', metar: 'EGLL 180800Z 24012KT 9999 -SHRA BKN020 17/11 Q1013 NOSIG' },
    { code: 'SIN', city: 'Singapore', icao: 'WSSS', condition: 'Thunderstorms', temp: 30, wind: '8kt S', visibility: '6km', metar: 'WSSS 180800Z 18008KT 6000 TSRA FEW018CB BKN080 30/25 Q1009 TEMPO 3000' },
    { code: 'AUH', city: 'Abu Dhabi', icao: 'OMAA', condition: 'Sunny', temp: 38, wind: '10kt N', visibility: '10km+', metar: 'OMAA 180800Z 36010KT 9999 SKC 38/21 Q1008 NOSIG' },
    { code: 'RUH', city: 'Riyadh', icao: 'OERK', condition: 'Clear', temp: 41, wind: '15kt NE', visibility: '10km+', metar: 'OERK 180800Z 05015KT 9999 SKC 41/12 Q1006 NOSIG' },
    { code: 'JED', city: 'Jeddah', icao: 'OEJN', condition: 'Clear', temp: 36, wind: '12kt NW', visibility: '10km+', metar: 'OEJN 180800Z 31012KT 9999 SKC 36/23 Q1007 NOSIG' },
    { code: 'CAI', city: 'Cairo', icao: 'HECA', condition: 'Sunny', temp: 34, wind: '7kt N', visibility: '10km+', metar: 'HECA 180800Z 36007KT 9999 SKC 34/18 Q1012 NOSIG' },
    { code: 'IST', city: 'Istanbul', icao: 'LTFM', condition: 'Clear', temp: 26, wind: '14kt NE', visibility: '10km+', metar: 'LTFM 180800Z 04014KT 9999 SKC 26/15 Q1015 NOSIG' }
  ];
  selectedAirport = 'DXB';

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
      if (['roster', 'analytics', 'registry', 'weather'].includes(tab)) {
        this.activeTab = tab as any;
        if (tab === 'registry') {
          this.fetchRegistry();
        } else if (tab === 'weather') {
          const stored = localStorage.getItem('selected_weather_airport');
          if (stored) {
            this.selectedAirport = stored.toUpperCase();
            localStorage.removeItem('selected_weather_airport');
          }
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

  // --- WEATHER METHODS ---

  getWeatherEmoji(cond: string): string {
    const c = (cond ?? '').toLowerCase();
    if (c.includes('sun') || c.includes('clear')) return '☀️';
    if (c.includes('rain') || c.includes('shower')) return '🌧️';
    if (c.includes('cloud')) return '⛅';
    if (c.includes('storm')) return '⛈️';
    if (c.includes('haze') || c.includes('fog')) return '🌫️';
    return '☀️';
  }

  get activeWeatherData() {
    return this.weatherAirports.find(x => x.code === this.selectedAirport) || null;
  }
  
  get selectedAirportCity() {
    return this.activeWeatherData?.city || '';
  }

  selectWeatherAirport(code: string) {
    this.selectedAirport = code;
  }
}

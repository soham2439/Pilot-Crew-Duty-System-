import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { DutyLog, DutyLogPayload } from '../../core/models/duty-log.models';
import { DutyLogService } from '../../core/services/duty-log.service';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner.component';

@Component({
  selector: 'app-duty-logs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoadingSpinnerComponent],
  templateUrl: './duty-logs.component.html'
})
export class DutyLogsComponent implements OnInit {
  logs: DutyLog[] = [];
  loading = false;
  error = '';
  showModal = false;
  editingId: number | null = null;

  dutyCodes = ['FDUT', 'DOFF', 'VAC', 'SICK', 'AVBL'];

  form = this.fb.nonNullable.group(
    {
      dutyCode: ['FDUT', [Validators.required]],
      flightNumber: ['', [Validators.required]],
      origin: ['', [Validators.required]],
      destination: ['', [Validators.required]],
      departureTime: ['', [Validators.required]],
      arrivalTime: ['', [Validators.required]],
      aircraftType: ['', [Validators.required]],
      remarks: ['']
    },
    { validators: [this.routeValidation(), this.timeValidation()] }
  );

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: DutyLogService
  ) {}

  ngOnInit(): void {
    this.fetchLogs();
  }

  fetchLogs() {
    this.loading = true;
    this.error = '';
    this.service.getAll().subscribe({
      next: (data) => {
        this.logs = data;
        this.loading = false;
      },
      error: (err: Error) => {
        this.error = err.message;
        this.loading = false;
      }
    });
  }

  openCreate() {
    this.editingId = null;
    this.form.reset({
      dutyCode: 'FDUT',
      flightNumber: '',
      origin: '',
      destination: '',
      departureTime: '',
      arrivalTime: '',
      aircraftType: '',
      remarks: ''
    });
    this.showModal = true;
  }

  openEdit(log: DutyLog) {
    this.editingId = log.id;
    this.form.patchValue({
      dutyCode: log.dutyCode,
      flightNumber: log.flightNumber,
      origin: log.origin,
      destination: log.destination,
      departureTime: this.toInputDateTime(log.departureTime),
      arrivalTime: this.toInputDateTime(log.arrivalTime),
      aircraftType: log.aircraftType,
      remarks: log.remarks
    });
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: DutyLogPayload = this.form.getRawValue();
    if (this.editingId) {
      this.service.update(this.editingId, payload).subscribe({
        next: () => {
          this.fetchLogs();
          this.showModal = false;
        },
        error: (err: Error) => (this.error = err.message)
      });
      return;
    }

    this.service.create(payload).subscribe({
      next: () => {
        this.fetchLogs();
        this.showModal = false;
      },
      error: (err: Error) => (this.error = err.message)
    });
  }

  remove(id: number) {
    const ok = window.confirm('Delete this duty log entry?');
    if (!ok) {
      return;
    }

    this.service.delete(id).subscribe({
      next: () => this.fetchLogs(),
      error: (err: Error) => (this.error = err.message)
    });
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

  private toInputDateTime(value: string): string {
    const d = new Date(value);
    const pad = (v: number) => `${v}`.padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private routeValidation(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const origin = (control.get('origin')?.value as string | undefined)?.trim()?.toUpperCase();
      const destination = (control.get('destination')?.value as string | undefined)
        ?.trim()
        ?.toUpperCase();
      return origin && destination && origin === destination ? { sameRoute: true } : null;
    };
  }

  private timeValidation(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const departure = control.get('departureTime')?.value as string | undefined;
      const arrival = control.get('arrivalTime')?.value as string | undefined;
      if (!departure || !arrival) {
        return null;
      }

      return new Date(arrival) <= new Date(departure) ? { invalidTimeRange: true } : null;
    };
  }
}

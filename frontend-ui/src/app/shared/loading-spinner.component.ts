import { Component } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `
    <div class="flex items-center gap-2 text-cyan-300">
      <span class="h-4 w-4 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent"></span>
      <span class="text-sm">Loading...</span>
    </div>
  `
})
export class LoadingSpinnerComponent {}

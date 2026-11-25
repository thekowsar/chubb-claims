import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/** Thin wrapper over MatSnackBar so components and interceptors don't configure it each time. */
@Injectable({ providedIn: 'root' })
export class NotifyService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 3000, panelClass: 'notify-success' });
  }

  error(message: string): void {
    this.snackBar.open(message, 'Dismiss', { duration: 6000, panelClass: 'notify-error' });
  }
}

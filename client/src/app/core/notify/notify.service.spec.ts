import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotifyService } from './notify.service';

describe('NotifyService', () => {
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let service: NotifyService;

  beforeEach(() => {
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    TestBed.configureTestingModule({ providers: [{ provide: MatSnackBar, useValue: snackBar }] });
    service = TestBed.inject(NotifyService);
  });

  it('success opens a short snackbar', () => {
    service.success('Saved');
    expect(snackBar.open).toHaveBeenCalledWith('Saved', 'OK', jasmine.objectContaining({ duration: 3000 }));
  });

  it('error opens a longer snackbar', () => {
    service.error('Failed');
    expect(snackBar.open).toHaveBeenCalledWith('Failed', 'Dismiss', jasmine.objectContaining({ duration: 6000 }));
  });
});

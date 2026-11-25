import { FormControl, FormGroup } from '@angular/forms';
import { applyServerErrors } from './apply-server-errors';

describe('applyServerErrors (T13)', () => {
  it('maps details[].field onto controls and returns the rest for the banner', () => {
    const form = new FormGroup({ incidentDate: new FormControl('x'), estimatedAmount: new FormControl(0) });

    const unmatched = applyServerErrors(form, [
      { field: 'incidentDate', message: 'must not be in the future' },
      { field: 'unknownField', message: 'is odd' },
      { field: null, message: 'Something general' },
    ]);

    expect(form.controls.incidentDate.getError('server')).toBe('must not be in the future');
    expect(form.controls.incidentDate.touched).toBeTrue();
    expect(form.controls.estimatedAmount.errors).toBeNull();
    expect(unmatched).toEqual(['unknownField: is odd', 'Something general']);
  });
});

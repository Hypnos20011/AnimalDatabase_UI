import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage } from './api-error';

describe('apiErrorMessage', () => {
  it('shows a plain text answer from the API', () => {
    const error = new HttpErrorResponse({ status: 503, error: 'Editing is turned off.' });
    expect(apiErrorMessage(error, 'Failed')).toBe('Editing is turned off.');
  });

  it('joins the messages of a validation problem', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { title: 'Invalid', errors: { WeightGramsMin: ['Weight: too big.'], Url: ['Bad link.'] } },
    });
    expect(apiErrorMessage(error, 'Failed')).toBe('Weight: too big. Bad link.');
  });

  it('falls back when the API gives no reason', () => {
    expect(apiErrorMessage(new HttpErrorResponse({ status: 0 }), 'Failed')).toBe('Failed');
    expect(apiErrorMessage(new Error('down'), 'Failed')).toBe('Failed');
  });
});

import { 
  AbstractControl, 
  AsyncValidatorFn, 
  ValidationErrors, 
  ValidatorFn 
} from "@angular/forms";
import { catchError, map, of } from "rxjs";
import { Authentication } from "../core/authentication";

/**
 * ✅ Vérifie que password et confirm_password correspondent
 */
export const matchPasswords: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirm = control.get('confirm_password')?.value;

  if (password && confirm && password !== confirm) {
    return { passwordsMismatch: true };
  }
  return null;
};

/**
 * ✅ Vérifie (via API) que le username ou le phone n’existe pas déjà
 */
export function uniqueFieldValidator(
  auth: Authentication,
  field: 'username' | 'phone'
): AsyncValidatorFn {
  return (control: AbstractControl) => {
    const value = control.value;
    if (!value) return of(null);
    return auth.checkAvailability(field, value).pipe(
      map((res) => (res.exists ? { [field + 'Taken']: true } : null)),
      catchError(() => of(null))
    );
  };
}
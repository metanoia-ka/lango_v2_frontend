import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'xofCurrency'
})
export class XofCurrencyPipe implements PipeTransform {

  transform(value: number | string): string {
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numericValue)) {
      return 'F CFA 0';
    }

    // Utilisation de l’anglais US pour forcer la virgule comme séparateur des milliers
    const formattedValue = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numericValue);

    return `F CFA ${formattedValue}`;
  }
}

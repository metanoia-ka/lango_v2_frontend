import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: 'dateFr'
})
export class DateFrPipe implements PipeTransform {

  private months = [
    'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ];

  transform(value: any, ...args: any[]) {
      if (!value) return '';

      const date = new Date(value);
      const day = date.getDate();
      const month = this.months[date.getMonth()];
      const year = date.getFullYear();

      return `${day} ${month} ${year}`;
  }
}
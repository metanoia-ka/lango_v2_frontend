import { inject, Pipe, PipeTransform } from "@angular/core";
import { formatDistanceToNow, Locale, parseISO } from "date-fns";
import { fr, enUS, ru, zhCN, ro } from 'date-fns/locale';
import { Language } from "../components/language/service/language";


@Pipe({
  name: 'relativeTime',
  pure: false
})
export class RelativeTimePipe implements PipeTransform {

  private locales: Record<string, Locale> = {
    fr,
    en: enUS,
    ru,
    zh: zhCN,
    ro
  };

  private langService = inject(Language);

  transform(value: string | Date | null): string {

    if (value === null || value === undefined) {
      return '';
    }

    if (!value) return '';
    const date = typeof value === 'string' ? parseISO(value) : value;

    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }
    const lang = this.langService.getLanguage();
    const locale = this.locales[lang] || fr;
    
    return formatDistanceToNow(date, { addSuffix: true, locale });
  }
}

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'stringToColor',
  standalone: true
})
export class StringToColorPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '#008753';
    
    // Générer une couleur basée sur la string
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = value.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convertir en couleur pastel
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 50%)`;
  }
}
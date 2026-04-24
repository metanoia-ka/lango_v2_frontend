import { 
  Directive, 
  ElementRef, 
  EventEmitter, 
  Input, OnDestroy, 
  OnInit, 
  Output 
} from '@angular/core';

@Directive({
  selector: '[appInfiniteScroll]',
  standalone: true,
})
export class InfiniteScrollDirective implements OnInit, OnDestroy {
  @Input() threshold = 200; // px avant la fin pour déclencher
  @Input() disabled = false;
  @Output() scrolled = new EventEmitter<void>();
  
  private observer: IntersectionObserver | null = null;
  
  constructor(private elementRef: ElementRef) {}
  
  ngOnInit(): void {
    this.createObserver();
  }
  
  ngOnDestroy(): void {
    this.destroyObserver();
  }
  
  private createObserver(): void {
    const options = {
      root: null,
      rootMargin: `0px 0px ${this.threshold}px 0px`,
      threshold: 0.1,
    };
    
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.disabled) {
          this.scrolled.emit();
        }
      });
    }, options);
    
    this.observer.observe(this.elementRef.nativeElement);
  }
  
  private destroyObserver(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}
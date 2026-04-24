import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Language, } from '../service/language';
import { FormsModule } from '@angular/forms';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbDropdownModule],
  templateUrl: './language-selector.html',
  styleUrl: './language-selector.scss'
})
export class LanguageSelector implements OnInit {

  selectedLang = 'fr';
  languages = [
    { code: 'fr', label: 'Français 🇫🇷' },
    { code: 'en', label: 'English 🇺🇸' },
    //{ code: 'ru', label: 'Русский 🇷🇺' },
    { code: 'zh', label: '中文 🇨🇳' },
    //{ code: 'ro', label: 'Română 🇷🇴' }
  ];

  private langService = inject(Language);

  ngOnInit(): void {
    this.langService.loadLanguage();
    this.selectedLang = this.langService.getLanguage();
  }

  changeLang(lang: string) {
    this.selectedLang = lang;
    this.langService.setLanguage(lang);
  }

}

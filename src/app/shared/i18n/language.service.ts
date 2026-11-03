import { Injectable, signal } from '@angular/core';
import { DEFAULT_LANGUAGE, isLanguage, Language } from './languages';
import { TranslationKey } from './en';
import { DICTIONARIES } from './dictionaries';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  constructor() {
    document.documentElement.lang = this.language();
  }

  language = signal<Language>(this.readStoredLanguage());
  setLanguage(lang: Language) {
    this.language.set(lang);
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
  }

  private readStoredLanguage(): Language {
    const stored = localStorage.getItem('language');
    if (isLanguage(stored)) {
      return stored;
    } else {
      return DEFAULT_LANGUAGE;
    }
  }

  public t(key: TranslationKey, params?: Record<string, string | number>): string {
    let text = DICTIONARIES[this.language()][key];
    if (params) {
      Object.entries(params).forEach(([paramName, paramValue]) => {
        text = text.replaceAll(`{${paramName}}`, String(paramValue));
      });
    }
    return text;
  }
}

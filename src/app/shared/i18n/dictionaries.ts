import { Language } from './languages';
import { en, TranslationKey } from './en';
import { de } from './de';
import { fr } from './fr';

export const DICTIONARIES: Record<Language, Record<TranslationKey, string>> = {en, de, fr};

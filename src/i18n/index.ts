import { ui as es } from './es';
import { ui as en } from './en';

export type Lang = 'es' | 'en';

const translations = { es, en };

export function getTranslations(lang: Lang) {
  return translations[lang];
}

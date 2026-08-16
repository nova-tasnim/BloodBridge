import i18n from '../i18n';

export function getCurrentLanguageName() {
  return i18n.resolvedLanguage === 'bn' ? 'Bangla' : 'English';
}

import { useTranslation } from 'react-i18next';

export default function LanguageToggle() {
  const { i18n } = useTranslation();

  const currentLanguage = i18n.resolvedLanguage || i18n.language;
  const isBangla = currentLanguage === 'bn';

  const toggleLanguage = () => {
    i18n.changeLanguage(isBangla ? 'en' : 'bn');
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="language-toggle"
      title={isBangla ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
    >
      {isBangla ? 'English' : 'বাংলা'}
    </button>
  );
}

import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import heroImage from '../assets/heroBloodCell.svg';
export default function Hero({ onPrimaryAction, onSecondaryAction }) {
  const { t } = useTranslation();

  return (
    <motion.section
      className="bb-hero"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <div className="bb-hero-content">
        <span className="bb-hero-eyebrow">
          <span className="dot" />
          {t('hero.eyebrow')}
        </span>

        <h1>
          {t('hero.titleStart')} <span>{t('hero.titleHighlight')}</span>
        </h1>

        <p>{t('hero.subtitle')}</p>

        <div className="bb-hero-actions">
          <button className="bb-btn-light" onClick={onPrimaryAction}>
            {t('hero.ctaPrimary')}
          </button>
          <button className="bb-btn-ghost" onClick={onSecondaryAction}>
            {t('hero.ctaSecondary')}
          </button>
        </div>
      </div>

      <motion.div
        className="bb-hero-image"
        initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <img src={heroImage} alt="BloodBridge" />
      </motion.div>
    </motion.section>
  );
}

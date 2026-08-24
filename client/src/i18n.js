import i18n from 'i18next';

import {
  initReactI18next
} from 'react-i18next';

import LanguageDetector from
  'i18next-browser-languagedetector';


function setNestedValue(
  target,
  dottedKey,
  value
) {
  const parts =
    dottedKey.split('.');

  let current =
    target;

  for (
    let index = 0;
    index <
      parts.length -
        1;
    index += 1
  ) {
    const part =
      parts[index];

    if (
      !current[part] ||
      typeof current[part] !==
        'object' ||
      Array.isArray(
        current[part]
      )
    ) {
      current[part] = {};
    }

    current =
      current[part];
  }

  current[
    parts[
      parts.length -
        1
    ]
  ] =
    value;
}

function buildNestedResources(
  flatResources
) {
  const nested = {};

  for (
    const [
      key,
      value
    ]
    of Object.entries(
      flatResources || {}
    )
  ) {
    setNestedValue(
      nested,
      key,
      value
    );
  }

  return nested;
}

/*

| Load translations from BloodBridge backend/database

*/

async function loadTranslationResources() {
  const response =
    await fetch(
      '/api/translations/resources'
    );

  if (!response.ok) {
    throw new Error(
      'Failed to load translations from BloodBridge database'
    );
  }

  const payload =
    await response.json();

  const flatResources =
    payload?.data || {
      en: {},
      bn: {}
    };

  return {
    en:
      buildNestedResources(
        flatResources.en
      ),

    bn:
      buildNestedResources(
        flatResources.bn
      )
  };
}

/*

| Initialize i18next

*/

export async function initializeI18n() {
  let resources;

  try {
    resources =
      await loadTranslationResources();
  } catch (err) {
    /*
     * App still starts if backend is temporarily unavailable.
     *
     * This is only a graceful fallback, NOT a local translation feature.
     */
    console.error(
      'Unable to load database translations:',
      err
    );

    resources = {
      en: {},
      bn: {}
    };
  }

  await i18n
    .use(
      LanguageDetector
    )
    .use(
      initReactI18next
    )
    .init({
      resources: {
        en: {
          translation:
            resources.en
        },

        bn: {
          translation:
            resources.bn
        }
      },

      fallbackLng:
        'en',

      interpolation: {
        escapeValue:
          false
      },

      detection: {
        order: [
          'localStorage',
          'navigator'
        ],

        caches: [
          'localStorage'
        ]
      }
    });

  return i18n;
}

/*

| Reload live translations after Admin changes them
*/
export async function reloadTranslations() {
  const resources =
    await loadTranslationResources();

  i18n.addResourceBundle(
    'en',
    'translation',
    resources.en,
    true,
    true
  );

  i18n.addResourceBundle(
    'bn',
    'translation',
    resources.bn,
    true,
    true
  );

  /*
   * Force components using useTranslation() to update.
   */
  await i18n.changeLanguage(
    i18n.language
  );
}

export default i18n;
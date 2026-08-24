require('dotenv').config();

const mongoose =
  require('mongoose');

const fs =
  require('fs');

const path =
  require('path');

const Translation =
  require('../models/Translation');



function flattenObject(
  input,
  prefix = '',
  output = {}
) {
  for (
    const [
      key,
      value
    ]
    of Object.entries(
      input
    )
  ) {
    const fullKey =
      prefix
        ? `${prefix}.${key}`
        : key;

    /*
     * Arrays stay intact.
     *
     * This is required for things like:
     * inspiration.quotes
     */
    if (
      value &&
      typeof value ===
        'object' &&
      !Array.isArray(value)
    ) {
      flattenObject(
        value,
        fullKey,
        output
      );
    } else {
      output[fullKey] =
        value;
    }
  }

  return output;
}

async function seedTranslations() {
  try {
    if (
      !process.env.MONGO_URI
    ) {
      throw new Error(
        'MONGO_URI is missing from .env'
      );
    }

    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log(
      'Connected to MongoDB'
    );


    const englishPath =
      path.resolve(
        __dirname,
        '../../client/src/locales/en/translation.json'
      );

    const banglaPath =
      path.resolve(
        __dirname,
        '../../client/src/locales/bn/translation.json'
      );

    if (
      !fs.existsSync(
        englishPath
      )
    ) {
      throw new Error(
        `English translation file not found: ${englishPath}`
      );
    }

    if (
      !fs.existsSync(
        banglaPath
      )
    ) {
      throw new Error(
        `Bangla translation file not found: ${banglaPath}`
      );
    }

    const english =
      JSON.parse(
        fs.readFileSync(
          englishPath,
          'utf8'
        ).replace(
          /^\uFEFF/,
          ''
        )
      );

    const bangla =
      JSON.parse(
        fs.readFileSync(
          banglaPath,
          'utf8'
        ).replace(
          /^\uFEFF/,
          ''
        )
      );

    const flatEnglish =
      flattenObject(
        english
      );

    const flatBangla =
      flattenObject(
        bangla
      );

    const allKeys =
      new Set([
        ...Object.keys(
          flatEnglish
        ),
        ...Object.keys(
          flatBangla
        )
      ]);

    let created = 0;
    let updated = 0;

    for (
      const key
      of allKeys
    ) {
      const en =
        flatEnglish[key];

      const bn =
        flatBangla[key];

      /*
       * Only seed complete bilingual entries.
       *
       * If one side is missing, log it so you can correct the source JSON.
       */
      if (
        en === undefined ||
        bn === undefined
      ) {
        console.warn(
          `Skipped incomplete key: ${key}`
        );

        continue;
      }

      const category =
        key.includes('.')
          ? key.split('.')[0]
          : 'general';

      const existing =
        await Translation.findOne({
          key
        });

      if (existing) {
        existing.category =
          category;

        existing.translations = {
          en,
          bn
        };

        existing.markModified(
          'translations'
        );

        await existing.save();

        updated += 1;
      } else {
        await Translation.create({
          key,
          category,

          translations: {
            en,
            bn
          }
        });

        created += 1;
      }
    }

    console.log('');
    console.log(
      'Translation seed complete.'
    );

    console.log({
      created,
      updated,
      totalKeys:
        allKeys.size
    });
  } catch (err) {
    console.error(
      'TRANSLATION SEED FAILED:'
    );

    console.error(
      err.message
    );

    process.exitCode = 1;
  } finally {
    if (
      mongoose.connection
        .readyState !== 0
    ) {
      await mongoose.disconnect();

      console.log(
        'Disconnected from MongoDB'
      );
    }
  }
}

seedTranslations();
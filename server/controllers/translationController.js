const Translation =
  require('../models/Translation');

/*
|--------------------------------------------------------------------------
| Helper: safely convert a value for response
|--------------------------------------------------------------------------
*/

function serializeTranslation(doc) {
  return {
    _id: doc._id,
    key: doc.key,
    category: doc.category,
    translations: doc.translations,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    updatedBy: doc.updatedBy
  };
}

/*
|--------------------------------------------------------------------------
| PUBLIC: GET /api/translations/resources
|--------------------------------------------------------------------------
|
| This endpoint is public because the login/register screens also need
| translated text before a user is authenticated.
|--------------------------------------------------------------------------
*/

exports.getResources =
  async (req, res) => {
    try {
      const translations =
        await Translation
          .find({})
          .sort({
            key: 1
          })
          .lean();

      const resources = {
        en: {},
        bn: {}
      };

      for (
        const item
        of translations
      ) {
        resources.en[item.key] =
          item.translations?.en;

        resources.bn[item.key] =
          item.translations?.bn;
      }

      return res.json({
        success: true,
        count:
          translations.length,
        data:
          resources
      });
    } catch (err) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            err.message
        });
    }
  };

/*
|--------------------------------------------------------------------------
| ADMIN: GET /api/translations
|--------------------------------------------------------------------------
|
| Admin management list.
|--------------------------------------------------------------------------
*/

exports.getAllTranslations =
  async (req, res) => {
    try {
      const {
        search = '',
        category = '',
        page = 1,
        limit = 50
      } =
        req.query;

      const filter = {};

      if (category) {
        filter.category =
          category;
      }

      if (search) {
        filter.$or = [
          {
            key: {
              $regex: search,
              $options: 'i'
            }
          },

          {
            'translations.en': {
              $regex: search,
              $options: 'i'
            }
          },

          {
            'translations.bn': {
              $regex: search,
              $options: 'i'
            }
          }
        ];
      }

      const safePage =
        Math.max(
          Number(page) || 1,
          1
        );

      const safeLimit =
        Math.min(
          Math.max(
            Number(limit) || 50,
            1
          ),
          200
        );

      const [
        translations,
        total
      ] =
        await Promise.all([
          Translation
            .find(filter)
            .sort({
              category: 1,
              key: 1
            })
            .skip(
              (
                safePage -
                1
              ) *
                safeLimit
            )
            .limit(
              safeLimit
            ),

          Translation
            .countDocuments(
              filter
            )
        ]);

      const categories =
        await Translation.distinct(
          'category'
        );

      return res.json({
        success: true,

        data:
          translations.map(
            serializeTranslation
          ),

        total,

        page:
          safePage,

        totalPages:
          Math.ceil(
            total /
              safeLimit
          ),

        categories:
          categories.sort()
      });
    } catch (err) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            err.message
        });
    }
  };

/*
|--------------------------------------------------------------------------
| ADMIN: POST /api/translations
|--------------------------------------------------------------------------
*/

exports.createTranslation =
  async (req, res) => {
    try {
      const {
        key,
        category,
        en,
        bn
      } =
        req.body || {};

      if (
        !key ||
        en === undefined ||
        bn === undefined
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'key, English translation, and Bangla translation are required'
          });
      }

      const cleanKey =
        String(key).trim();

      const existing =
        await Translation
          .findOne({
            key:
              cleanKey
          });

      if (existing) {
        return res
          .status(409)
          .json({
            success: false,

            message:
              'A translation with this key already exists'
          });
      }

      const resolvedCategory =
        category
          ? String(
              category
            ).trim()
          : cleanKey.includes(
              '.'
            )
            ? cleanKey.split(
                '.'
              )[0]
            : 'general';

      const translation =
        await Translation.create({
          key:
            cleanKey,

          category:
            resolvedCategory,

          translations: {
            en,
            bn
          },

          updatedBy:
            req.user._id
        });

      return res
        .status(201)
        .json({
          success: true,

          message:
            'Translation created successfully',

          data:
            serializeTranslation(
              translation
            )
        });
    } catch (err) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            err.message
        });
    }
  };

/*
|--------------------------------------------------------------------------
| ADMIN: PUT /api/translations/:id
|--------------------------------------------------------------------------
*/

exports.updateTranslation =
  async (req, res) => {
    try {
      const {
        key,
        category,
        en,
        bn
      } =
        req.body || {};

      const translation =
        await Translation.findById(
          req.params.id
        );

      if (!translation) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              'Translation not found'
          });
      }

      if (
        key !== undefined
      ) {
        const cleanKey =
          String(key).trim();

        const duplicate =
          await Translation.findOne({
            key:
              cleanKey,

            _id: {
              $ne:
                translation._id
            }
          });

        if (duplicate) {
          return res
            .status(409)
            .json({
              success: false,

              message:
                'Another translation already uses this key'
            });
        }

        translation.key =
          cleanKey;
      }

      if (
        category !==
        undefined
      ) {
        translation.category =
          String(
            category
          ).trim();
      }

      if (
        en !== undefined
      ) {
        translation.translations.en =
          en;
      }

      if (
        bn !== undefined
      ) {
        translation.translations.bn =
          bn;
      }

      translation.updatedBy =
        req.user._id;

      translation.markModified(
        'translations'
      );

      await translation.save();

      return res.json({
        success: true,

        message:
          'Translation updated successfully',

        data:
          serializeTranslation(
            translation
          )
      });
    } catch (err) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            err.message
        });
    }
  };

/*
|--------------------------------------------------------------------------
| ADMIN: DELETE /api/translations/:id
|--------------------------------------------------------------------------
*/

exports.deleteTranslation =
  async (req, res) => {
    try {
      const translation =
        await Translation
          .findById(
            req.params.id
          );

      if (!translation) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              'Translation not found'
          });
      }

      await translation.deleteOne();

      return res.json({
        success: true,

        message:
          'Translation deleted successfully'
      });
    } catch (err) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            err.message
        });
    }
  };
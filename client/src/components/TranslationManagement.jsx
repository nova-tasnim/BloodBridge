import {
  useEffect,
  useState
} from 'react';

import {
  translationApi
} from '../api/resources';

import {
  reloadTranslations
} from '../i18n';

function prettyValue(
  value
) {
  if (
    typeof value ===
      'string'
  ) {
    return value;
  }

  return JSON.stringify(
    value,
    null,
    2
  );
}

function parseEditorValue(
  value,
  originalValue
) {
  /*
   * Existing objects/arrays need to remain objects/arrays.
   */
  if (
    typeof originalValue ===
      'object' &&
    originalValue !== null
  ) {
    return JSON.parse(
      value
    );
  }

  return value;
}

export default function TranslationManagement() {
  const [
    translations,
    setTranslations
  ] =
    useState([]);

  const [
    categories,
    setCategories
  ] =
    useState([]);

  const [
    search,
    setSearch
  ] =
    useState('');

  const [
    category,
    setCategory
  ] =
    useState('');

  const [
    loading,
    setLoading
  ] =
    useState(true);

  const [
    error,
    setError
  ] =
    useState('');

  const [
    notice,
    setNotice
  ] =
    useState('');

  const [
    editingId,
    setEditingId
  ] =
    useState(null);

  const [
    editForm,
    setEditForm
  ] =
    useState({
      key: '',
      category: '',
      en: '',
      bn: '',
      originalEn: '',
      originalBn: ''
    });

  const [
    createForm,
    setCreateForm
  ] =
    useState({
      key: '',
      category: '',
      en: '',
      bn: ''
    });

  /*
  |--------------------------------------------------------------------------
  | Load translations
  |--------------------------------------------------------------------------
  */

  const loadTranslations =
    async () => {
      try {
        setLoading(true);
        setError('');

        const response =
          await translationApi.list({
            search,
            category,
            page: 1,
            limit: 100
          });

        setTranslations(
          Array.isArray(
            response?.data
          )
            ? response.data
            : []
        );

        setCategories(
          Array.isArray(
            response?.categories
          )
            ? response.categories
            : []
        );
      } catch (err) {
        setError(
          err.message
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadTranslations();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Search
  |--------------------------------------------------------------------------
  */

  const handleSearch =
    async (e) => {
      e.preventDefault();

      await loadTranslations();
    };

  /*
  |--------------------------------------------------------------------------
  | Begin editing
  |--------------------------------------------------------------------------
  */

  const startEdit =
    (translation) => {
      setEditingId(
        translation._id
      );

      setEditForm({
        key:
          translation.key,

        category:
          translation.category,

        en:
          prettyValue(
            translation
              .translations
              ?.en
          ),

        bn:
          prettyValue(
            translation
              .translations
              ?.bn
          ),

        originalEn:
          translation
            .translations
            ?.en,

        originalBn:
          translation
            .translations
            ?.bn
      });

      setNotice('');
      setError('');
    };

  /*
  |--------------------------------------------------------------------------
  | Save edit
  |--------------------------------------------------------------------------
  */

  const saveEdit =
    async (e) => {
      e.preventDefault();

      try {
        setError('');
        setNotice('');

        const en =
          parseEditorValue(
            editForm.en,
            editForm.originalEn
          );

        const bn =
          parseEditorValue(
            editForm.bn,
            editForm.originalBn
          );

        await translationApi.update(
          editingId,
          {
            key:
              editForm.key,

            category:
              editForm.category,

            en,
            bn
          }
        );

        /*
         * Reload i18next immediately.
         *
         * Admin can visually demonstrate that DB update changes UI.
         */
        await reloadTranslations();

        setNotice(
          'Translation updated successfully. The application language resources have been refreshed.'
        );

        setEditingId(
          null
        );

        await loadTranslations();
      } catch (err) {
        setError(
          err.message
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Create
  |--------------------------------------------------------------------------
  */

  const createTranslation =
    async (e) => {
      e.preventDefault();

      try {
        setError('');
        setNotice('');

        if (
          !createForm.key.trim() ||
          !createForm.en.trim() ||
          !createForm.bn.trim()
        ) {
          setError(
            'Key, English, and Bangla are required.'
          );

          return;
        }

        await translationApi.create({
          key:
            createForm.key.trim(),

          category:
            createForm.category.trim(),

          en:
            createForm.en,

          bn:
            createForm.bn
        });

        await reloadTranslations();

        setCreateForm({
          key: '',
          category: '',
          en: '',
          bn: ''
        });

        setNotice(
          'New translation added successfully.'
        );

        await loadTranslations();
      } catch (err) {
        setError(
          err.message
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Delete
  |--------------------------------------------------------------------------
  */

  const deleteTranslation =
    async (translation) => {
      const confirmed =
        window.confirm(
          `Delete translation "${translation.key}"?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setError('');
        setNotice('');

        await translationApi.remove(
          translation._id
        );

        await reloadTranslations();

        setNotice(
          'Translation deleted successfully.'
        );

        await loadTranslations();
      } catch (err) {
        setError(
          err.message
        );
      }
    };

  return (
    <section className="admin-card">
      <div className="section-title">
        <div>
          <h2>
            Translation Management
          </h2>

          <p>
            Add and update English/Bangla application translations stored in MongoDB.
          </p>
        </div>

        <span className="admin-badge">
          {translations.length}
        </span>
      </div>

      {error && (
        <div className="admin-error">
          {error}
        </div>
      )}

      {notice && (
        <div
          className="alert success"
          style={{
            marginBottom: 16
          }}
        >
          {notice}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ADD NEW TRANSLATION                                          */}
      {/* ------------------------------------------------------------- */}

      <div
        style={{
          marginBottom: 28
        }}
      >
        <h3>
          Add Translation
        </h3>

        <form
          onSubmit={
            createTranslation
          }
        >
          <div className="form-row">
            <div className="field">
              <label>
                Translation Key
              </label>

              <input
                value={
                  createForm.key
                }
                onChange={(e) =>
                  setCreateForm(
                    (current) => ({
                      ...current,
                      key:
                        e.target.value
                    })
                  )
                }
                placeholder="example.title"
                required
              />
            </div>

            <div className="field">
              <label>
                Category
              </label>

              <input
                value={
                  createForm.category
                }
                onChange={(e) =>
                  setCreateForm(
                    (current) => ({
                      ...current,
                      category:
                        e.target.value
                    })
                  )
                }
                placeholder="example"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label>
                English
              </label>

              <textarea
                value={
                  createForm.en
                }
                onChange={(e) =>
                  setCreateForm(
                    (current) => ({
                      ...current,
                      en:
                        e.target.value
                    })
                  )
                }
                rows="3"
                required
              />
            </div>

            <div className="field">
              <label>
                বাংলা
              </label>

              <textarea
                value={
                  createForm.bn
                }
                onChange={(e) =>
                  setCreateForm(
                    (current) => ({
                      ...current,
                      bn:
                        e.target.value
                    })
                  )
                }
                rows="3"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="admin-search"
          >
            Add Translation
          </button>
        </form>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SEARCH/FILTER                                                */}
      {/* ------------------------------------------------------------- */}

      <form
        onSubmit={
          handleSearch
        }
        className="user-filters"
        style={{
          marginBottom: 18
        }}
      >
        <input
          type="text"
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
          placeholder="Search key or translation"
        />

        <select
          value={category}
          onChange={(e) =>
            setCategory(
              e.target.value
            )
          }
        >
          <option value="">
            All Categories
          </option>

          {categories.map(
            (item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            )
          )}
        </select>

        <button
          type="submit"
          className="admin-search"
        >
          Search
        </button>

        <button
          type="button"
          className="admin-refresh"
          onClick={() => {
            setSearch('');
            setCategory('');

            setTimeout(
              loadTranslations,
              0
            );
          }}
        >
          Reset
        </button>
      </form>

      {/* ------------------------------------------------------------- */}
      {/* TRANSLATION TABLE                                            */}
      {/* ------------------------------------------------------------- */}

      {loading ? (
        <div className="admin-loading">
          Loading translations...
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  Key
                </th>

                <th>
                  Category
                </th>

                <th>
                  English
                </th>

                <th>
                  বাংলা
                </th>

                <th>
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {translations.map(
                (translation) => {
                  const editing =
                    editingId ===
                    translation._id;

                  if (editing) {
                    return (
                      <tr
                        key={
                          translation._id
                        }
                      >
                        <td>
                          <input
                            value={
                              editForm.key
                            }
                            onChange={(e) =>
                              setEditForm(
                                (
                                  current
                                ) => ({
                                  ...current,

                                  key:
                                    e
                                      .target
                                      .value
                                })
                              )
                            }
                          />
                        </td>

                        <td>
                          <input
                            value={
                              editForm.category
                            }
                            onChange={(e) =>
                              setEditForm(
                                (
                                  current
                                ) => ({
                                  ...current,

                                  category:
                                    e
                                      .target
                                      .value
                                })
                              )
                            }
                          />
                        </td>

                        <td>
                          <textarea
                            rows="5"
                            value={
                              editForm.en
                            }
                            onChange={(e) =>
                              setEditForm(
                                (
                                  current
                                ) => ({
                                  ...current,

                                  en:
                                    e
                                      .target
                                      .value
                                })
                              )
                            }
                          />
                        </td>

                        <td>
                          <textarea
                            rows="5"
                            value={
                              editForm.bn
                            }
                            onChange={(e) =>
                              setEditForm(
                                (
                                  current
                                ) => ({
                                  ...current,

                                  bn:
                                    e
                                      .target
                                      .value
                                })
                              )
                            }
                          />
                        </td>

                        <td>
                          <div
                            style={{
                              display:
                                'flex',

                              flexDirection:
                                'column',

                              gap: 6
                            }}
                          >
                            <button
                              type="button"
                              className="action-button verify"
                              onClick={
                                saveEdit
                              }
                            >
                              Save
                            </button>

                            <button
                              type="button"
                              className="action-button"
                              onClick={() =>
                                setEditingId(
                                  null
                                )
                              }
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={
                        translation._id
                      }
                    >
                      <td>
                        <code>
                          {
                            translation.key
                          }
                        </code>
                      </td>

                      <td>
                        {
                          translation.category
                        }
                      </td>

                      <td>
                        <div
                          style={{
                            maxWidth:
                              320,

                            whiteSpace:
                              'pre-wrap'
                          }}
                        >
                          {prettyValue(
                            translation
                              .translations
                              ?.en
                          )}
                        </div>
                      </td>

                      <td>
                        <div
                          style={{
                            maxWidth:
                              320,

                            whiteSpace:
                              'pre-wrap'
                          }}
                        >
                          {prettyValue(
                            translation
                              .translations
                              ?.bn
                          )}
                        </div>
                      </td>

                      <td>
                        <div
                          style={{
                            display:
                              'flex',

                            flexDirection:
                              'column',

                            gap: 6
                          }}
                        >
                          <button
                            type="button"
                            className="action-button verify"
                            onClick={() =>
                              startEdit(
                                translation
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="action-button deactivate"
                            onClick={() =>
                              deleteTranslation(
                                translation
                              )
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
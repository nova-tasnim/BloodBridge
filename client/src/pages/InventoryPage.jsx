import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { inventoryApi } from '../api/resources';
import { useAuth } from '../context/AuthContext';
import {
  PageHeader,
  Card,
  Field,
  Badge,
  BloodBadge,
  Alert,
  Empty,
  BLOOD_GROUPS,
  formatDate
} from '../components/Shared';

export default function InventoryPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  /*
  |--------------------------------------------------------------------------
  | Inventory management capability
  |--------------------------------------------------------------------------
  |
  | BloodBank:
  | - manage own inventory
  |
  | Admin:
  | - manage inventory globally
  |
  | Hospital:
  | - read-only access
  |
  */

  const canManageInventory =
    user?.role === 'BloodBank' ||
    user?.role === 'Admin';

  const [bankId, setBankId] =
    useState('');

  const [summary, setSummary] =
    useState(null);

  const [alerts, setAlerts] =
    useState(null);

  const [items, setItems] =
    useState([]);

  const [error, setError] =
    useState('');

  const [notice, setNotice] =
    useState('');

  const [form, setForm] =
    useState({
      bloodGroup: 'O+',
      unitsAvailable: 10,
      lowStockThreshold: 10,
      expiryDate: '',
      batchNumber: '',
      storageLocation: ''
    });

  const set = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: e.target.value
    }));

  /*
  |--------------------------------------------------------------------------
  | Load inventory
  |--------------------------------------------------------------------------
  */

  const loadAll = async (
    id = ''
  ) => {
    setError('');

    try {
      const targetId =
        id ||
        (
          user?.role ===
          'BloodBank'
            ? 'me'
            : ''
        );

      const listParams =
        targetId &&
        targetId !== 'me'
          ? {
              bloodBank:
                targetId
            }
          : {};

      const [
        s,
        a,
        list
      ] =
        await Promise.all([
          inventoryApi
            .summary(targetId),

          inventoryApi
            .alerts(targetId),

          inventoryApi
            .list(listParams)
        ]);

      setSummary(
        s.data
      );

      setAlerts(
        a.data
      );

      setItems(
        list.data
      );
    } catch (err) {
      setError(
        err.message
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | BloodBank automatically loads own inventory
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      user?.role ===
      'BloodBank'
    ) {
      loadAll('me');
    }
  }, [user]);

  /*
  |--------------------------------------------------------------------------
  | Hospital / Admin load selected BloodBank
  |--------------------------------------------------------------------------
  */

  const handleLoad = (e) => {
    e.preventDefault();

    if (bankId) {
      loadAll(bankId);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Add inventory
  |--------------------------------------------------------------------------
  |
  | Frontend guard is included for safety/user experience.
  | Backend authorization remains the real security boundary.
  |
  */

  const handleAdd =
    async (e) => {
      e.preventDefault();

      setError('');
      setNotice('');

      if (
        !canManageInventory
      ) {
        setError(
          'You do not have permission to add inventory.'
        );

        return;
      }

      try {
        const payload = {
          ...form,

          ...(bankId
            ? {
                bloodBank:
                  bankId
              }
            : {})
        };

        await inventoryApi
          .add(payload);

        setNotice(
          t(
            'inventory.stockAdded',
            {
              defaultValue:
                'Stock added successfully'
            }
          )
        );

        loadAll(
          bankId ||
          'me'
        );
      } catch (err) {
        setError(
          err.message
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Issue / consume inventory
  |--------------------------------------------------------------------------
  */

  const handleConsume =
    async (id) => {
      if (
        !canManageInventory
      ) {
        setError(
          'You do not have permission to issue inventory.'
        );

        return;
      }

      const units =
        prompt(
          t(
            'inventory.issuePrompt'
          )
        );

      if (!units) {
        return;
      }

      setError('');
      setNotice('');

      try {
        const res =
          await inventoryApi
            .consume(
              id,
              Number(units)
            );

        setNotice(
          res.message
        );

        loadAll(
          bankId ||
          'me'
        );
      } catch (err) {
        setError(
          err.message
        );
      }
    };

  return (
    <div className="page">
      <PageHeader
        title={
          t(
            'inventory.title'
          )
        }
        subtitle={
          t(
            'inventory.subtitle'
          )
        }
      />

      <Alert
        message={error}
        onDismiss={() =>
          setError('')
        }
      />

      <Alert
        type="success"
        message={notice}
        onDismiss={() =>
          setNotice('')
        }
      />

      {/* -------------------------------------------------------------- */}
      {/* Facility selection                                             */}
      {/* -------------------------------------------------------------- */}

      <Card
        title={
          user?.role ===
          'BloodBank'
            ? t(
                'inventory.myFacility',
                {
                  defaultValue:
                    'Facility Inventory'
                }
              )
            : t(
                'inventory.selectBloodBank'
              )
        }
      >
        {user?.role ===
        'BloodBank' ? (
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems:
                'center'
            }}
          >
            <div>
              <p
                className="muted"
                style={{
                  margin: 0
                }}
              >
                {t(
                  'inventory.facilitySession',
                  {
                    defaultValue:
                      'Managing real-time stock for:'
                  }
                )}{' '}

                <b>
                  {user?.name}
                </b>
              </p>
            </div>

            <button
              type="button"
              className="secondary small"
              onClick={() =>
                loadAll('me')
              }
            >
              {t(
                'inventory.refresh',
                {
                  defaultValue:
                    'Refresh Stock'
                }
              )}
            </button>
          </div>
        ) : (
          <form
            onSubmit={
              handleLoad
            }
            className="form-row"
          >
            <Field
              label={
                t(
                  'inventory.bloodBankId'
                )
              }
            >
              <input
                value={bankId}
                onChange={(e) =>
                  setBankId(
                    e.target.value
                  )
                }
                placeholder="Enter Blood Bank ID"
                required
              />
            </Field>

            <div
              style={{
                alignSelf:
                  'flex-end',
                paddingBottom:
                  12
              }}
            >
              <button
                type="submit"
              >
                {t(
                  'inventory.load'
                )}
              </button>
            </div>
          </form>
        )}
      </Card>

      {/* -------------------------------------------------------------- */}
      {/* Alerts                                                         */}
      {/* -------------------------------------------------------------- */}

      {alerts && (
        <Card
          title={`${t(
            'inventory.alerts'
          )} (${alerts.alertCount})`}
        >
          <div className="grid grid-3">
            <div>
              <h3>
                {t(
                  'inventory.lowStock'
                )}{' '}
                (
                {
                  alerts
                    .lowStock
                    .length
                }
                )
              </h3>

              {alerts.lowStock
                .length ===
              0 ? (
                <span className="muted">
                  {t(
                    'inventory.none'
                  )}
                </span>
              ) : (
                alerts.lowStock
                  .map((a) => (
                    <div
                      key={
                        a.bloodGroup
                      }
                      style={{
                        marginBottom:
                          6
                      }}
                    >
                      <BloodBadge
                        group={
                          a.bloodGroup
                        }
                      />{' '}

                      <span className="muted">
                        {
                          a.totalUnits
                        }
                        /
                        {
                          a.threshold
                        }{' '}
                        —{' '}
                        {t(
                          'inventory.shortBy'
                        )}{' '}
                        {
                          a.shortfall
                        }
                      </span>
                    </div>
                  ))
              )}
            </div>

            <div>
              <h3>
                {t(
                  'inventory.expiringSoon'
                )}{' '}
                (
                {
                  alerts
                    .expiringSoon
                    .length
                }
                )
              </h3>

              {alerts
                .expiringSoon
                .length ===
              0 ? (
                <span className="muted">
                  {t(
                    'inventory.none'
                  )}
                </span>
              ) : (
                alerts
                  .expiringSoon
                  .map((a) => (
                    <div
                      key={
                        a.inventoryId
                      }
                      style={{
                        marginBottom:
                          6
                      }}
                    >
                      <BloodBadge
                        group={
                          a.bloodGroup
                        }
                      />{' '}

                      <Badge type="warn">
                        {
                          a.daysUntilExpiry
                        }{' '}
                        {t(
                          'inventory.days'
                        )}
                      </Badge>{' '}

                      <span className="muted">
                        {
                          a.batchNumber
                        }
                      </span>
                    </div>
                  ))
              )}
            </div>

            <div>
              <h3>
                {t(
                  'inventory.expired'
                )}{' '}
                (
                {
                  alerts
                    .expired
                    .length
                }
                )
              </h3>

              {alerts.expired
                .length ===
              0 ? (
                <span className="muted">
                  {t(
                    'inventory.none'
                  )}
                </span>
              ) : (
                alerts.expired
                  .map((a) => (
                    <div
                      key={
                        a.inventoryId
                      }
                      style={{
                        marginBottom:
                          6
                      }}
                    >
                      <BloodBadge
                        group={
                          a.bloodGroup
                        }
                      />{' '}

                      <Badge type="bad">
                        {t(
                          'inventory.expiredLabel'
                        )}
                      </Badge>{' '}

                      <span className="muted">
                        {
                          a.batchNumber
                        }
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </Card>
      )}

      {/* -------------------------------------------------------------- */}
      {/* Stock summary                                                  */}
      {/* -------------------------------------------------------------- */}

      {summary && (
        <Card
          title={
            t(
              'inventory.stockSummary'
            )
          }
        >
          <table>
            <thead>
              <tr>
                <th>
                  {t(
                    'inventory.group'
                  )}
                </th>

                <th>
                  {t(
                    'inventory.units'
                  )}
                </th>

                <th>
                  {t(
                    'inventory.threshold'
                  )}
                </th>

                <th>
                  {t(
                    'inventory.batches'
                  )}
                </th>

                <th>
                  {t(
                    'inventory.status'
                  )}
                </th>
              </tr>
            </thead>

            <tbody>
              {Object.entries(
                summary
              ).map(
                ([
                  group,
                  v
                ]) => (
                  <tr
                    key={
                      group
                    }
                  >
                    <td>
                      <BloodBadge
                        group={
                          group
                        }
                      />
                    </td>

                    <td>
                      <b>
                        {
                          v.totalUnits
                        }
                      </b>
                    </td>

                    <td className="muted">
                      {
                        v.threshold
                      }
                    </td>

                    <td className="muted">
                      {
                        v.batches
                      }
                    </td>

                    <td>
                      {v.isLowStock ? (
                        <Badge type="bad">
                          {t(
                            'inventory.lowStockLabel'
                          )}
                        </Badge>
                      ) : (
                        <Badge type="ok">
                          {t(
                            'inventory.sufficient'
                          )}
                        </Badge>
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* -------------------------------------------------------------- */}
      {/* Detailed inventory                                             */}
      {/* -------------------------------------------------------------- */}

      {(
        bankId ||
        user?.role ===
          'BloodBank'
      ) && (
        <div className="grid grid-2">
          {/* ---------------------------------------------------------- */}
          {/* Add Stock — BloodBank/Admin only                          */}
          {/* ---------------------------------------------------------- */}

          {canManageInventory && (
            <Card
              title={
                t(
                  'inventory.addStock'
                )
              }
            >
              <form
                onSubmit={
                  handleAdd
                }
              >
                <div className="form-row">
                  <Field
                    label={
                      t(
                        'inventory.bloodGroup'
                      )
                    }
                  >
                    <select
                      value={
                        form.bloodGroup
                      }
                      onChange={
                        set(
                          'bloodGroup'
                        )
                      }
                    >
                      {BLOOD_GROUPS
                        .map(
                          (g) => (
                            <option
                              key={
                                g
                              }
                              value={
                                g
                              }
                            >
                              {g}
                            </option>
                          )
                        )}
                    </select>
                  </Field>

                  <Field
                    label={
                      t(
                        'inventory.units'
                      )
                    }
                  >
                    <input
                      type="number"
                      min="0"
                      value={
                        form.unitsAvailable
                      }
                      onChange={
                        set(
                          'unitsAvailable'
                        )
                      }
                      required
                    />
                  </Field>

                  <Field
                    label={
                      t(
                        'inventory.threshold'
                      )
                    }
                  >
                    <input
                      type="number"
                      min="0"
                      value={
                        form.lowStockThreshold
                      }
                      onChange={
                        set(
                          'lowStockThreshold'
                        )
                      }
                    />
                  </Field>
                </div>

                <div className="form-row">
                  <Field
                    label={
                      t(
                        'inventory.expiryDate'
                      )
                    }
                  >
                    <input
                      type="date"
                      value={
                        form.expiryDate
                      }
                      onChange={
                        set(
                          'expiryDate'
                        )
                      }
                      required
                    />
                  </Field>

                  <Field
                    label={
                      t(
                        'inventory.batchNumber'
                      )
                    }
                  >
                    <input
                      value={
                        form.batchNumber
                      }
                      onChange={
                        set(
                          'batchNumber'
                        )
                      }
                    />
                  </Field>

                  <Field
                    label={
                      t(
                        'inventory.storage'
                      )
                    }
                  >
                    <input
                      value={
                        form.storageLocation
                      }
                      onChange={
                        set(
                          'storageLocation'
                        )
                      }
                    />
                  </Field>
                </div>

                <button
                  type="submit"
                >
                  {t(
                    'inventory.addStock'
                  )}
                </button>
              </form>
            </Card>
          )}

          {/* ---------------------------------------------------------- */}
          {/* Inventory batches                                         */}
          {/* ---------------------------------------------------------- */}

          <Card
            title={`${t(
              'inventory.batches'
            )} (${items.length})`}
          >
            {items.length ===
            0 ? (
              <Empty>
                {t(
                  'inventory.noStock'
                )}
              </Empty>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>
                      {t(
                        'inventory.group'
                      )}
                    </th>

                    <th>
                      {t(
                        'inventory.units'
                      )}
                    </th>

                    <th>
                      {t(
                        'inventory.batch'
                      )}
                    </th>

                    <th>
                      {t(
                        'inventory.expires'
                      )}
                    </th>

                    <th>
                      {canManageInventory
                        ? t(
                            'inventory.status',
                            {
                              defaultValue:
                                'Action'
                            }
                          )
                        : ''}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {items.map(
                    (i) => (
                      <tr
                        key={
                          i._id
                        }
                      >
                        <td>
                          <BloodBadge
                            group={
                              i.bloodGroup
                            }
                          />
                        </td>

                        <td>
                          {
                            i.unitsAvailable
                          }
                        </td>

                        <td className="muted">
                          {
                            i.batchNumber ||
                            '—'
                          }
                        </td>

                        <td>
                          {formatDate(
                            i.expiryDate
                          )}

                          <br />

                          {i.isExpired ? (
                            <Badge type="bad">
                              {t(
                                'inventory.expiredLabel'
                              )}
                            </Badge>
                          ) : (
                            <span className="muted">
                              {
                                i.daysUntilExpiry
                              }{' '}
                              {t(
                                'inventory.days'
                              )}
                            </span>
                          )}
                        </td>

                        <td>
                          {canManageInventory ? (
                            <button
                              className="small secondary"
                              disabled={
                                i.isExpired ||
                                !i.isActive
                              }
                              onClick={() =>
                                handleConsume(
                                  i._id
                                )
                              }
                            >
                              {t(
                                'inventory.issue'
                              )}
                            </button>
                          ) : (
                            <span className="muted">
                              Read only
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
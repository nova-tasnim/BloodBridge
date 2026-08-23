import {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';

import {
  useTranslation
} from 'react-i18next';

import {
  notificationApi
} from '../api/resources';

import {
  useAuth
} from '../context/AuthContext';

/*
 * Poll frequently enough to feel responsive,
 * without requiring WebSockets.
 */
const POLL_INTERVAL_MS =
  10000;

function notificationIcon(
  type
) {
  switch (type) {
    case 'sos':
      return '🚨';

    case 'match':
      return '🩸';

    case 'welcome':
      return '❤️';

    case 'status_update':
      return '📋';

    case 'reminder':
      return '⏰';

    default:
      return '🔔';
  }
}

export default function NotificationBell() {
  const {
    t
  } =
    useTranslation();

  const {
    isAuthenticated
  } =
    useAuth();

  const [
    isOpen,
    setIsOpen
  ] =
    useState(false);

  const [
    notifications,
    setNotifications
  ] =
    useState([]);

  const [
    unreadCount,
    setUnreadCount
  ] =
    useState(0);

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

  const panelRef =
    useRef(null);

  /*
  |--------------------------------------------------------------------------
  | Load notifications
  |--------------------------------------------------------------------------
  */

  const load =
    useCallback(
      async () => {
        if (
          !isAuthenticated
        ) {
          return;
        }

        try {
          const payload =
            await notificationApi
              .myNotifications();

          const items =
            Array.isArray(
              payload?.data
            )
              ? payload.data
              : [];

          setNotifications(
            items
          );

          setUnreadCount(
            payload?.unreadCount ??
              items.filter(
                (item) =>
                  !item.isRead
              ).length
          );

          setError('');
        } catch (err) {
          setError(
            err?.response?.data
              ?.message ||
              err?.message ||
              'Unable to load notifications'
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        isAuthenticated
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Poll
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !isAuthenticated
    ) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);

      return;
    }

    setLoading(true);

    load();

    const interval =
      setInterval(
        load,
        POLL_INTERVAL_MS
      );

    return () =>
      clearInterval(
        interval
      );
  }, [
    isAuthenticated,
    load
  ]);

  /*
  |--------------------------------------------------------------------------
  | Immediately refresh when bell opens
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      isOpen &&
      isAuthenticated
    ) {
      load();
    }
  }, [
    isOpen,
    isAuthenticated,
    load
  ]);

  /*
  |--------------------------------------------------------------------------
  | Close outside
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    function handleClickOutside(
      event
    ) {
      if (
        panelRef.current &&
        !panelRef.current.contains(
          event.target
        )
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener(
        'mousedown',
        handleClickOutside
      );
    }

    return () =>
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
  }, [isOpen]);

  /*
  |--------------------------------------------------------------------------
  | Mark one read
  |--------------------------------------------------------------------------
  */

  async function handleMarkRead(
    notificationId
  ) {
    const target =
      notifications.find(
        (notification) =>
          notification._id ===
          notificationId
      );

    if (
      !target ||
      target.isRead
    ) {
      return;
    }

    setNotifications(
      (current) =>
        current.map(
          (notification) =>
            notification._id ===
            notificationId
              ? {
                  ...notification,

                  isRead:
                    true
                }
              : notification
        )
    );

    setUnreadCount(
      (current) =>
        Math.max(
          current - 1,
          0
        )
    );

    try {
      await notificationApi
        .markRead(
          notificationId
        );
    } catch (_) {
      load();
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Mark all
  |--------------------------------------------------------------------------
  */

  async function handleMarkAllRead() {
    const previous =
      notifications;

    setNotifications(
      (current) =>
        current.map(
          (notification) => ({
            ...notification,

            isRead:
              true
          })
        )
    );

    setUnreadCount(0);

    try {
      await notificationApi
        .markAllRead();
    } catch (_) {
      setNotifications(
        previous
      );

      load();
    }
  }

  if (
    !isAuthenticated
  ) {
    return null;
  }

  return (
    <div
      className="bb-notif-wrap"
      ref={panelRef}
    >
      <button
        type="button"
        className="bb-notif-bell"
        onClick={() =>
          setIsOpen(
            (current) =>
              !current
          )
        }
        aria-label={t(
          'notifications.title'
        )}
      >
        🔔

        {unreadCount > 0 && (
          <span className="bb-notif-badge">
            {unreadCount >
            99
              ? '99+'
              : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="bb-notif-panel">
          <div className="bb-notif-panel-header">
            <span>
              {t(
                'notifications.title'
              )}
            </span>

            {unreadCount >
              0 && (
              <button
                type="button"
                className="bb-notif-markall"
                onClick={
                  handleMarkAllRead
                }
              >
                {t(
                  'notifications.markAllRead'
                )}
              </button>
            )}
          </div>

          <div className="bb-notif-list">
            {loading && (
              <div className="bb-notif-empty">
                {t(
                  'common.loading'
                )}
              </div>
            )}

            {!loading &&
              error && (
                <div className="bb-notif-empty">
                  {error}
                </div>
              )}

            {!loading &&
              !error &&
              notifications.length ===
                0 && (
                <div className="bb-notif-empty">
                  {t(
                    'notifications.empty'
                  )}
                </div>
              )}

            {!loading &&
              !error &&
              notifications.map(
                (
                  notification
                ) => (
                  <button
                    type="button"
                    key={
                      notification._id
                    }
                    className={`bb-notif-item ${
                      notification.isRead
                        ? ''
                        : 'unread'
                    }`}
                    onClick={() =>
                      handleMarkRead(
                        notification._id
                      )
                    }
                  >
                    <span
                      style={{
                        fontSize:
                          18,
                        marginRight:
                          8
                      }}
                    >
                      {notificationIcon(
                        notification.type
                      )}
                    </span>

                    <span className="bb-notif-text">
                      <span className="bb-notif-message">
                        {
                          notification.message
                        }
                      </span>

                      <span className="bb-notif-time">
                        {new Date(
                          notification.createdAt
                        ).toLocaleString()}
                      </span>
                    </span>
                  </button>
                )
              )}
          </div>
        </div>
      )}
    </div>
  );
}
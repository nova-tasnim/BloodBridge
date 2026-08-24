import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { reportApi } from '../api/resources';
import AnimatedCounter from './AnimatedCounter';

const FACT_KEYS = ['fact1', 'fact2', 'fact3', 'fact4'];

export default function LiveStatsBar() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [factIndex, setFactIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await reportApi.overview();
        const payload = res?.data ?? res;
        if (!cancelled) setStats(payload);
      } catch {
        // Silent fail — stats bar just won't render numbers if backend is unreachable
      }
    }

    load();
    const poll = setInterval(load, 30000); // refresh every 30s for a "live" feel
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    const rotate = setInterval(() => {
      setFactIndex((i) => (i + 1) % FACT_KEYS.length);
    }, 5000);
    return () => clearInterval(rotate);
  }, []);

  if (!stats) return null;

  const totalUsers = stats.totalCommunityMembers || 0;

  return (
    <div className="bb-stats-bar">
      <div className="bb-stat-item">
        <div className="bb-stat-icon brand">🩸</div>
        <div className="bb-stat-text">
          <span className="bb-stat-value">
            <AnimatedCounter value={stats.totalDonors || 0} />
          </span>
          <span className="bb-stat-label">{t('stats.donors')}</span>
        </div>
      </div>

      <div className="bb-stat-item">
        <div className="bb-stat-icon accent">✅</div>
        <div className="bb-stat-text">
          <span className="bb-stat-value">{stats.fulfillmentRate || '0%'}</span>
          <span className="bb-stat-label">{t('stats.fulfillmentRate')}</span>
        </div>
      </div>

      <div className="bb-stat-item">
        <div className="bb-stat-icon violet">📋</div>
        <div className="bb-stat-text">
          <span className="bb-stat-value">
            <AnimatedCounter value={stats.totalRequestsThisMonth || 0} />
          </span>
          <span className="bb-stat-label">{t('stats.requestsThisMonth')}</span>
        </div>
      </div>

      <div className="bb-stat-item">
        <div className="bb-stat-icon gold">👥</div>
        <div className="bb-stat-text">
          <span className="bb-stat-value">
            <AnimatedCounter value={totalUsers} />
          </span>
          <span className="bb-stat-label">{t('stats.communityMembers')}</span>
        </div>
      </div>

      <div className="bb-stats-fact">
        💡 {t(`stats.${FACT_KEYS[factIndex]}`)}
      </div>
    </div>
  );
}

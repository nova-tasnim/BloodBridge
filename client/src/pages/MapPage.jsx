import { useTranslation } from 'react-i18next';
import RequestMap from '../components/RequestMap';

function MapPage() {
  const { t } = useTranslation();

  return (
    <div className="page-content">
      <h2>{t('map.title')}</h2>
      <RequestMap />
    </div>
  );
}

export default MapPage;
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useAuth } from '../context/AuthContext';
import { mapApi, requestApi } from '../api/resources';
import '../utils/leafletIconFix';

const URGENCY_COLORS = {
  critical: 'red',
  urgent: 'orange',
  routine: 'gold'
};

function RequestMap() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [requests, setRequests] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState('');

  const canRespond = user?.role === 'Donor';

  useEffect(() => {
    if (!navigator.geolocation) {
      fetchAllRequests();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        setUserLocation([latitude, longitude]);
        fetchNearbyRequests(latitude, longitude);
      },
      () => {
        fetchAllRequests();
      }
    );
  }, []);

  async function fetchNearbyRequests(lat, lng) {
    try {
      const result = await mapApi.nearby({
        latitude: lat,
        longitude: lng,
        radiusKm: 25
      });
      setRequests(result?.data || []);
    } catch (err) {
      console.error(t('map.failedToLoad'), err);
      await fetchAllRequests();
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllRequests() {
    try {
      const result = await mapApi.allActive();
      setRequests(result?.data || []);
      setUserLocation([23.8103, 90.4125]);
    } catch (err) {
      console.error(t('map.failedToLoad'), err);
      setRequests([]);
      setUserLocation([23.8103, 90.4125]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(request) {
    if (!request?._id) return;

    if (!canRespond) {
      navigate('/requests');
      return;
    }

    setActionLoadingId(request._id);

    try {
      await requestApi.respond(
        request._id,
        user?._id,
        'accepted',
        'Accepted via map'
      );
    } catch (err) {
      console.error(t('map.failedToLoad'), err);
    } finally {
      setActionLoadingId('');
    }
  }

  if (loading || !userLocation) {
    return <div className="card">{t('map.loading')}</div>;
  }

  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: 'hidden',
        height: '500px'
      }}
    >
      <MapContainer
        center={userLocation}
        zoom={12}
        style={{
          height: '100%',
          width: '100%'
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {requests.map((request) => {
          const coordinates = request.location?.coordinates;

          if (!coordinates || coordinates.length !== 2) {
            return null;
          }

          return (
            <Marker
              key={request._id}
              position={[
                coordinates[1],
                coordinates[0]
              ]}
            >
              <Popup>
                <strong>
                  {request.bloodGroup} {t('map.bloodNeeded')}
                </strong>

                <br />

                {t('map.units')}: {request.unitsNeeded}

                <br />

                {t('map.urgency')}:{' '}
                <span
                  style={{
                    color:
                      URGENCY_COLORS[request.urgency] || 'black'
                  }}
                >
                  {t(`common.${request.urgency}`)}
                </span>

                <br />

                {t('map.location')}: {request.location?.address || '—'}

                {request.isSOS && (
                  <>
                    <br />
                    <strong style={{ color: 'red' }}>
                      {t('map.sosEmergency')}
                    </strong>
                  </>
                )}

                <br />

                <button
                  className="btn-primary"
                  style={{ marginTop: '8px' }}
                  type="button"
                  onClick={() => handleAction(request)}
                  disabled={actionLoadingId === request._id}
                >
                  {canRespond ? t('map.respond') : 'View details'}
                </button>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default RequestMap;
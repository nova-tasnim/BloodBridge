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
  const [shareLocationConsent, setShareLocationConsent] = useState(true);
  const [statusMessage, setStatusMessage] = useState({});

const isNativeDonor =
  user?.role === 'Donor';

const isPatientDonor =
  user?.role === 'Patient' &&
  Boolean(user?.donorProfile);

const canRespond =
  isNativeDonor ||
  isPatientDonor;

useEffect(() => {
  if (!navigator.geolocation) {
    setUserLocation([23.8103, 90.4125]);
    fetchAllRequests();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const {
        latitude,
        longitude
      } = position.coords;

      setUserLocation([
        latitude,
        longitude
      ]);

      fetchAllRequests();
    },

    () => {
      setUserLocation([
        23.8103,
        90.4125
      ]);

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
      console.error(t('map.failedToLoad', { defaultValue: 'Failed to load map data' }), err);
      await fetchAllRequests();
    } finally {
      setLoading(false);
    }
  }

async function fetchAllRequests() {
  try {
    const result =
      await mapApi.allActive();

    setRequests(
      result?.data || []
    );
  } catch (err) {
    console.error(
      t(
        'map.failedToLoad',
        {
          defaultValue:
            'Failed to load map data'
        }
      ),
      err
    );

    setRequests([]);
  } finally {
    setLoading(false);
  }
}

  async function handleRespond(request, decision = 'accepted') {
    if (!request?._id) return;

    if (!canRespond) {
      navigate('/requests');
      return;
    }

    setActionLoadingId(request._id);
    setStatusMessage((prev) => ({ ...prev, [request._id]: '' }));

    try {
      const payload = {
        decision,
        reason: decision === 'accepted' ? 'Responded via live map' : 'Unavailable via map',
        shareLocation: decision === 'accepted' && shareLocationConsent,
        donorCoordinates: shareLocationConsent && userLocation ? [userLocation[1], userLocation[0]] : undefined
      };

      await requestApi.respond(request._id, payload);

      setStatusMessage((prev) => ({
        ...prev,
        [request._id]: decision === 'accepted'
          ? t('requests.responseSuccess', { defaultValue: 'Response sent! Requester notified.' })
          : t('requests.declined', { defaultValue: 'Declined' })
      }));

      setTimeout(() => {
        navigate('/requests');
      }, 1200);
    } catch (err) {
      setStatusMessage((prev) => ({
        ...prev,
        [request._id]: err.response?.data?.message || err.message
      }));
    } finally {
      setActionLoadingId('');
    }
  }

  if (loading || !userLocation) {
    return <div className="card">{t('map.loading', { defaultValue: 'Loading interactive map...' })}</div>;
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

          const reqId = request._id;
          const msg = statusMessage[reqId];

          return (
            <Marker
              key={reqId}
              position={[
                coordinates[1],
                coordinates[0]
              ]}
            >
              <Popup>
                <div style={{ minWidth: 200, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <strong>
                      {request.bloodGroup} {t('map.bloodNeeded', { defaultValue: 'Blood Needed' })}
                    </strong>
                    {request.publicId && (
                      <span className="badge neutral" style={{ fontSize: 10 }}>
                        {request.publicId}
                      </span>
                    )}
                  </div>

                  <div>
                    {t('map.units', { defaultValue: 'Units' })}: <b>{request.unitsNeeded}</b>
                  </div>

                  <div>
                    {t('map.urgency', { defaultValue: 'Urgency' })}:{' '}
                    <span
                      style={{
                        fontWeight: 'bold',
                        color: URGENCY_COLORS[request.urgency] || 'inherit'
                      }}
                    >
                      {t(`common.${request.urgency}`, { defaultValue: request.urgency })}
                    </span>
                  </div>

                  <div>
                    {t('map.location', { defaultValue: 'Location' })}: {request.location?.address || request.hospitalName || '—'}
                  </div>

                  {request.isSOS && (
                    <div style={{ color: 'red', fontWeight: 'bold', marginTop: 4 }}>
                      {t('map.sosEmergency', { defaultValue: 'SOS EMERGENCY' })}
                    </div>
                  )}

                  {msg ? (
                    <div style={{ marginTop: 8, padding: '4px 8px', borderRadius: 4, background: '#e6fffa', color: '#047481', fontWeight: 600 }}>
                      {msg}
                    </div>
                  ) : canRespond ? (
                    <div style={{ marginTop: 10 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginBottom: 8, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={shareLocationConsent}
                          onChange={(e) => setShareLocationConsent(e.target.checked)}
                        />
                        {t('requests.shareApproxLocation', { defaultValue: 'Share approximate area' })}
                      </label>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn-primary small"
                          type="button"
                          style={{ flex: 1 }}
                          onClick={() => handleRespond(request, 'accepted')}
                          disabled={actionLoadingId === reqId}
                        >
                          {actionLoadingId === reqId ? '...' : t('requests.iCanHelp', { defaultValue: 'I Can Help' })}
                        </button>

                        <button
                          className="secondary small"
                          type="button"
                          onClick={() => handleRespond(request, 'declined')}
                          disabled={actionLoadingId === reqId}
                        >
                          {t('requests.decline', { defaultValue: 'Decline' })}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn-primary small"
                      style={{ marginTop: 8, width: '100%' }}
                      type="button"
                      onClick={() => navigate('/requests')}
                    >
                      {t('requests.viewDetails', { defaultValue: 'View details' })}
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default RequestMap;
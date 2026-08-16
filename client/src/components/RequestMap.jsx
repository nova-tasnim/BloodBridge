import { useEffect, useState } from 'react';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer
} from 'react-leaflet';
import '../utils/leafletIconFix';

const DHAKA_CENTER = [23.8103, 90.4125];

const URGENCY_COLORS = {
  critical: 'red',
  urgent: 'orange',
  routine: 'green'
};

export default function RequestMap() {
  const [requests, setRequests] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usingNearby, setUsingNearby] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!navigator.geolocation) {
      fetchAllRequests();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude, longitude } = coords;

        setUserLocation([latitude, longitude]);
        setUsingNearby(true);

        fetchNearbyRequests(latitude, longitude);
      },
      () => {
        fetchAllRequests();
      }
    );
  }, []);

  async function fetchNearbyRequests(latitude, longitude) {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `/api/map/nearby?latitude=${latitude}&longitude=${longitude}&radiusKm=25`
      );

      if (!response.ok) {
        throw new Error('Failed to load nearby requests');
      }

      const result = await response.json();

      setRequests(result.data || []);
    } catch (err) {
      console.error(err);
      setError('Could not load nearby blood requests.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllRequests() {
    try {
      setLoading(true);
      setError('');
      setUsingNearby(false);
      setUserLocation(DHAKA_CENTER);

      const response = await fetch('/api/map/all-active');

      if (!response.ok) {
        throw new Error('Failed to load active requests');
      }

      const result = await response.json();

      setRequests(result.data || []);
    } catch (err) {
      console.error(err);
      setError('Could not load active blood requests.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ marginBottom: '6px' }}>
          Nearby Active Blood Requests
        </h2>

        <p style={{ margin: 0 }}>
          {usingNearby
            ? 'Showing requests within 25 km of your location.'
            : 'Showing all active requests. Location access was unavailable.'}
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: '12px',
            marginBottom: '12px',
            borderRadius: '8px',
            background: '#fee2e2',
            color: '#991b1b'
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '30px', textAlign: 'center' }}>
          Loading map...
        </div>
      ) : userLocation ? (
        <MapContainer
          center={userLocation}
          zoom={12}
          style={{
            height: '500px',
            width: '100%',
            borderRadius: '10px'
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {requests.map((request) => {
            const coordinates = request.location?.coordinates;

            if (
              !Array.isArray(coordinates) ||
              coordinates.length !== 2
            ) {
              return null;
            }

            const longitude = coordinates[0];
            const latitude = coordinates[1];

            return (
              <Marker
                key={request._id}
                position={[latitude, longitude]}
              >
                <Popup>
                  <div style={{ minWidth: '220px' }}>
                    <h3 style={{ marginTop: 0 }}>
                      {request.bloodGroup} Blood Needed
                    </h3>

                    <p>
                      <strong>Patient:</strong>{' '}
                      {request.patientName}
                    </p>

                    <p>
                      <strong>Units:</strong>{' '}
                      {request.unitsRemaining ?? request.unitsNeeded}
                    </p>

                    <p>
                      <strong>Urgency:</strong>{' '}
                      <span
                        style={{
                          color:
                            URGENCY_COLORS[request.urgency] ||
                            'black',
                          fontWeight: 'bold'
                        }}
                      >
                        {request.urgency}
                      </span>
                    </p>

                    <p>
                      <strong>Hospital:</strong>{' '}
                      {request.hospitalName || 'Not specified'}
                    </p>

                    <p>
                      <strong>Location:</strong>{' '}
                      {request.location?.address ||
                        'Not specified'}
                    </p>

                    <p>
                      <strong>Status:</strong>{' '}
                      {request.status}
                    </p>

                    {request.isSOS && (
                      <p
                        style={{
                          color: 'red',
                          fontWeight: 'bold'
                        }}
                      >
                        SOS EMERGENCY
                      </p>
                    )}

                    <button
                      type="button"
                      className="btn-primary"
                      style={{ marginTop: '8px' }}
                      onClick={() => {
                        console.log(
                          'Respond to request:',
                          request._id
                        );
                      }}
                    >
                      Respond
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      ) : (
        <div style={{ padding: '30px', textAlign: 'center' }}>
          Map location unavailable.
        </div>
      )}
    </div>
  );
}
import React, { useEffect, useRef, useState } from 'react';
import './MapPicker.css';

const MapPicker = ({ onLocationSelect, initialLat, initialLng }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [coordinates, setCoordinates] = useState({
    lat: initialLat || 36.8065, // Default to Tunis
    lng: initialLng || 10.1815
  });

  useEffect(() => {
    // Load Mapbox script
    if (!window.mapboxgl) {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
      script.async = true;
      script.onload = initializeMap;
      document.head.appendChild(script);

      const link = document.createElement('link');
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    } else {
      initializeMap();
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, []);

  const initializeMap = () => {
    const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN || 'pk.eyJ1IjoiYXltZW5qYWxsb3VsaSIsImEiOiJjbThnbDA3eTIwanY2MmxzZDdpZXJocGVuIn0.5CM0j5TSsORXd6mbsTf-6Q';
    
    if (!window.mapboxgl) return;

    window.mapboxgl.accessToken = mapboxToken;

    const map = new window.mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [coordinates.lng, coordinates.lat],
      zoom: 12
    });

    mapRef.current = map;

    // Add navigation controls
    map.addControl(new window.mapboxgl.NavigationControl(), 'top-right');

    // Add initial marker
    const marker = new window.mapboxgl.Marker({
      draggable: true,
      color: '#3b82f6'
    })
      .setLngLat([coordinates.lng, coordinates.lat])
      .addTo(map);

    markerRef.current = marker;

    // Update coordinates when marker is dragged
    marker.on('dragend', () => {
      const lngLat = marker.getLngLat();
      updateCoordinates(lngLat.lat, lngLat.lng);
    });

    // Add click listener to map
    map.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      marker.setLngLat([lng, lat]);
      updateCoordinates(lat, lng);
    });

    // Add geocoder control (search box)
    if (window.MapboxGeocoder) {
      const geocoder = new window.MapboxGeocoder({
        accessToken: mapboxToken,
        mapboxgl: window.mapboxgl,
        marker: false
      });

      map.addControl(geocoder);

      geocoder.on('result', (e) => {
        const [lng, lat] = e.result.center;
        marker.setLngLat([lng, lat]);
        updateCoordinates(lat, lng);
      });
    } else {
      // Load geocoder if not already loaded
      const geocoderScript = document.createElement('script');
      geocoderScript.src = 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.min.js';
      document.head.appendChild(geocoderScript);

      const geocoderLink = document.createElement('link');
      geocoderLink.href = 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.css';
      geocoderLink.rel = 'stylesheet';
      document.head.appendChild(geocoderLink);
    }
  };

  const updateCoordinates = (lat, lng) => {
    const newCoords = {
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6))
    };
    setCoordinates(newCoords);
    if (onLocationSelect) {
      onLocationSelect(newCoords);
    }
  };

  return (
    <div className="map-picker">
      <div className="map-info">
        <div className="coordinate-display">
          <div className="coordinate-item">
            <span className="coordinate-label">📍 Latitude:</span>
            <span className="coordinate-value">{coordinates.lat}</span>
          </div>
          <div className="coordinate-item">
            <span className="coordinate-label">📍 Longitude:</span>
            <span className="coordinate-value">{coordinates.lng}</span>
          </div>
        </div>
        <p className="map-instruction">
          Click on the map or drag the marker to select a location
        </p>
      </div>
      <div ref={mapContainerRef} className="map-container" />
    </div>
  );
};

export default MapPicker;

/**
 * geocodingService.ts
 * Reverse geocoding and Google Maps script loader for SmartEnv
 */

declare global {
  interface Window {
    google?: any;
    initGoogleMapsPromise?: Promise<any>;
  }
}

// In-memory cache for resolved reverse geocoded addresses: "lat,lng" -> "Formatted Address"
const addressCache = new Map<string, string>();

/**
 * Dynamically loads Google Maps JavaScript API with places & geometry libraries
 */
export const loadGoogleMaps = (apiKey: string): Promise<any> => {
  if (typeof window === 'undefined') return Promise.reject('Window undefined');

  if (window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (window.initGoogleMapsPromise) {
    return window.initGoogleMapsPromise;
  }

  window.initGoogleMapsPromise = new Promise((resolve, reject) => {
    // Check if script already exists
    const existingScript = document.getElementById('google-maps-sdk');
    if (existingScript) {
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkInterval);
          resolve(window.google.maps);
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-sdk';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error('Google Maps loaded but window.google.maps is unavailable'));
      }
    };

    script.onerror = (err) => {
      console.warn('[GoogleMaps] Script load error:', err);
      reject(err);
    };

    document.head.appendChild(script);
  });

  return window.initGoogleMapsPromise;
};

/**
 * Reverse geocodes coordinates (lat, lng) to a human-readable street address in Akure.
 * Uses Google Maps Geocoder if available, with OpenStreetMap Nominatim fallback.
 */
export const getReadableAddress = async (lat: number, lng: number): Promise<string> => {
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) return 'Unknown location';

  // Round to ~11 meters precision for efficient caching
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (addressCache.has(cacheKey)) {
    return addressCache.get(cacheKey)!;
  }

  // 1. Try Google Maps Geocoder if loaded
  if (window.google && window.google.maps && window.google.maps.Geocoder) {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const googleAddress = await new Promise<string | null>((resolve) => {
        geocoder.geocode(
          { location: { lat, lng } },
          (results: any[], status: string) => {
            if (status === 'OK' && results && results.length > 0) {
              // Prefer route/neighborhood + city if available
              resolve(results[0].formatted_address);
            } else {
              resolve(null);
            }
          }
        );
      });

      if (googleAddress) {
        addressCache.set(cacheKey, googleAddress);
        return googleAddress;
      }
    } catch (err) {
      console.warn('[Google Geocoder] Reverse geocoding failed:', err);
    }
  }

  // 2. Fallback to OpenStreetMap Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'User-Agent': 'SmartEnv-Admin-Dashboard/1.0' } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.display_name) {
        const parts = data.display_name.split(',').slice(0, 3).join(',').trim();
        const cleaned = parts || data.display_name;
        addressCache.set(cacheKey, cleaned);
        return cleaned;
      }
    }
  } catch (err) {
    // Ignore fallback error
  }

  // 3. Fallback to coordinate string with Akure locality
  const fallback = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E, Akure`;
  addressCache.set(cacheKey, fallback);
  return fallback;
};

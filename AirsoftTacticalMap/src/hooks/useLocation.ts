// src/hooks/useLocation.ts
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';

export interface LocationData {
  latitude: number;
  longitude: number;
  heading: number;
  accuracy?: number;
}

export const useLocation = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<boolean>(false);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    let magnetometerSubscription: { remove: () => void } | null = null;

    const setupLocation = async () => {
      try {
        // Request permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied');
          return;
        }
        setPermission(true);

        // Start location tracking
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          (locationUpdate) => {
            setLocation(prev => ({
              latitude: locationUpdate.coords.latitude,
              longitude: locationUpdate.coords.longitude,
              heading: prev?.heading || 0,
              accuracy: locationUpdate.coords.accuracy || undefined,
            }));
          }
        );

        // Start magnetometer for heading
        magnetometerSubscription = Magnetometer.addListener(({ x, y, z }) => {
          const heading = Math.atan2(y, x) * (180 / Math.PI);
          const normalizedHeading = (heading + 360) % 360;
          
          setLocation(prev => prev ? {
            ...prev,
            heading: normalizedHeading
          } : null);
        });

        Magnetometer.setUpdateInterval(500);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    setupLocation();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
      if (magnetometerSubscription) {
        magnetometerSubscription.remove();
      }
    };
  }, []);

  return { location, error, permission };
};
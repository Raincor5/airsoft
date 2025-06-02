import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { Platform, Alert } from 'react-native';

// Default location (San Francisco) to use when real location is not available
const DEFAULT_LOCATION = {
  latitude: 37.78825,
  longitude: -122.4324,
  heading: 0
};

export const useLocation = () => {
  const [location, setLocation] = useState(null);
  const [heading, setHeading] = useState(0);
  const [locationStatus, setLocationStatus] = useState('Requesting permissions...');
  const [error, setError] = useState(null);
  
  const locationSubscription = useRef(null);
  const magnetometerSubscription = useRef(null);
  const initAttempted = useRef(false);

  // Helper function to validate location data
  const isValidLocation = (coords) => {
    return (
      coords && 
      typeof coords.latitude === 'number' &&
      typeof coords.longitude === 'number' &&
      Math.abs(coords.latitude) <= 90 &&
      Math.abs(coords.longitude) <= 180 &&
      coords.latitude !== 0 &&
      coords.longitude !== 0
    );
  };

  useEffect(() => {
    (async () => {
      try {
        // Prevent multiple initialization attempts
        if (initAttempted.current) return;
        initAttempted.current = true;
        
        setLocationStatus('Requesting location permissions...');
        
        // Request permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationStatus('Location permission denied');
          setError('Location permission denied');
          Alert.alert(
            'Permission Required',
            'Location permission is required for this app to work properly.',
            [{ text: 'OK' }]
          );
          
          // Set default location if permission denied
          setLocation(DEFAULT_LOCATION);
          return;
        }
        
        setLocationStatus('Getting your location...');
        
        // Set a timeout for initial location
        const locationTimeout = setTimeout(() => {
          if (!location) {
            console.log('Location timeout - using default location');
            setLocation(DEFAULT_LOCATION);
            setLocationStatus('Using default location');
          }
        }, 10000); // 10 second timeout
        
        try {
          // Get initial location
          const locationData = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.BestForNavigation
          });
          
          // Clear timeout since we got a location
          clearTimeout(locationTimeout);
          
          // Validate initial location
          if (isValidLocation(locationData.coords)) {
            const initialLocation = {
              latitude: locationData.coords.latitude,
              longitude: locationData.coords.longitude,
              heading: locationData.coords.heading || 0
            };
            
            setLocation(initialLocation);
          } else {
            console.warn('Invalid initial location - using default');
            setLocation(DEFAULT_LOCATION);
          }
        } catch (locError) {
          console.error('Initial location error:', locError);
          setLocation(DEFAULT_LOCATION);
          setLocationStatus('Using default location');
        }
        
        // Start watching location
        try {
          locationSubscription.current = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.BestForNavigation,
              timeInterval: 1000,
              distanceInterval: 1
            },
            (locationData) => {
              // Validate location before using
              if (isValidLocation(locationData.coords)) {
                setLocation(prevLocation => {
                  const newLocation = {
                    latitude: locationData.coords.latitude,
                    longitude: locationData.coords.longitude,
                    heading: prevLocation?.heading || heading
                  };
                  return newLocation;
                });
                setLocationStatus('Location active');
              }
            }
          );
        } catch (watchError) {
          console.error('Watch position error:', watchError);
          // We already have default location set if needed
        }
        
        // Initialize magnetometer for compass
        try {
          if (await Magnetometer.isAvailableAsync()) {
            // Request permissions on iOS
            if (Platform.OS === 'ios') {
              await Magnetometer.requestPermissionsAsync();
            }
            
            magnetometerSubscription.current = Magnetometer.addListener((data) => {
              let angle = Math.atan2(data.y, data.x);
              angle = angle * (180 / Math.PI);
              angle = angle + 90;
              angle = (angle + 360) % 360;
              
              setHeading(angle);
              setLocation(prevLocation => {
                if (!prevLocation) return DEFAULT_LOCATION;
                return {
                  ...prevLocation,
                  heading: angle
                };
              });
            });
            
            Magnetometer.setUpdateInterval(250);
          }
        } catch (compassError) {
          console.error('Compass setup error:', compassError);
          // Not critical, we can continue without compass
        }
        
      } catch (error) {
        console.error('Location setup error:', error);
        setLocationStatus('Location error');
        setError(error.message);
        setLocation(DEFAULT_LOCATION);
        Alert.alert('Error', 'Failed to setup location services: ' + error.message);
      }
    })();
    
    // Cleanup
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (magnetometerSubscription.current) {
        magnetometerSubscription.current.remove();
      }
    };
  }, []);

  return {
    // Always return at least the default location if real location is null
    location: location || DEFAULT_LOCATION,
    heading,
    locationStatus,
    error
  };
};
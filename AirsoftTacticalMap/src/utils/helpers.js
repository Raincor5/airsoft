import { Dimensions } from 'react-native';
import { 
  normalize as normalizeFromStyles, 
  isSmallScreen,
  isMediumScreen,
  isLargeScreen,
  isTabletScreen,
  getResponsiveSize,
  SCREEN_SIZES
} from './styles';

const { width } = Dimensions.get('window');

// Re-export all responsive scaling utilities for backward compatibility
export const normalize = normalizeFromStyles;
export { 
  isSmallScreen, 
  isMediumScreen,
  isLargeScreen, 
  isTabletScreen,
  getResponsiveSize,
  SCREEN_SIZES
};

// Generate random session code
export const generateSessionCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Helper function for compass directions
export const getCardinalDirection = (heading) => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(heading / 45) % 8;
  return directions[index];
};

// Validate location coordinates
export const isValidLocation = (location) => {
  if (!location) return false;
  
  const { latitude, longitude } = location;
  
  return (
    latitude && 
    longitude &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180 &&
    latitude !== 0 &&
    longitude !== 0
  );
};

// Format time for display
export const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Calculate distance between two coordinates in meters
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = 
    Math.sin(Δφ/2) * Math.sin(Δφ/2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c;
  
  return d; // Distance in meters
};
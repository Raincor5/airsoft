import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Screen size breakpoints
export const SCREEN_SIZES = {
  SMALL: 320,  // iPhone SE, older small devices
  MEDIUM: 375, // iPhone X, standard size
  LARGE: 414,  // iPhone Plus/Max sizes
  TABLET: 768  // iPad and larger
};

// Improved responsive scaling for different screen sizes
export const isSmallScreen = width < SCREEN_SIZES.MEDIUM;
export const isMediumScreen = width >= SCREEN_SIZES.MEDIUM && width < SCREEN_SIZES.LARGE;
export const isLargeScreen = width >= SCREEN_SIZES.LARGE && width < SCREEN_SIZES.TABLET;
export const isTabletScreen = width >= SCREEN_SIZES.TABLET;

// Responsive scaling with minimum size protection for small screens
const baseWidth = 375; // Base on iPhone X width
const scaleValue = width / baseWidth;

export const normalize = (size) => {
  // For very small screens, use a minimum scale to prevent things from getting too small
  if (width < SCREEN_SIZES.SMALL) {
    // Apply a minimum scale of 0.85 for extremely small screens
    const minScale = 0.85;
    return Math.round(Math.max(size * scaleValue, size * minScale));
  }
  
  // For small screens, apply a more gentle scaling
  if (width < SCREEN_SIZES.MEDIUM) {
    // Reduce scaling impact on small screens to prevent elements from being too small
    const adjustedScale = 0.9 + (scaleValue * 0.1);
    return Math.round(size * adjustedScale);
  }
  
  // For tablets and large screens, cap the maximum scaling
  if (width >= SCREEN_SIZES.TABLET) {
    const maxScale = 1.3;
    return Math.round(Math.min(size * scaleValue, size * maxScale));
  }
  
  // Standard scaling for medium to large phones
  return Math.round(size * scaleValue);
};

// Get responsive size based on screen width
export const getResponsiveSize = (smallSize, mediumSize, largeSize, tabletSize) => {
  if (isTabletScreen) return tabletSize || largeSize;
  if (isLargeScreen) return largeSize;
  if (isSmallScreen) return smallSize;
  return mediumSize;
};

// Common colors
export const colors = {
  primary: '#007AFF',
  secondary: '#34C759',
  danger: '#FF3B30',
  warning: '#FF9500',
  info: '#5AC8FA',
  success: '#4CD964',
  background: {
    dark: '#000000',
    lightDark: '#1a1a1a',
    medium: '#333333',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#BBBBBB',
    muted: '#999999',
  },
  teams: {
    red: '#FF4444',
    blue: '#4444FF',
    green: '#44FF44',
    yellow: '#FFFF44',
  }
};

// Common spacing values with responsive scaling
export const spacing = {
  xxs: normalize(2),
  xs: normalize(5),
  sm: normalize(10),
  md: normalize(15),
  lg: normalize(20),
  xl: normalize(30),
  xxl: normalize(40),
  
  // Responsive spacing helpers
  get small() {
    return {
      xxs: normalize(1),
      xs: normalize(3),
      sm: normalize(6),
      md: normalize(10),
      lg: normalize(16),
      xl: normalize(24),
      xxl: normalize(32),
    };
  }
};

// Common radius values
export const radius = {
  xs: normalize(5),
  sm: normalize(10),
  md: normalize(15),
  lg: normalize(20),
  round: normalize(1000), // For rounded corners (circles)
  
  // Responsive radius helpers for small screens
  get small() {
    return {
      xs: normalize(3),
      sm: normalize(6),
      md: normalize(10),
      lg: normalize(15),
      round: normalize(1000)
    };
  }
};

// Common text styles with responsive sizing
export const typography = StyleSheet.create({
  title: {
    fontSize: getResponsiveSize(normalize(20), normalize(24), normalize(26), normalize(30)),
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: getResponsiveSize(normalize(16), normalize(18), normalize(20), normalize(24)),
    fontWeight: '600',
    color: colors.text.primary,
  },
  body: {
    fontSize: getResponsiveSize(normalize(14), normalize(16), normalize(16), normalize(18)),
    color: colors.text.primary,
  },
  caption: {
    fontSize: getResponsiveSize(normalize(12), normalize(14), normalize(15), normalize(16)),
    color: colors.text.secondary,
  },
  small: {
    fontSize: getResponsiveSize(normalize(10), normalize(12), normalize(13), normalize(14)),
    color: colors.text.muted,
  },
});

// Common layout styles
export const layout = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  column: {
    flexDirection: 'column',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? spacing.md : 0,
  },
});

// Common component styles with responsive sizing
export const components = StyleSheet.create({
  // Buttons
  button: {
    backgroundColor: colors.primary,
    paddingVertical: isSmallScreen ? spacing.small.md : spacing.md,
    paddingHorizontal: isSmallScreen ? spacing.small.lg : spacing.lg,
    borderRadius: isSmallScreen ? radius.small.sm : radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: normalize(100),
  },
  buttonText: {
    color: colors.text.primary,
    fontWeight: '600',
    fontSize: getResponsiveSize(normalize(14), normalize(16), normalize(16), normalize(18)),
  },
  buttonIcon: {
    marginRight: isSmallScreen ? spacing.small.sm : spacing.sm,
  },
  
  // Inputs
  input: {
    backgroundColor: colors.background.medium,
    color: colors.text.primary,
    paddingVertical: isSmallScreen ? spacing.small.md : spacing.md,
    paddingHorizontal: isSmallScreen ? spacing.small.md : spacing.md,
    borderRadius: isSmallScreen ? radius.small.sm : radius.sm,
    fontSize: getResponsiveSize(normalize(14), normalize(16), normalize(16), normalize(18)),
  },
  
  // Cards
  card: {
    backgroundColor: colors.background.lightDark,
    borderRadius: isSmallScreen ? radius.small.md : radius.md,
    padding: isSmallScreen ? spacing.small.lg : spacing.lg,
    marginVertical: isSmallScreen ? spacing.small.sm : spacing.sm,
  },
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.background.lightDark,
    borderRadius: isSmallScreen ? radius.small.md : radius.md,
    padding: isSmallScreen ? spacing.small.lg : spacing.lg,
    width: Math.min(width * (isSmallScreen ? 0.9 : 0.85), normalize(400)),
    maxHeight: height * (isSmallScreen ? 0.85 : 0.8),
  },
  modalTitle: {
    ...(isSmallScreen ? {
      fontSize: normalize(18),
      fontWeight: 'bold',
      color: colors.text.primary,
    } : typography.title),
    textAlign: 'center',
    marginBottom: isSmallScreen ? spacing.small.lg : spacing.lg,
  },
  
  // Map markers
  markerContainer: {
    alignItems: 'center',
  },
  userMarker: {
    width: getResponsiveSize(normalize(30), normalize(36), normalize(40), normalize(44)),
    height: getResponsiveSize(normalize(30), normalize(36), normalize(40), normalize(44)),
    borderRadius: getResponsiveSize(normalize(15), normalize(18), normalize(20), normalize(22)),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: isSmallScreen ? 2 : 3,
    borderColor: colors.text.primary,
    overflow: 'visible',
  },
  playerMarker: {
    width: getResponsiveSize(normalize(24), normalize(30), normalize(34), normalize(38)),
    height: getResponsiveSize(normalize(24), normalize(30), normalize(34), normalize(38)),
    borderRadius: getResponsiveSize(normalize(12), normalize(15), normalize(17), normalize(19)),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: isSmallScreen ? 2 : 3,
    borderColor: colors.text.primary,
    overflow: 'visible',
  },
});

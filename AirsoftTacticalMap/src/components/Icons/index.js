import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Responsive icon helpers
const IconWrapper = ({ children, style }) => (
  <View style={[{ justifyContent: 'center', alignItems: 'center' }, style]}>
    {children}
  </View>
);

// Simple icon components for airsoft app
export const Icons = {
  Compass: ({ size = 20, color = 'white' }) => (
    <IconWrapper>
      <View style={[styles.iconCircle, { width: size, height: size, borderColor: color }]}>
        <Text style={[styles.iconText, { color, fontSize: size * 0.6 }]}>N</Text>
      </View>
    </IconWrapper>
  ),

  Users: ({ size = 20, color = 'white' }) => (
    <IconWrapper>
      <View style={[styles.iconRect, { width: size, height: size * 0.8, borderColor: color }]}>
        <Text style={[styles.iconText, { color, fontSize: size * 0.5 }]}>👥</Text>
      </View>
    </IconWrapper>
  ),

  MessageCircle: ({ size = 20, color = 'white' }) => (
    <IconWrapper>
      <View style={[styles.iconCircle, { width: size, height: size, borderColor: color }]}>
        <Text style={[styles.iconText, { color, fontSize: size * 0.5 }]}>💬</Text>
      </View>
    </IconWrapper>
  ),

  Flag: ({ size = 20, color = 'white' }) => (
    <IconWrapper>
      <Text style={[styles.iconText, { color, fontSize: size }]}>🚩</Text>
    </IconWrapper>
  ),

  AlertTriangle: ({ size = 20, color = 'white' }) => (
    <IconWrapper>
      <Text style={[styles.iconText, { color, fontSize: size }]}>⚠️</Text>
    </IconWrapper>
  ),

  Eye: ({ size = 20, color = 'white' }) => (
    <IconWrapper>
      <Text style={[styles.iconText, { color, fontSize: size }]}>👁️</Text>
    </IconWrapper>
  ),

  Zap: ({ size = 20, color = 'white' }) => (
    <IconWrapper>
      <Text style={[styles.iconText, { color, fontSize: size }]}>⚡</Text>
    </IconWrapper>
  ),

  Target: ({ size = 20, color = 'white' }) => (
    <IconWrapper>
      <Text style={[styles.iconText, { color, fontSize: size }]}>🎯</Text>
    </IconWrapper>
  ),

  Shield: ({ size = 20, color = 'white' }) => (
    <IconWrapper>
      <Text style={[styles.iconText, { color, fontSize: size }]}>🛡️</Text>
    </IconWrapper>
  ),

  Navigation: ({ size = 20, color = 'white' }) => (
    <IconWrapper>
      <Text style={[styles.iconText, { color, fontSize: size }]}>🧭</Text>
    </IconWrapper>
  ),

  MapPin: ({ size = 20, color = 'white' }) => (
    <IconWrapper>
      <Text style={[styles.iconText, { color, fontSize: size }]}>📍</Text>
    </IconWrapper>
  ),

  Share: ({ size = 20, color = 'white' }) => (
    <IconWrapper>
      <Text style={[styles.iconText, { color, fontSize: size }]}>📤</Text>
    </IconWrapper>
  ),

  Copy: ({ size = 20, color = 'white' }) => (
    <IconWrapper>
      <Text style={[styles.iconText, { color, fontSize: size }]}>📋</Text>
    </IconWrapper>
  ),

  Chat: ({ size = 20, color = 'white' }) => (
    <IconWrapper>
      <Text style={[styles.iconText, { color, fontSize: size }]}>💬</Text>
    </IconWrapper>
  )
};

const styles = StyleSheet.create({
  iconCircle: {
    borderWidth: 2,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconRect: {
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default Icons;
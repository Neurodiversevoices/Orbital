/**
 * IPhoneFrame - Premium iPhone device mockup wrapper
 *
 * Renders content inside a realistic iPhone 14/15 Pro style device frame.
 * Designed for screenshots, demos, and landing pages.
 * Fully responsive for mobile Safari viewing.
 *
 * Usage:
 *   <IPhoneFrame>
 *     <YourContent />
 *   </IPhoneFrame>
 *
 * Screenshot mode:
 *   <IPhoneFrame mode="screenshot" />
 *
 * Responsive mode (for viewing on actual iPhones):
 *   <IPhoneFrame mode="responsive" />
 */

import React, { ReactNode, useEffect, useState } from 'react';
import { View, StyleSheet, Platform, Dimensions, useWindowDimensions } from 'react-native';
import { IPhoneStatusBar } from './IPhoneStatusBar';

// iPhone 14/15 Pro aspect ratio: 393 x 852 = ~0.461
const IPHONE_ASPECT_RATIO = 393 / 852;

// Frame adds bezel around screen
const FRAME_TO_SCREEN_RATIO = 433 / 393; // ~1.1

interface IPhoneFrameProps {
  children?: ReactNode;
  width?: number;
  time?: string;
  batteryLevel?: number;
  showStatusBar?: boolean;
  showHomeIndicator?: boolean;
  backgroundColor?: string;
  frameColor?: string;
  mode?: 'embed' | 'screenshot' | 'responsive';
}

export function IPhoneFrame({
  children,
  width: fixedWidth,
  time = '9:41',
  batteryLevel = 100,
  showStatusBar = true,
  showHomeIndicator = true,
  backgroundColor = '#05060A',
  frameColor = '#1C1C1E',
  mode = 'embed',
}: IPhoneFrameProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Calculate responsive dimensions
  const isResponsive = mode === 'responsive';
  const isScreenshot = mode === 'screenshot';

  // For responsive mode: fit within viewport with padding
  // For screenshot/embed mode: use fixed width or default
  let screenWidth: number;
  let screenHeight: number;

  if (isResponsive) {
    // Mobile-first: fit the device frame within the viewport
    const viewportPadding = 16;
    const maxWidth = windowWidth - (viewportPadding * 2);
    const maxHeight = windowHeight - (viewportPadding * 2);

    // Calculate based on aspect ratio, fitting within both constraints
    const widthFromHeight = maxHeight * IPHONE_ASPECT_RATIO;
    const heightFromWidth = maxWidth / IPHONE_ASPECT_RATIO;

    if (widthFromHeight <= maxWidth) {
      // Height is the limiting factor
      screenWidth = widthFromHeight;
      screenHeight = maxHeight;
    } else {
      // Width is the limiting factor
      screenWidth = maxWidth;
      screenHeight = heightFromWidth;
    }

    // Account for frame bezel
    screenWidth = screenWidth / FRAME_TO_SCREEN_RATIO;
    screenHeight = screenHeight / FRAME_TO_SCREEN_RATIO;
  } else {
    // Fixed width mode
    screenWidth = fixedWidth || 390;
    screenHeight = screenWidth / IPHONE_ASPECT_RATIO;
  }

  // Calculate frame dimensions (device shell is larger than screen)
  const frameWidth = screenWidth * FRAME_TO_SCREEN_RATIO;
  const frameHeight = screenHeight * FRAME_TO_SCREEN_RATIO;
  const bezelWidth = (frameWidth - screenWidth) / 2;

  // Border radii scale with size
  const screenRadius = screenWidth * 0.12;
  const frameRadius = frameWidth * 0.127;

  // Safe areas scale with size
  const safeAreaTop = screenHeight * 0.069; // ~59pt on standard iPhone
  const safeAreaBottom = screenHeight * 0.04; // ~34pt on standard iPhone

  // Button sizes scale with frame
  const buttonScale = frameHeight / 892;

  return (
    <View style={[
      styles.wrapper,
      isScreenshot && styles.screenshotWrapper,
      isResponsive && styles.responsiveWrapper,
    ]}>
      {/* Device Frame */}
      <View
        style={[
          styles.deviceFrame,
          {
            width: frameWidth,
            height: frameHeight,
            borderRadius: frameRadius,
            backgroundColor: frameColor,
          },
        ]}
      >
        {/* Side buttons */}
        <View style={[styles.sideButton, { left: -3, top: frameHeight * 0.12, height: 18 * buttonScale, backgroundColor: frameColor }]} />
        <View style={[styles.sideButton, { left: -3, top: frameHeight * 0.18, height: 32 * buttonScale, backgroundColor: frameColor }]} />
        <View style={[styles.sideButton, { left: -3, top: frameHeight * 0.26, height: 32 * buttonScale, backgroundColor: frameColor }]} />
        <View style={[styles.sideButton, { right: -3, top: frameHeight * 0.22, height: 60 * buttonScale, backgroundColor: frameColor }]} />

        {/* Screen */}
        <View
          style={[
            styles.screen,
            {
              margin: bezelWidth,
              borderRadius: screenRadius,
              backgroundColor,
            },
          ]}
        >
          {/* Status Bar */}
          {showStatusBar && (
            <View style={[styles.statusBarContainer, { height: safeAreaTop }]}>
              <IPhoneStatusBar time={time} batteryLevel={batteryLevel} isDark />
            </View>
          )}

          {/* Content Area */}
          <View style={[styles.contentArea, { paddingTop: safeAreaTop, paddingBottom: safeAreaBottom }]}>
            {children}
          </View>

          {/* Home Indicator */}
          {showHomeIndicator && (
            <View style={[styles.homeIndicatorContainer, { height: safeAreaBottom }]}>
              <View style={[styles.homeIndicator, { width: screenWidth * 0.34 }]} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenshotWrapper: {
    flex: 1,
    backgroundColor: '#000000',
    ...(Platform.OS === 'web' ? { minHeight: '100vh' as any } : {}),
    padding: 40,
  },
  responsiveWrapper: {
    flex: 1,
    backgroundColor: '#000000',
    ...(Platform.OS === 'web' ? {
      minHeight: '100vh' as any,
      minHeight: '100dvh' as any, // Dynamic viewport height for mobile
    } : {}),
    padding: 8,
    // Safe area padding for actual devices
    ...(Platform.OS === 'web' ? {
      paddingTop: 'max(8px, env(safe-area-inset-top))' as any,
      paddingBottom: 'max(8px, env(safe-area-inset-bottom))' as any,
      paddingLeft: 'max(8px, env(safe-area-inset-left))' as any,
      paddingRight: 'max(8px, env(safe-area-inset-right))' as any,
    } : {}),
  },
  deviceFrame: {
    position: 'relative',
    // Shadow for depth
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 25 },
          shadowOpacity: 0.6,
          shadowRadius: 50,
          elevation: 25,
        }),
  },
  screen: {
    flex: 1,
    overflow: 'hidden',
  },
  statusBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  contentArea: {
    flex: 1,
    overflow: 'hidden',
  },
  homeIndicatorContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  homeIndicator: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
  },
  sideButton: {
    position: 'absolute',
    width: 3,
    borderRadius: 1.5,
  },
});

export default IPhoneFrame;

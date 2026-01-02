/**
 * IPhoneStatusBar - Realistic iOS status bar for device mockups
 *
 * Renders a standard iPhone 14/15 style status bar with:
 * - Time (left)
 * - Dynamic Island / Notch space (center)
 * - Signal, WiFi, Battery (right)
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Path, Rect, G } from 'react-native-svg';

interface IPhoneStatusBarProps {
  time?: string;
  batteryLevel?: number;
  isCharging?: boolean;
  isDark?: boolean;
}

export function IPhoneStatusBar({
  time = '9:41',
  batteryLevel = 100,
  isCharging = false,
  isDark = true,
}: IPhoneStatusBarProps) {
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const iconColor = isDark ? '#FFFFFF' : '#000000';

  return (
    <View style={styles.container}>
      {/* Left side - Time */}
      <View style={styles.leftSection}>
        <Text style={[styles.time, { color: textColor }]}>{time}</Text>
      </View>

      {/* Center - Dynamic Island space */}
      <View style={styles.centerSection}>
        <View style={styles.dynamicIsland} />
      </View>

      {/* Right side - Status icons */}
      <View style={styles.rightSection}>
        {/* Signal bars */}
        <Svg width={17} height={12} viewBox="0 0 17 12">
          <G fill={iconColor}>
            <Rect x="0" y="8" width="3" height="4" rx="1" />
            <Rect x="4.5" y="5" width="3" height="7" rx="1" />
            <Rect x="9" y="2" width="3" height="10" rx="1" />
            <Rect x="13.5" y="0" width="3" height="12" rx="1" />
          </G>
        </Svg>

        {/* WiFi icon */}
        <Svg width={16} height={12} viewBox="0 0 16 12" style={styles.iconSpacing}>
          <Path
            d="M8 2.4C10.2 2.4 12.2 3.2 13.8 4.4L15 3C13.1 1.4 10.7 0.4 8 0.4C5.3 0.4 2.9 1.4 1 3L2.2 4.4C3.8 3.2 5.8 2.4 8 2.4ZM8 5.6C9.5 5.6 10.9 6.1 12 6.9L13.2 5.5C11.8 4.5 10 3.9 8 3.9C6 3.9 4.2 4.5 2.8 5.5L4 6.9C5.1 6.1 6.5 5.6 8 5.6ZM8 8.8C8.8 8.8 9.5 9 10.1 9.4L11.3 8C10.4 7.4 9.2 7 8 7C6.8 7 5.6 7.4 4.7 8L5.9 9.4C6.5 9 7.2 8.8 8 8.8ZM8 12C8.8 12 9.5 11.3 9.5 10.5C9.5 9.7 8.8 9 8 9C7.2 9 6.5 9.7 6.5 10.5C6.5 11.3 7.2 12 8 12Z"
            fill={iconColor}
          />
        </Svg>

        {/* Battery */}
        <View style={styles.batteryContainer}>
          <View style={[styles.batteryBody, { borderColor: iconColor }]}>
            <View
              style={[
                styles.batteryLevel,
                {
                  width: `${batteryLevel}%`,
                  backgroundColor: batteryLevel <= 20 ? '#FF3B30' : iconColor,
                },
              ]}
            />
          </View>
          <View style={[styles.batteryTip, { backgroundColor: iconColor }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  time: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  dynamicIsland: {
    width: 126,
    height: 37,
    backgroundColor: '#000000',
    borderRadius: 24,
  },
  iconSpacing: {
    marginLeft: 6,
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  batteryBody: {
    width: 25,
    height: 12,
    borderWidth: 1,
    borderRadius: 3,
    padding: 1,
    justifyContent: 'center',
  },
  batteryLevel: {
    height: '100%',
    borderRadius: 1,
  },
  batteryTip: {
    width: 2,
    height: 5,
    borderTopRightRadius: 1,
    borderBottomRightRadius: 1,
    marginLeft: 1,
    opacity: 0.4,
  },
});

export default IPhoneStatusBar;

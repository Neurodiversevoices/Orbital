import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';

interface ProprietaryFooterProps {
  showTermsLink?: boolean;
  onTermsPress?: () => void;
  compact?: boolean;
}

export function ProprietaryFooter({
  showTermsLink = true,
  onTermsPress,
  compact = false,
}: ProprietaryFooterProps) {
  const handleTermsPress = () => {
    if (onTermsPress) {
      onTermsPress();
    }
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactText}>
          Confidential & Proprietary
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.proprietaryText}>
        Confidential & Proprietary
      </Text>
      {showTermsLink && (
        <>
          <Text style={styles.separator}> | </Text>
          <TouchableOpacity onPress={handleTermsPress}>
            <Text style={styles.linkText}>Terms of Service</Text>
          </TouchableOpacity>
        </>
      )}
      <Text style={styles.companyText}>
        {'\n'}Orbital Health Intelligence, Inc.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  compactContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  proprietaryText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  separator: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 11,
  },
  linkText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  compactText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  companyText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 10,
    marginTop: 4,
  },
});

export default ProprietaryFooter;

/**
 * REDEEM INVITE
 *
 * Two methods:
 * 1. QR deep-link (preferred, more secure)
 * 2. Display code + PIN (backup, for verbal/text sharing)
 *
 * Includes ephemeral handshake label for identity verification.
 * The label is NOT stored in the permanent connection record.
 */

import React, { useState, useEffect } from 'react';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { CirclesAPI, CircleSecurityError, CircleSecurityEvent } from './_api';
import {
  Screen,
  Card,
  PrimaryButton,
  SecondaryButton,
  Muted,
  Input,
  StatusMessage,
  Label,
} from './_ui';
import { shouldShareNameInCircles, loadIdentity } from '../../lib/profile';

/**
 * Get user-friendly error message from security error.
 */
function getSecurityErrorMessage(error: unknown): string {
  if (error instanceof CircleSecurityError) {
    switch (error.code) {
      case CircleSecurityEvent.CIRCLES_RATE_LIMITED:
        return 'Too many attempts. Please wait before trying again.';
      case CircleSecurityEvent.INVITE_EXPIRED:
        return 'This invite has expired. Ask for a new one.';
      case CircleSecurityEvent.INVITE_LOCKED:
        return 'This invite has already been claimed by someone else.';
      case CircleSecurityEvent.INVITE_REVOKED:
        return 'This invite has been cancelled by the creator.';
      case CircleSecurityEvent.INVITE_NOT_FOUND:
        return 'Invite not found. Check the code and try again.';
      case CircleSecurityEvent.INVITE_INVALID_CREDENTIALS:
        return 'Invalid code or PIN. Please check and try again.';
      case CircleSecurityEvent.INVITE_SELF_REDEEM:
        return "You can't redeem your own invite.";
      case CircleSecurityEvent.CONNECTION_LIMIT_REACHED:
        return 'You have reached the maximum number of connections (25).';
      case CircleSecurityEvent.CONNECTION_BLOCKED_USER:
        return 'Cannot connect with this user.';
      default:
        return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Redeem failed';
}

export default function CirclesRedeem() {
  const router = useRouter();
  const [qrInput, setQrInput] = useState('');
  const [displayCode, setDisplayCode] = useState('');
  const [pin, setPin] = useState('');
  const [handshakeLabel, setHandshakeLabel] = useState('');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'info' | 'error' | 'success'>('info');
  const [loading, setLoading] = useState(false);

  // Auto-populate handshake label from identity if consent is granted
  // Fail closed: if consent check fails, leave empty (user can still enter manually)
  useEffect(() => {
    async function loadConsentedName() {
      try {
        const consentGranted = await shouldShareNameInCircles();
        if (consentGranted) {
          const identity = await loadIdentity();
          if (identity.displayName) {
            setHandshakeLabel(identity.displayName);
          }
        }
      } catch {
        // Fail closed: consent error means no auto-fill
      }
    }
    loadConsentedName();
  }, []);

  const canRedeemQr = qrInput.trim().length > 10;
  const canRedeemCode =
    displayCode.trim().length >= 6 && pin.trim().length === 4;

  async function redeemViaQR() {
    if (!canRedeemQr || loading) return;
    try {
      setLoading(true);
      setMsg('Redeeming...');
      setMsgType('info');
      await CirclesAPI.redeemByQr(qrInput.trim(), handshakeLabel.trim() || undefined);
      setMsg('Redeemed! Waiting for inviter to confirm...');
      setMsgType('success');
      setTimeout(() => router.replace('/circles'), 1500);
    } catch (e: unknown) {
      setMsg(getSecurityErrorMessage(e));
      setMsgType('error');
    } finally {
      setLoading(false);
    }
  }

  async function redeemViaCode() {
    if (!canRedeemCode || loading) return;
    try {
      setLoading(true);
      setMsg('Redeeming...');
      setMsgType('info');
      await CirclesAPI.redeemByCodePin(
        displayCode.trim().toUpperCase(),
        pin.trim(),
        handshakeLabel.trim() || undefined
      );
      setMsg('Redeemed! Waiting for inviter to confirm...');
      setMsgType('success');
      setTimeout(() => router.replace('/circles'), 1500);
    } catch (e: unknown) {
      setMsg(getSecurityErrorMessage(e));
      setMsgType('error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen title="Redeem Invite">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Muted>
          Redeeming does not create a connection yet. The inviter must confirm
          your identity (Final Handshake) before Circles activates.
        </Muted>

        <StatusMessage message={msg} type={msgType} />

        {/* Ephemeral Handshake Label */}
        <Card>
          <Label>Handshake Label (Optional)</Label>
          <Muted>
            A name or symbol to help the inviter identify you. This is ephemeral
            and will NOT be stored after the handshake completes.
          </Muted>
          <Input
            value={handshakeLabel}
            onChangeText={setHandshakeLabel}
            placeholder="Name or emoji (e.g., Alex)"
            autoCapitalize="words"
            maxLength={30}
          />
        </Card>

        {/* QR Method */}
        <Card>
          <Label>Preferred: QR Deep-Link</Label>
          <Muted>Paste the scanned QR deep-link here (orbital://invite/...).</Muted>
          <Input
            value={qrInput}
            onChangeText={setQrInput}
            placeholder="orbital://invite/..."
            autoCapitalize="none"
          />
          <PrimaryButton
            label={loading ? 'Redeeming...' : 'Redeem via QR'}
            disabled={!canRedeemQr || loading}
            onPress={redeemViaQR}
          />
        </Card>

        {/* Code + PIN Method */}
        <Card>
          <Label>Backup: Display Code + PIN</Label>
          <Muted>
            Enter the code (e.g., ABC-123) and the 4-digit PIN provided by the
            inviter.
          </Muted>
          <Input
            value={displayCode}
            onChangeText={setDisplayCode}
            placeholder="ABC-123"
            autoCapitalize="characters"
          />
          <Input
            value={pin}
            onChangeText={setPin}
            placeholder="4-digit PIN"
            keyboardType="numeric"
            maxLength={4}
          />
          <PrimaryButton
            label={loading ? 'Redeeming...' : 'Redeem via Code'}
            disabled={!canRedeemCode || loading}
            onPress={redeemViaCode}
          />
        </Card>

        <SecondaryButton label="Back to Circles" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  );
}

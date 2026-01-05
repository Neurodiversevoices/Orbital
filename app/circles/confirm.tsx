/**
 * CONFIRM HANDSHAKE
 *
 * Final step: inviter confirms recipient's identity to activate connection.
 * This blocks drive-by connections (unattended phone / shared screenshot).
 *
 * The handshake label is EPHEMERAL - it is used only for identification
 * during this handshake and is NOT stored in the permanent connection record.
 *
 * SECURITY: Handshake label is fetched from the invite record, NOT URL params.
 * This prevents URL leak of ephemeral data.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CirclesAPI } from './_api';
import {
  Screen,
  Card,
  PrimaryButton,
  SecondaryButton,
  DangerButton,
  Muted,
  StatusMessage,
  Label,
  dangerConfirm,
} from './_ui';

export default function CirclesConfirm() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const inviteId = (params.inviteId as string) || '';
  // SECURITY: Label is fetched from invite record, NOT URL params
  const [handshakeLabel, setHandshakeLabel] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'info' | 'error' | 'success'>('info');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Fetch handshake label from invite record (prevents URL leak)
  useEffect(() => {
    if (!inviteId) {
      setFetching(false);
      return;
    }

    CirclesAPI.getPendingConfirmation(inviteId)
      .then((pending) => {
        if (pending) {
          setHandshakeLabel(pending.handshakeLabel);
        } else {
          setMsg('Invite not found or no longer pending');
          setMsgType('error');
        }
      })
      .catch((e) => {
        setMsg(e instanceof Error ? e.message : 'Failed to load invite');
        setMsgType('error');
      })
      .finally(() => {
        setFetching(false);
      });
  }, [inviteId]);

  async function handleConfirm() {
    if (!inviteId || loading || !handshakeLabel) return;

    const ok = await dangerConfirm(
      `Connect with ${handshakeLabel}?`,
      'This creates a peer-to-peer connection with symmetric visibility. You will see their signal color and they will see yours.'
    );
    if (!ok) return;

    try {
      setLoading(true);
      setMsg('Confirming...');
      setMsgType('info');
      await CirclesAPI.confirmHandshake(inviteId);
      setMsg('Connection activated!');
      setMsgType('success');
      setTimeout(() => router.replace('/circles'), 1500);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Confirm failed';
      setMsg(message);
      setMsgType('error');
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!inviteId || loading) return;

    const ok = await dangerConfirm(
      'Reject request?',
      'This will invalidate the pending handshake. The person will need to request a new invite.'
    );
    if (!ok) return;

    try {
      setLoading(true);
      setMsg('Rejecting...');
      setMsgType('info');
      await CirclesAPI.rejectHandshake(inviteId);
      setMsg('Request rejected.');
      setMsgType('success');
      setTimeout(() => router.replace('/circles'), 1000);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Reject failed';
      setMsg(message);
      setMsgType('error');
      setLoading(false);
    }
  }

  // Show loading spinner while fetching invite data
  if (fetching) {
    return (
      <Screen title="Final Handshake">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
          <ActivityIndicator size="large" color="#19D3FF" />
          <Text style={{ color: '#8899AA', marginTop: 12 }}>Loading...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Final Handshake">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Muted>
          Confirm the recipient's identity. This blocks drive-by connections
          (unattended phone / shared screenshot). If you don't recognize the
          request, reject it.
        </Muted>

        <StatusMessage message={msg} type={msgType} />

        {/* Show content only if we have the handshake label */}
        {handshakeLabel ? (
          <>
            {/* Prominent handshake label display */}
            <Card>
              <Label>Confirm connection with:</Label>
              <View style={{ marginTop: 10, alignItems: 'center', paddingVertical: 16 }}>
                <Text
                  style={{
                    color: '#19D3FF',
                    fontSize: 28,
                    fontWeight: '900',
                  }}
                >
                  {handshakeLabel}
                </Text>
              </View>
              <Muted>
                This label was provided by the person who redeemed your invite.
                It is ephemeral and will not be stored.
              </Muted>
            </Card>

            <Card>
              <Label>What happens on confirm:</Label>
              <Muted>
                {'\u2022'} A bidirectional connection is created{'\n'}
                {'\u2022'} You can see their color signal{'\n'}
                {'\u2022'} They can see your color signal{'\n'}
                {'\u2022'} Either party can revoke at any time{'\n'}
                {'\u2022'} No history is kept
              </Muted>
            </Card>

            <PrimaryButton
              label={loading ? 'Processing...' : `Confirm ${handshakeLabel}`}
              disabled={!inviteId || loading}
              onPress={handleConfirm}
            />

            <DangerButton
              label="Reject Request"
              disabled={!inviteId || loading}
              onPress={handleReject}
            />
          </>
        ) : null}

        <SecondaryButton
          label="Back to Circles"
          disabled={loading}
          onPress={() => router.back()}
        />
      </ScrollView>
    </Screen>
  );
}

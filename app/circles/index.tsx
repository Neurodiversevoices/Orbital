/**
 * CIRCLES HUB
 *
 * Main Circles screen showing:
 * - Create invite button
 * - Redeem invite button
 * - Pending confirmations (invites awaiting your confirmation)
 * - Active connections
 *
 * NO TIMESTAMPS displayed - strictly compliant with procurement requirements.
 * Uses Latest-Call-Wins guard to prevent race conditions.
 */

import React, { useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { CirclesAPI, PendingConfirmation, ConnectionSummary } from './_api';
import {
  Screen,
  Card,
  PrimaryButton,
  SecondaryButton,
  Muted,
  StatusMessage,
  Divider,
  Label,
} from './_ui';

export default function CirclesHome() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingConfirmation[]>([]);
  const [connections, setConnections] = useState<ConnectionSummary[]>([]);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'info' | 'error'>('info');
  const [refreshing, setRefreshing] = useState(false);

  // Latest-Call-Wins guard: track request version to ignore stale responses
  const requestVersionRef = useRef(0);

  const refresh = useCallback(async () => {
    // Increment version for this request
    const thisVersion = ++requestVersionRef.current;

    try {
      setMsg('');
      const [p, c] = await Promise.all([
        CirclesAPI.listPendingConfirmations(),
        CirclesAPI.listConnections(),
      ]);

      // Latest-Call-Wins: only apply if this is still the latest request
      if (thisVersion !== requestVersionRef.current) {
        return; // Stale response, ignore
      }

      setPending(p);
      setConnections(c);
    } catch (e: unknown) {
      // Only show error if this is still the latest request
      if (thisVersion !== requestVersionRef.current) {
        return;
      }
      const message = e instanceof Error ? e.message : 'Failed to load Circles';
      setMsg(message);
      setMsgType('error');
    }
  }, []);

  // Refresh on focus (with Latest-Call-Wins protection)
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <Screen title="Orbital Circles">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#19D3FF"
          />
        }
      >
        <Muted>
          Live color signal only. No history. No timestamps. Peer-to-peer
          consent. This cannot become surveillance without breaking guardrails.
        </Muted>

        <StatusMessage message={msg} type={msgType} />

        <PrimaryButton
          label="Create Invite"
          onPress={() => router.push('/circles/create')}
        />
        <SecondaryButton
          label="Redeem Invite"
          onPress={() => router.push('/circles/redeem')}
        />

        {/* Pending Confirmations - NO TIMESTAMPS */}
        <Card>
          <Label>Pending Final Handshakes</Label>
          {pending.length === 0 ? (
            <Muted>None</Muted>
          ) : (
            pending.map((p, index) => (
              <View key={p.inviteId}>
                {index > 0 && <Divider />}
                <View style={{ paddingVertical: 8 }}>
                  <Text
                    style={{
                      color: '#D8E5FF',
                      fontWeight: '800',
                      marginBottom: 8,
                    }}
                  >
                    {p.handshakeLabel}
                  </Text>
                  <SecondaryButton
                    label="Confirm Identity"
                    onPress={() =>
                      router.push({
                        pathname: '/circles/confirm',
                        params: {
                          // SECURITY: Only pass inviteId. Label is fetched from invite record.
                          inviteId: p.inviteId,
                        },
                      })
                    }
                  />
                </View>
              </View>
            ))
          )}
        </Card>

        {/* Connections - NO TIMESTAMPS */}
        <Card>
          <Label>Connections ({connections.length}/25)</Label>
          {connections.length === 0 ? (
            <Muted>No connections yet.</Muted>
          ) : (
            connections.map((c, index) => (
              <View key={c.connectionId}>
                {index > 0 && <Divider />}
                <View style={{ paddingVertical: 8 }}>
                  <Text
                    style={{
                      color: '#D8E5FF',
                      fontWeight: '800',
                    }}
                  >
                    {c.peerDisplayName ?? 'Peer'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card>

        <SecondaryButton label="Refresh" onPress={refresh} />
      </ScrollView>
    </Screen>
  );
}

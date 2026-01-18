/**
 * CREATE INVITE
 *
 * Shows QR payload, displayCode + PIN, TTL countdown.
 * Actions: Extend (+30 min), Revoke.
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { CirclesAPI, InviteView } from './_api';
import {
  Screen,
  Card,
  PrimaryButton,
  SecondaryButton,
  DangerButton,
  Muted,
  MonoBox,
  StatusMessage,
  Label,
  dangerConfirm,
} from './_ui';
import { shouldShareNameInCircles, loadIdentity } from '../../lib/profile';

function formatTime(seconds: number): string {
  if (seconds <= 0) return 'Expired';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  }
  return `${mins}m ${secs}s`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'PENDING':
      return '#19D3FF';
    case 'LOCKED':
      return '#E8A830';
    case 'CONFIRMED':
      return '#4CAF50';
    case 'EXPIRED':
    case 'REVOKED':
      return '#F44336';
    default:
      return '#B9C6E4';
  }
}

export default function CirclesCreateInvite() {
  const router = useRouter();
  const [invite, setInvite] = useState<InviteView | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'info' | 'error' | 'success'>('info');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function create() {
    try {
      setMsg('Creating invite...');
      setMsgType('info');

      // Check consent: if user has opted to share name in Circles, include displayHint
      // Fail closed: if consent check fails, default to anonymous (no displayHint)
      let creatorDisplayHint: string | undefined;
      try {
        const consentGranted = await shouldShareNameInCircles();
        if (consentGranted) {
          const identity = await loadIdentity();
          if (identity.displayName) {
            creatorDisplayHint = identity.displayName;
          }
        }
      } catch {
        // Fail closed: consent error means no name shared
        creatorDisplayHint = undefined;
      }

      const inv = await CirclesAPI.createInvite(creatorDisplayHint);
      setInvite(inv);
      setTimeLeft(inv.expiresInSeconds);
      setMsg('');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to create invite';
      setMsg(message);
      setMsgType('error');
    }
  }

  useEffect(() => {
    create();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (invite && invite.status === 'PENDING' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [invite?.inviteId, invite?.status]);

  const expired =
    invite?.status === 'EXPIRED' ||
    invite?.status === 'REVOKED' ||
    timeLeft <= 0;

  const canExtend = invite?.status === 'PENDING' && !expired;

  return (
    <Screen title="Create Invite">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Muted>
          Share with a trusted peer. No persistent links. Single-use.
          Hard-expiring. Recipient must redeem and you must confirm their
          identity.
        </Muted>

        <StatusMessage message={msg} type={msgType} />

        {invite && (
          <>
            <Card>
              <Label>Invite Status</Label>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <Text style={{ color: '#B9C6E4' }}>Time Remaining:</Text>
                <Text
                  style={{
                    color: timeLeft < 300 ? '#F44336' : '#D8E5FF',
                    fontWeight: '800',
                  }}
                >
                  {formatTime(timeLeft)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#B9C6E4' }}>Status:</Text>
                <Text
                  style={{
                    color: getStatusColor(invite.status),
                    fontWeight: '800',
                  }}
                >
                  {invite.status}
                </Text>
              </View>
            </Card>

            <Card>
              <Label>Share Code (Textable Backup)</Label>
              <MonoBox text={`${invite.displayCode}  +  PIN ${invite.pin}`} />
              <View style={{ marginTop: 10 }}>
                <Muted>
                  Give this to your peer verbally or via secure message. They will
                  need both the code AND the PIN.
                </Muted>
              </View>
            </Card>

            <Card>
              <Label>QR Deep-Link</Label>
              <Muted>
                For QR scanning (more secure). Encode this deep-link in a QR code:
              </Muted>
              <MonoBox text={invite.qrDeepLink} />
            </Card>

            <PrimaryButton
              label="Extend +30 min"
              disabled={!canExtend}
              onPress={async () => {
                if (!invite) return;
                try {
                  setMsg('Extending...');
                  setMsgType('info');
                  const next = await CirclesAPI.extendInvite(invite.inviteId);
                  setInvite(next);
                  setTimeLeft(next.expiresInSeconds);
                  setMsg('Extended successfully');
                  setMsgType('success');
                } catch (e: unknown) {
                  const message =
                    e instanceof Error ? e.message : 'Extend failed';
                  setMsg(message);
                  setMsgType('error');
                }
              }}
            />

            <DangerButton
              label="Revoke Invite"
              disabled={expired}
              onPress={async () => {
                if (!invite) return;
                const ok = await dangerConfirm(
                  'Revoke invite?',
                  'This invalidates the code immediately. It cannot be undone.'
                );
                if (!ok) return;
                try {
                  setMsg('Revoking...');
                  setMsgType('info');
                  await CirclesAPI.revokeInvite(invite.inviteId);
                  setMsg('Invite revoked.');
                  setMsgType('success');
                  setTimeout(() => router.replace('/circles'), 1000);
                } catch (e: unknown) {
                  const message =
                    e instanceof Error ? e.message : 'Revoke failed';
                  setMsg(message);
                  setMsgType('error');
                }
              }}
            />

            <SecondaryButton label="Back to Circles" onPress={() => router.back()} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

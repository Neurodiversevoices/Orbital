/**
 * Assistant identity — ONE config key.
 *
 * Owner decision 2026-09-23 (Option A): the assistant's identity is NOT
 * decided. Until the owner designates one, the assistant renders as a neutral
 * placeholder: no real likeness, no chosen name, no chosen face.
 *
 * To bind the owner's designation later, add an entry to IDENTITIES and set
 * EXPO_PUBLIC_ASSISTANT_IDENTITY (or change DEFAULT_IDENTITY_KEY). Nothing
 * else in the app reads identity details directly.
 */

export interface AssistantIdentity {
  key: string;
  /** Name shown in the header. Placeholder is deliberately generic. */
  displayName: string;
  /** Visible disclosure. Must always state the person is AI-generated. */
  disclosure: string;
  /** null = neutral geometric placeholder, no likeness. */
  avatarUri: string | null;
}

export const IDENTITIES: Record<string, AssistantIdentity> = {
  placeholder: {
    key: 'placeholder',
    displayName: 'Orbital Assistant',
    disclosure: 'AI-generated person. Placeholder look; identity not yet chosen.',
    avatarUri: null,
  },
};

export const DEFAULT_IDENTITY_KEY = 'placeholder';

export function resolveIdentity(key: string | undefined = process.env.EXPO_PUBLIC_ASSISTANT_IDENTITY): AssistantIdentity {
  const identity = (key && IDENTITIES[key]) || IDENTITIES[DEFAULT_IDENTITY_KEY];
  // The disclosure is non-optional regardless of which identity is bound.
  if (!/AI-generated/.test(identity.disclosure)) {
    return { ...identity, disclosure: `AI-generated person. ${identity.disclosure}` };
  }
  return identity;
}

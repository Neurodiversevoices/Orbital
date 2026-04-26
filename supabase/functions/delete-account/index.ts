// delete-account edge function
// Revokes Apple identity token (if Apple sign-in), deletes Supabase user.
// Required Supabase secrets (set via `supabase secrets set`):
//   APPLE_CLIENT_ID  — your Services ID (e.g. com.erparris.orbital.signin)
//   APPLE_TEAM_ID    — your Apple Team ID
//   APPLE_KEY_ID     — the .p8 key ID used for Sign in with Apple
//   APPLE_PRIVATE_KEY — contents of the .p8 key file
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate Apple client secret JWT for Apple REST API calls.
async function makeAppleClientSecret(
  teamId: string,
  clientId: string,
  keyId: string,
  privateKeyPem: string,
): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'ES256', kid: keyId }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const now = Math.floor(Date.now() / 1000);
  const payload = btoa(JSON.stringify({
    iss: teamId,
    iat: now,
    exp: now + 3600,
    aud: 'https://appleid.apple.com',
    sub: clientId,
  })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const signingInput = `${header}.${payload}`;
  const pemContent = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const keyData = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign'],
  );
  const sigBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${signingInput}.${sig}`;
}

// Revoke an Apple refresh token via Apple's REST API.
async function revokeAppleToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<boolean> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    token: refreshToken,
    token_type_hint: 'refresh_token',
  });
  const resp = await fetch('https://appleid.apple.com/auth/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  return resp.ok;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify caller JWT and get user
  const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);
  let appleRevoked = false;

  // Attempt Apple token revocation if user signed in with Apple
  const isAppleUser = user.app_metadata?.provider === 'apple' ||
    user.identities?.some((i: { provider: string }) => i.provider === 'apple');

  if (isAppleUser) {
    const clientId = Deno.env.get('APPLE_CLIENT_ID');
    const teamId = Deno.env.get('APPLE_TEAM_ID');
    const keyId = Deno.env.get('APPLE_KEY_ID');
    const privateKey = Deno.env.get('APPLE_PRIVATE_KEY');

    if (clientId && teamId && keyId && privateKey) {
      try {
        // Look up stored Apple refresh token
        const { data: tokenRow } = await supabaseAdmin
          .from('apple_tokens')
          .select('refresh_token')
          .eq('user_id', user.id)
          .single();

        if (tokenRow?.refresh_token) {
          const clientSecret = await makeAppleClientSecret(teamId, clientId, keyId, privateKey);
          appleRevoked = await revokeAppleToken(tokenRow.refresh_token, clientId, clientSecret);
        }
        // Clean up token record regardless
        await supabaseAdmin.from('apple_tokens').delete().eq('user_id', user.id);
      } catch (err) {
        console.error('[delete-account] Apple revocation error:', err);
        // Graceful degradation — continue with deletion even if revocation fails
      }
    } else {
      console.warn('[delete-account] Apple env vars not configured — skipping revocation');
    }
  }

  // Delete the user (cascades all RLS-bound rows)
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({ deleted: true, apple_revoked: appleRevoked }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});

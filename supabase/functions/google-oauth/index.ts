// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { OAuth2Client } from 'https://deno.land/x/oauth2_client@v1.0.2/mod.ts'; // Deno OAuth2 client

// --- Supabase Clients ---
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// --- Google OAuth Configuration ---
// Ensure these are set in your Supabase project's environment variables for Edge Functions
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
// IMPORTANT: This redirect URI must be registered in your Google Cloud Console
// and must point to THIS Edge Function.
// Example: https://<project-ref>.supabase.co/functions/v1/google-oauth/callback
const GOOGLE_REDIRECT_URI = `${supabaseUrl}/functions/v1/google-oauth/callback`;

const oauth2Client = new OAuth2Client({
  clientId: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  authorizationEndpointUri: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUri: "https://oauth2.googleapis.com/token",
  redirectUri: GOOGLE_REDIRECT_URI,
  defaults: {
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events"
    ],
  },
});

// --- Audit Log Helper (Simplified) ---
enum AuditEventType {
  OAUTH_INIT = 'oauth_init',
  OAUTH_SUCCESS = 'oauth_success',
  OAUTH_ERROR = 'oauth_error',
  OAUTH_REVOKE = 'oauth_revoke'
}

async function logAuditEvent(supabase: SupabaseClient, type: AuditEventType, userId: string, details: any = {}) {
  try {
    await supabase.from('audit_logs').insert({ type, user_id: userId, details });
  } catch (e) {
    console.error("Audit log error:", e);
  }
}

// --- Main Handler ---
Deno.serve(async (req) => {
  const userSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } }
  });
  const adminSupabaseClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser();

  if (userError || !user) {
    return new Response(JSON.stringify({ message: "Não autenticado" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const url = new URL(req.url);
  const action = url.pathname.split('/').pop(); // e.g., 'auth-url', 'callback', 'status', 'revoke'

  console.log("OAuth Action:", action, "User ID:", user.id);

  try {
    if (req.method === 'GET' && action === 'auth-url') {
      const authUrl = await oauth2Client.code.getAuthorizationUri({
        // Deno OAuth2Client might use 'state' and 'codeChallenge' differently or automatically
        // For Google, 'access_type: offline' and 'prompt: consent' are important for refresh tokens
        // These might need to be passed as additional parameters if supported by the library,
        // or the library handles them by default.
        // For now, we assume defaults are sufficient or need to be configured in OAuth2Client constructor.
         includeGrantedScopes: true, // Example, adjust based on library
      });
      // Manually add access_type and prompt if library doesn't support them directly
      const finalAuthUrl = new URL(authUrl.toString());
      finalAuthUrl.searchParams.set('access_type', 'offline');
      finalAuthUrl.searchParams.set('prompt', 'consent');


      await logAuditEvent(adminSupabaseClient, AuditEventType.OAUTH_INIT, user.id, { provider: 'google' });
      return new Response(JSON.stringify({ authUrl: finalAuthUrl.toString() }), { headers: { "Content-Type": "application/json" } });
    }

    if (req.method === 'GET' && action === 'callback') {
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        await logAuditEvent(adminSupabaseClient, AuditEventType.OAUTH_ERROR, user.id, { provider: 'google', error });
        return new Response(JSON.stringify({ message: 'Autorização negada pelo usuário', error }), { status: 400 });
      }
      if (!code) {
        return new Response(JSON.stringify({ message: 'Código de autorização não fornecido' }), { status: 400 });
      }

      const tokens = await oauth2Client.code.getToken(url); // The library should handle parsing 'code' from the URL

      // Store tokens securely, associating them with the user.id
      // The 'google_tokens' table schema should match what you expect to store.
      const { error: saveError } = await adminSupabaseClient.from('google_tokens').upsert({
        userId: user.id, // Ensure this column name matches your table
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken, // This might be null if not granted or already used
        expiryDate: tokens.expiresIn ? Date.now() + tokens.expiresIn * 1000 : null, // expiresIn is in seconds
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'userId' });


      if (saveError) throw saveError;

      await logAuditEvent(adminSupabaseClient, AuditEventType.OAUTH_SUCCESS, user.id, { provider: 'google', hasRefreshToken: !!tokens.refreshToken });
      // Instead of redirecting, you might want to close the popup window or show a success message.
      // For SPAs, posting a message to the parent window is common.
      // For a simple redirect, ensure it's to a trusted page.
      // return Response.redirect(`${Deno.env.get('SITE_URL')}/config?oauth=success`, 302);
      return new Response(
        `<script>window.opener.postMessage({type: 'oauthSuccess', provider: 'google'}, '${Deno.env.get("CLIENT_URL") || supabaseUrl}'); window.close();</script>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    if (req.method === 'GET' && action === 'status') {
      const { data: tokenData, error: tokenError } = await adminSupabaseClient
        .from('google_tokens')
        .select('accessToken, refreshToken, expiryDate')
        .eq('userId', user.id)
        .single();

      if (tokenError && tokenError.code !== 'PGRST116') throw tokenError; // PGRST116: single row not found
      if (!tokenData) return new Response(JSON.stringify({ authorized: false, message: 'Nenhuma autorização encontrada' }), { status: 200 });

      const isExpired = tokenData.expiryDate ? tokenData.expiryDate <= Date.now() : true;
      return new Response(JSON.stringify({
        authorized: true,
        isExpired,
        hasRefreshToken: !!tokenData.refreshToken,
        expiryDate: tokenData.expiryDate ? new Date(tokenData.expiryDate).toISOString() : null,
      }), { headers: { "Content-Type": "application/json" } });
    }

    if (req.method === 'DELETE' && action === 'revoke') {
      const { error: deleteError } = await adminSupabaseClient
        .from('google_tokens')
        .delete()
        .eq('userId', user.id);

      if (deleteError) throw deleteError;
      // Optionally, try to revoke the token with Google as well, though this requires an access token.
      // const { data: tokenData } = await adminSupabaseClient.from('google_tokens').select('accessToken').eq('userId', user.id).single();
      // if (tokenData?.accessToken) {
      //   await oauth2Client.revokeAccessToken(tokenData.accessToken); // Check library for this method
      // }
      await logAuditEvent(adminSupabaseClient, AuditEventType.OAUTH_REVOKE, user.id, { provider: 'google' });
      return new Response(JSON.stringify({ message: 'Acesso revogado com sucesso' }), { status: 200 });
    }

    return new Response(JSON.stringify({ message: "Ação OAuth não encontrada ou método não permitido" }), { status: 404 });

  } catch (error) {
    console.error('Erro na função Google OAuth:', error);
    await logAuditEvent(adminSupabaseClient, AuditEventType.OAUTH_ERROR, user.id, { provider: 'google', error: error.message });
    return new Response(JSON.stringify({ message: error.message || "Erro interno do servidor OAuth" }), { status: 500 });
  }
});

/*
Deployment and Setup:
1. Ensure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET are set as environment variables for this Edge Function in Supabase dashboard.
2. The GOOGLE_REDIRECT_URI (e.g., https://<project-ref>.supabase.co/functions/v1/google-oauth/callback) MUST be added to your
   Google Cloud Console project under "Authorized redirect URIs" for your OAuth 2.0 Client ID.
3. The `google_tokens` table must exist in your Supabase database with columns like:
   - userId (text or uuid, primary key / unique, references auth.users.id)
   - accessToken (text)
   - refreshToken (text, nullable)
   - expiryDate (timestamp with time zone, nullable)
   - updatedAt (timestamp with time zone)

Invocation Examples (after deploying and setting up Supabase local dev or production):

Get Auth URL:
curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/google-oauth/auth-url' \
  --header 'Authorization: Bearer YOUR_USER_JWT'

Callback URL: (This is typically opened by the browser after Google authentication)
http://127.0.0.1:54321/functions/v1/google-oauth/callback?code=AUTH_CODE_FROM_GOOGLE

Get Token Status:
curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/google-oauth/status' \
  --header 'Authorization: Bearer YOUR_USER_JWT'

Revoke Access:
curl -i --location --request DELETE 'http://127.0.0.1:54321/functions/v1/google-oauth/revoke' \
  --header 'Authorization: Bearer YOUR_USER_JWT'
*/

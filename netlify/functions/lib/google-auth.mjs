/* Exchanges the stored refresh token for a short-lived access token.
   Shared by both delivery channels (Sheets, Gmail) since they
   authenticate as the same Google account via the same OAuth client. */

export async function getGoogleAccessToken() {
  var clientId = Netlify.env.get('GOOGLE_OAUTH_CLIENT_ID');
  var clientSecret = Netlify.env.get('GOOGLE_OAUTH_CLIENT_SECRET');
  var refreshToken = Netlify.env.get('GOOGLE_OAUTH_REFRESH_TOKEN');
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('google_credentials_not_configured');
  }

  var res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    }).toString()
  });

  if (!res.ok) {
    var errText = await res.text().catch(function () { return ''; });
    throw new Error('google_token_refresh_failed:' + res.status + ':' + errText.slice(0, 200));
  }

  var data = await res.json();
  return data.access_token;
}

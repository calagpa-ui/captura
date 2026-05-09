const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Handle Google OAuth redirect (GET with code)
  if (event.httpMethod === 'GET') {
    const code = event.queryStringParameters?.code;
    if (!code) return { statusCode: 400, headers, body: 'No code' };
    try {
      const { tokens } = await oauth2Client.getToken(code);
      const params = new URLSearchParams({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || '',
        expiry_date: tokens.expiry_date
      });
      return {
        statusCode: 302,
        headers: { ...headers, Location: `/captura/?${params}` },
        body: ''
      };
    } catch(e) {
      return { statusCode: 500, headers, body: e.message };
    }
  }

  // Handle POST requests
  try {
    const { action, refresh_token } = JSON.parse(event.body || '{}');

    if (action === 'refresh') {
      oauth2Client.setCredentials({ refresh_token });
      const { credentials } = await oauth2Client.refreshAccessToken();
      return {
        statusCode: 200, headers,
        body: JSON.stringify({
          access_token: credentials.access_token,
          expiry_date: credentials.expiry_date
        })
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};

async function obtenerAccessToken() {
  let rawKey = (process.env.CLIP_API_KEY || '').replace(/^Basic\s+/i, '').trim();
  
  const authResponse = await axios.post('https://api-gw.payclip.com/v2/oauth/token', {
    grant_type: 'client_credentials'
  }, {
    headers: {
      'Authorization': `Basic ${rawKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  return authResponse.data.access_token;
}

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API de Clip Checkout activo y funcionando.');
});

// Función para obtener un access_token fresco antes de crear el link de pago
async function obtenerAccessToken() {
  let rawKey = (process.env.CLIP_API_KEY || '').replace(/^Basic\s+/i, '').trim();

  if (!rawKey) {
    throw new Error('La variable CLIP_API_KEY no está configurada en las variables de entorno.');
  }

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

app.post('/cobro-clip', async (req, res) => {
  try {
    const { amount, description, email, phone } = req.body;

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum < 10) {
      return res.status(400).json({ success: false, error: 'El monto mínimo es de $10.00 MXN' });
    }

    // 1. Obtenemos el token de acceso con OAuth
    const accessToken = await obtenerAccessToken();

    // 2. Preparamos el payload exacto para /v2/checkout
    const checkoutPayload = {
      amount: amountNum,
      currency: "MXN",
      purchase_description: description || "Pago en línea",
      redirection_url: {
        success: "https://frontdigit.net/", // URL a donde regresa si el pago es exitoso
        error: "https://frontdigit.net/",   // URL si ocurre un error
        default: "https://frontdigit.net/"
      }
    };

    // 3. Solicitamos la creación del link de pago a Clip
    const response = await axios.post('https://api.payclip.com/v2/checkout', checkoutPayload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      }
    });

    // La respuesta de Clip incluye la URL de pago para redirigir al usuario
    res.json({ success: true, data: response.data });

  } catch (error) {
    console.error('Error detallado de Clip Checkout:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.message || error.message || 'Error al generar el link de pago con Clip' 
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor Clip Checkout activo en puerto ${PORT}`);
});

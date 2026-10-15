const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API de Clip Checkout activo y funcionando.');
});

// Función para obtener el access_token usando el Basic Auth
async function obtenerAccessToken() {
  let rawKey = (process.env.CLIP_API_KEY || '').trim();

  if (!rawKey) {
    throw new Error('La variable CLIP_API_KEY no está configurada en Render.');
  }

  // Asegura que tenga el formato 'Basic [base64]' correcto
  const authHeader = rawKey.startsWith('Basic ') ? rawKey : `Basic ${rawKey}`;

  const authResponse = await axios.post('https://api-gw.payclip.com/v2/oauth/token', {
    grant_type: 'client_credentials'
  }, {
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    }
  });

  return authResponse.data.access_token;
}

app.post('/cobro-clip', async (req, res) => {
  try {
    const { amount, description, email, phone, name } = req.body;

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum < 10) {
      return res.status(400).json({ success: false, error: 'El monto mínimo es de $10.00 MXN' });
    }

    // 1. Obtenemos el token de acceso fresco
    const accessToken = await obtenerAccessToken();

    // 2. Preparamos el payload del checkout
    const checkoutPayload = {
      amount: amountNum,
      currency: "MXN",
      purchase_description: description || "Pago Web Fortacero",
      redirection_url: {
        success: "https://frontdigit.net/",
        error: "https://frontdigit.net/",
        default: "https://frontdigit.net/"
      },
      override_settings: {
        locale: "es-MX",
        tip_enabled: false,
        merchant_info: {
          show_contact_info: true
        }
      },
      metadata: {
        customer_info: {
          name: name || "Cliente",
          email: email || "cliente@email.com",
          phone: phone || "5512345678"
        }
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

    const paymentUrl = response.data.payment_request_url;

    res.json({ 
      success: true, 
      payment_url: paymentUrl,
      data: response.data 
    });

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

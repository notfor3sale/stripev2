const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API de Clip Checkout (Sandbox) activo y funcionando.');
});

// Función para obtener un access_token (detecta automáticamente si es Producción o Pruebas)
async function obtenerAccessToken() {
  let rawKey = (process.env.CLIP_API_KEY || '').replace(/^Basic\s+/i, '').trim();

  if (!rawKey) {
    throw new Error('La variable CLIP_API_KEY no está configurada en las variables de entorno.');
  }

  // Si la llave empieza con 'test_', usamos la URL de autenticación de pruebas de Clip
  const esPrueba = rawKey.startsWith('test_');
  const authUrl = esPrueba 
    ? 'https://dev-api.payclip.com/v2/oauth/token' // O el dominio de auth de pruebas que indique tu panel
    : 'https://api-gw.payclip.com/v2/oauth/token';

  // Nota: Para autenticarte en Basic Auth con Clip, se usa Base64(Client_ID:Client_Secret)
  // Asegúrate de que en Render tengas configurada tu CLIP_API_KEY ya codificada en Base64
  const authResponse = await axios.post(authUrl, {
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
    const { amount, description, email, phone, name } = req.body;

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum < 10) {
      return res.status(400).json({ success: false, error: 'El monto mínimo es de $10.00 MXN' });
    }

    let rawKey = (process.env.CLIP_API_KEY || '').trim();
    const esPrueba = rawKey.startsWith('test_');

    // 1. Obtenemos el token de acceso
    const accessToken = await obtenerAccessToken();

    // 2. Preparamos el payload del checkout
    const checkoutPayload = {
      amount: amountNum,
      currency: "MXN",
      purchase_description: description || "Pago de prueba",
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
          name: name || "Cliente de Prueba",
          email: email || "test@email.com",
          phone: phone || "5512345678"
        }
      }
    };

    // 3. Seleccionamos el endpoint correcto (Producción vs Pruebas)
    const checkoutUrl = esPrueba 
      ? 'https://dev-api.payclip.com/v2/checkout' 
      : 'https://api.payclip.com/v2/checkout';

    // 4. Solicitamos la creación del link de pago
    const response = await axios.post(checkoutUrl, checkoutPayload, {
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

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API de Clip con OAuth activo y funcionando.');
});

// Función para obtener un access_token fresco antes de cobrar
async function obtenerAccessToken() {
  // Limpiamos la llave por si incluye la palabra "Basic" o espacios extra
  let rawKey = (process.env.CLIP_API_KEY || '').replace(/^Basic\s+/i, '').trim();

  if (!rawKey) {
    throw new Error('La variable CLIP_API_KEY no está configurada en las variables de entorno.');
  }

  // URL con el subdominio api-gw de la pasarela oficial de Clip
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
    const { amount, card_number, exp_month, exp_year, cvv, cardholder_name, email, phone, description } = req.body;

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum < 10) {
      return res.status(400).json({ success: false, error: 'El monto mínimo es de $10.00 MXN' });
    }

    // 1. Obtenemos el token de acceso
    const accessToken = await obtenerAccessToken();

    // 2. Preparamos el payload de pago
    const clipPayload = {
      amount: amountNum,
      currency: "MXN",
      concept: description || "Pago en línea",
      card: {
        number: card_number,
        exp_month: exp_month,
        exp_year: exp_year,
        cvv: cvv,
        name: cardholder_name
      },
      receipt_email: email,
      phone: phone
    };

    // 3. Ejecutamos el cargo usando el Bearer Token obtenido
    const response = await axios.post('https://api-gw.payclip.com/v2/payments', clipPayload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true, data: response.data });

  } catch (error) {
    console.error('Error detallado de Clip:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.message || error.message || 'Error al procesar el pago con Clip' 
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor Clip activo en puerto ${PORT}`);
});

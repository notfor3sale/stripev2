const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API de Pago Directo con Clip activa.');
});

app.post('/cobro-directo-clip', async (req, res) => {
  try {
    const { cardNumber, expirationMonth, expirationYear, cvc, cardHolderName, amount, description, email, phone } = req.body;

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum < 10) {
      return res.status(400).json({ success: false, error: 'El monto mínimo es de $10.00 MXN' });
    }

    let rawKey = (process.env.CLIP_API_KEY || '').trim();
    if (!rawKey) {
      return res.status(500).json({ success: false, error: 'La variable CLIP_API_KEY no está configurada en Render.' });
    }

    // Limpieza de llave
    const cleanKey = rawKey.replace(/^(Basic|Bearer)\s+/i, '').trim();

    // Si tu llave de pruebas requiere la clave secreta combinada (API_KEY:SECRET_KEY), 
    // asegúrate de que esté configurada con ambos valores separados por dos puntos (:) en Render.
    let authHeader;
    if (cleanKey.includes(':')) {
      authHeader = `Basic ${Buffer.from(cleanKey).toString('base64')}`;
    } else {
      // Si solo es la API Key de pruebas suelta, probamos enviándola en x-api-key y Bearer
      authHeader = `Bearer ${cleanKey}`;
    }

    const tokenPayload = {
      card_number: cardNumber.replace(/\s+/g, ''),
      expiration_month: expirationMonth.toString().padStart(2, '0'),
      expiration_year: expirationYear.length === 4 ? expirationYear.slice(-2) : expirationYear,
      cvc: cvc.toString(),
      holder_name: cardHolderName || "Titular"
    };

    console.log('--- ENVIANDO TOKEN A CLIP ---');
    console.log('Autenticación usada:', authHeader.substring(0, 15) + '...');

    // 1. Crear Token de Tarjeta en Clip
    const tokenResponse = await axios.post('https://api.payclip.com/v1/tokens', tokenPayload, {
      headers: {
        'Authorization': authHeader,
        'x-api-key': cleanKey,
        'Content-Type': 'application/json'
      }
    });

    const cardToken = tokenResponse.data.id;

    // 2. Procesar el Pago
    const nameParts = (cardHolderName || 'Cliente').trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || 'General';

    const paymentPayload = {
      amount: amountNum,
      currency: "MXN",
      description: description || "Pago Web Fortacero",
      payment_method: {
        token: cardToken
      },
      customer: {
        first_name: firstName,
        last_name: lastName,
        email: email || "cliente@email.com",
        phone: phone || "5512345678"
      }
    };

    const paymentResponse = await axios.post('https://api.payclip.com/payments', paymentPayload, {
      headers: {
        'Authorization': `Bearer ${cleanKey}`,
        'x-api-key': cleanKey,
        'Content-Type': 'application/json'
      }
    });

    res.json({
      success: true,
      data: paymentResponse.data
    });

  } catch (error) {
    console.error('--- ERROR DETALLADO DE CLIP (401/403) ---');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Mensaje:', error.message);
    }

    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.response?.data?.error_detail || error.message || 'Error al procesar el pago con Clip'
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});

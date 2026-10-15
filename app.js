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
      return res.status(500).json({ success: false, error: 'La variable CLIP_API_KEY no está configurada.' });
    }

    // 1. Crear Token de Tarjeta directamente en la API de Clip
    const tokenPayload = {
      card_number: cardNumber.replace(/\s+/g, ''),
      expiration_month: expirationMonth.padStart(2, '0'),
      expiration_year: expirationYear.length === 4 ? expirationYear.slice(-2) : expirationYear,
      cvc: cvc,
      holder_name: cardHolderName || "Titular"
    };

    const tokenResponse = await axios.post('https://api.payclip.com/v1/tokens', tokenPayload, {
      headers: {
        'Authorization': `Bearer ${rawKey}`,
        'Content-Type': 'application/json'
      }
    });

    const cardToken = tokenResponse.data.id;

    // 2. Procesar el pago con el token generado
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
        'Authorization': `Bearer ${rawKey}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({
      success: true,
      data: paymentResponse.data
    });

  } catch (error) {
    console.error('--- ERROR DETALLADO CLIP ---');
    console.error(error.response?.status, error.response?.data || error.message);

    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.response?.data?.error_detail || error.message || 'Error al procesar el pago con Clip'
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor de pagos activo en puerto ${PORT}`);
});

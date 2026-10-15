const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API de Clip Checkout Transparente activo.');
});

app.post('/cobro-clip-transparente', async (req, res) => {
  try {
    const { token, amount, description, email, phone, name } = req.body;

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum < 10) {
      return res.status(400).json({ success: false, error: 'El monto mínimo es de $10.00 MXN' });
    }

    if (!token) {
      return res.status(400).json({ success: false, error: 'Falta el token de la tarjeta.' });
    }

    let rawKey = (process.env.CLIP_API_KEY || '').trim();

    // Separar nombre y apellido para el esquema de la API
    const nameParts = (name || 'Cliente').trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || 'General';

    const paymentPayload = {
      amount: amountNum,
      currency: "MXN",
      description: description || "Pago Web Fortacero",
      payment_method: {
        token: token
      },
      customer: {
        first_name: firstName,
        last_name: lastName,
        email: email || "cliente@email.com",
        phone: phone || "5512345678"
      }
    };

    // Llamada directa al endpoint de pagos con Bearer token (soporta llaves test_... y de producción)
    const response = await axios.post('https://api.payclip.com/payments', paymentPayload, {
      headers: {
        'Authorization': `Bearer ${rawKey}`,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      }
    });

    res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('--- ERROR DETALLADO CLIP PAYMENTS ---');
    console.error(error.response?.status, error.response?.data || error.message);

    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Error al procesar el pago con Clip'
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor Clip en puerto ${PORT}`);
});

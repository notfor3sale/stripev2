const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API de Clip directa activa y funcionando.');
});

app.post('/cobro-clip', async (req, res) => {
  try {
    const { amount, card_number, exp_month, exp_year, cvv, cardholder_name, email, phone, description } = req.body;

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum < 10) {
      return res.status(400).json({ success: false, error: 'El monto mínimo es de $10.00 MXN' });
    }

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

    // Usamos la llave limpia y le ponemos el prefijo Basic
    const rawKey = (process.env.CLIP_API_KEY || '').replace(/^Basic\s+/i, '').trim();
    const authHeader = `Basic ${rawKey}`;

    const response = await axios.post('https://api.payclip.com/v2/payments', clipPayload, {
      headers: {
        'Authorization': authHeader,
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

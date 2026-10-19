const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API Frontdigit - Whop Integration Active');
});

// Endpoint para crear el enlace de pago en Whop
app.post('/crear-checkout-whop', async (req, res) => {
  try {
    const { email, amount, description } = req.body;

    const apiKey = process.env.WHOP_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        success: false, 
        error: 'Falta configurar la variable WHOP_API_KEY en Render.' 
      });
    }

    // Petición a la API de Whop para generar una sesión de checkout
    const response = await axios.post('https://api.whop.com/v5/checkout_sessions', {
      amount: Math.round(amount * 100), // Monto expresado en centavos
      currency: 'usd', // O la divisa configurada en tu panel
      description: description || 'Pago Fortacero',
      email: email
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({
      success: true,
      checkoutUrl: response.data.url || response.data.checkout_url
    });

  } catch (error) {
    console.error('Error al crear el checkout de Whop:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || 'Error al conectar con la pasarela de Whop.'
    });
  }
});

// Webhook para escuchar el éxito del pago
app.post('/webhook-whop', (req, res) => {
  try {
    const event = req.body;
    console.log('--- EVENTO WEBHOOK DE WHOP RECIBIDO ---');

    if (event.action === 'payment.succeeded' || event.type === 'payment.succeeded') {
      const paymentData = event.data;
      console.log('¡Pago confirmado en Whop!');
      console.log('ID Transacción:', paymentData.id);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error en Webhook:', error.message);
    res.status(500).json({ error: 'Webhook Error' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor de pagos activo en puerto ${PORT}`);
});

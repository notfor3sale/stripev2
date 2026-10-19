const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API Frontdigit - Whop Integration Active');
});

// Endpoint para crear el checkout dinámico con el monto personalizado
app.post('/crear-checkout-whop', async (req, res) => {
  try {
    const { amount, description, email, name, phone } = req.body;

    const apiKey = process.env.WHOP_API_KEY;
    if (!apiKey) {
      console.error('ERROR: No existe WHOP_API_KEY en las variables de entorno de Render.');
      return res.status(500).json({ 
        success: false, 
        error: 'Falta configurar WHOP_API_KEY en el servidor Render.' 
      });
    }

    console.log(`--- NUEVA SOLICITUD DE COBRO FORTEACERO ---`);
    console.log(`Cliente: ${name} | Email: ${email} | Monto: $${amount} MXN`);

    // Petición a la API de Whop v5 para crear la sesión de Checkout
    const response = await axios.post('https://api.whop.com/v5/checkout_sessions', {
      plan_id: "plan_aXFJiRdgP8ip9", // Tu Plan ID de Whop
      custom_amount: Math.round(parseFloat(amount) * 100), // Monto en centavos
      email: email,
      metadata: {
        cliente_nombre: name,
        cliente_telefono: phone,
        concepto: description || "Pago Fortacero"
      }
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const checkoutUrl = response.data.url || response.data.checkout_url;

    res.json({
      success: true,
      checkoutUrl: checkoutUrl
    });

  } catch (error) {
    console.error('--- ERROR AL CREAR CHECKOUT EN WHOP ---');
    console.error(error.response?.data || error.message);

    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Error al conectar con Whop.'
    });
  }
});

// Webhook para escuchar confirmaciones de pago
app.post('/webhook-whop', (req, res) => {
  try {
    const event = req.body;
    console.log('--- EVENTO WEBHOOK RECIBIDO DE WHOP ---');

    if (event.action === 'payment.succeeded' || event.type === 'payment.succeeded') {
      const paymentData = event.data;
      console.log('¡Pago confirmado con éxito!');
      console.log('ID Transacción:', paymentData.id);
      console.log('Monto:', paymentData.amount);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error en Webhook:', error.message);
    res.status(500).json({ error: 'Error interno en Webhook' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor de pagos activo en el puerto ${PORT}`);
});

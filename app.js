const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API Frontdigit - Whop Integration Active');
});

// Endpoint para generar el enlace de pago seguro en Whop
app.post('/crear-checkout-whop', async (req, res) => {
  try {
    const { amount, description, email, name, phone } = req.body;

    const apiKey = process.env.WHOP_API_KEY;
    if (!apiKey) {
      console.error('ERROR: No existe WHOP_API_KEY en Render.');
      return res.status(500).json({ 
        success: false, 
        error: 'Falta configurar WHOP_API_KEY en Render.' 
      });
    }

    const planId = "plan_aXFJiRdgP8ip9"; // Tu Plan ID

    console.log(`--- SOLICITUD DE CHECKOUT FORTEACERO ---`);
    console.log(`Cliente: ${name} | Email: ${email} | Monto: $${amount}`);

    // Intentamos crear un Payment Link mediante la API v5 de Whop
    const response = await axios.post('https://api.whop.com/v5/payment_links', {
      plan_id: planId,
      metadata: {
        amount_requested: amount,
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

    const checkoutUrl = response.data.url || response.data.direct_link;

    res.json({
      success: true,
      checkoutUrl: checkoutUrl
    });

  } catch (error) {
    console.error('--- ERROR EN API DE WHOP ---', error.response?.data || error.message);

    // Fallback: Si la API de Payment Links no está habilitada en la cuenta, 
    // redirigimos al checkout directo del plan en Whop pasando el email
    const planId = "plan_aXFJiRdgP8ip9";
    const directUrl = `https://whop.com/checkout/${planId}?email=${encodeURIComponent(req.body.email || '')}`;

    console.log('Usando enlace directo de checkout:', directUrl);

    res.json({
      success: true,
      checkoutUrl: directUrl
    });
  }
});

// Webhook para escuchar confirmaciones de pago de Whop
app.post('/webhook-whop', (req, res) => {
  try {
    const event = req.body;
    console.log('--- EVENTO WEBHOOK DE WHOP RECIBIDO ---');

    if (event.action === 'payment.succeeded' || event.type === 'payment.succeeded') {
      const paymentData = event.data;
      console.log('¡Pago confirmado en Whop!');
      console.log('ID Transacción:', paymentData.id);
      console.log('Monto:', paymentData.amount);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error en Webhook:', error.message);
    res.status(500).json({ error: 'Webhook Error' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor activo en el puerto ${PORT}`);
});

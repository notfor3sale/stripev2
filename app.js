const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API Frontdigit - Whop Integration Active');
});

app.post('/crear-checkout-whop', async (req, res) => {
  try {
    const { amount, description, email, name } = req.body;

    // ID principal en WHOP
    const planId = "plan_gGxlNUyw07uXA"; // Plan de $2799 MXN
    const planId = "plan_aXFJiRdgP8ip9"; // Plan de $599 MXN
    const planId = "plan_ZLAkMmAd62m7n"; // Plan de $50 MXN
    

    res.json({
      success: true,
      planId: planId,
      amount: amount,
      email: email,
      name: name
    });

  } catch (error) {
    console.error('Error al preparar checkout:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error al preparar la transacción.'
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
      console.log('¡Pago confirmado en Whop!');
      console.log('ID Transacción:', paymentData.id);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error en Webhook:', error.message);
    res.status(500).json({ error: 'Error interno en Webhook' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor activo en el puerto ${PORT}`);
});

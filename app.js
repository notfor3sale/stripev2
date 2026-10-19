const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API Frontdigit - Whop Payment Integration Activa');
});

// Endpoint para recibir la notificación de pago exitoso desde Whop
app.post('/webhook-whop', (req, res) => {
  try {
    const event = req.body;

    console.log('--- EVENTO DE WHOP RECIBIDO ---');
    console.log('Tipo de evento:', event.action || event.type);

    if (event.action === 'payment.succeeded' || event.type === 'payment.succeeded') {
      const paymentData = event.data;

      console.log('¡Pago de Fortacero recibido con éxito!');
      console.log('ID Transacción:', paymentData.id);
      console.log('Monto:', paymentData.amount, paymentData.currency);
      console.log('Cliente Email:', paymentData.user_email || paymentData.email);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Error en Webhook:', error.message);
    res.status(500).json({ error: 'Error interno en el Webhook' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor de pagos activo en puerto ${PORT}`);
});

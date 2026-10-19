const express = require('express');
const cors = require('cors');

const app = express();

// Habilitar CORS y parseo de JSON
app.use(cors());
app.use(express.json());

// Verificación de estado del servidor
app.get('/', (req, res) => {
  res.send('API Frontdigit - Whop Integration Active');
});

// Webhook para escuchar la confirmación de pago enviada por Whop
app.post('/webhook-whop', (req, res) => {
  try {
    const event = req.body;
    console.log('--- EVENTO WEBHOOK DE WHOP RECIBIDO ---');

    if (event.action === 'payment.succeeded' || event.type === 'payment.succeeded') {
      const paymentData = event.data;
      console.log('¡Pago de Fortacero confirmado exitosamente!');
      console.log('ID Transacción:', paymentData.id);
      console.log('Monto:', paymentData.amount);
      console.log('Email Cliente:', paymentData.email);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error procesando Webhook de Whop:', error.message);
    res.status(500).json({ error: 'Error interno en el Webhook' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor de pagos escuchando en el puerto ${PORT}`);
});

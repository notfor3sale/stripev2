const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API Frontdigit - Whop Integration Active');
});

// Ruta para recibir el Webhook de Whop
app.post('/webhook-whop', (req, res) => {
  try {
    const event = req.body;

    console.log('--- EVENTO DE WHOP RECIBIDO ---');
    console.log('Action / Type:', event.action || event.type);

    if (event.action === 'payment.succeeded' || event.type === 'payment.succeeded') {
      const paymentData = event.data;

      console.log('¡Pago de Fortacero confirmado!');
      console.log('ID Transacción:', paymentData.id);
      console.log('Monto:', paymentData.amount, paymentData.currency);
      console.log('Cliente Email:', paymentData.user_email || paymentData.email);

      // Lógica posterior al pago exitoso (base de datos, avisos, etc.)
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Error en Webhook de Whop:', error.message);
    res.status(500).json({ error: 'Webhook Error' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor de pagos activo en el puerto ${PORT}`);
});

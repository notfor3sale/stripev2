const express = require('express');
const cors = require('cors');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API de Stripe activa y funcionando.');
});

// Endpoint para crear la sesión de Checkout / Donación
app.post('/crear-checkout-stripe', async (req, res) => {
  try {
    const { amount, email } = req.body;

    const amountInCents = Math.round(parseFloat(amount) * 100);

    if (!amountInCents || amountInCents < 3000) { 
      return res.status(400).json({ error: 'El monto mínimo es de $30.00 MXN' });
    }

    const sessionPayload = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: 'Aportación Voluntaria',
              description: 'Gracias por apoyar nuestro proyecto',
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'https://zafarparfums.com/?donacion=exito',
      cancel_url: 'https://zafarparfums.com/donar.html',
    };

    // Validar email antes de enviarlo
    if (email && typeof email === 'string' && email.includes('@')) {
      sessionPayload.customer_email = email.trim();
    }

    // Crear la sesión en la API de Stripe
    const session = await stripe.checkout.sessions.create(sessionPayload);

    // Devolvemos la URL directa generada por la API de Stripe
    res.json({ id: session.id, url: session.url });

  } catch (error) {
    console.error('Error en Stripe API:', error);
    res.status(500).json({ error: error.message || 'Error al procesar con Stripe' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor de Stripe activo en puerto ${PORT}`);
});

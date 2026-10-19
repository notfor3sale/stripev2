const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Habilitar CORS para permitir peticiones desde cualquier origen/formulario
app.use(cors());
app.use(express.json());

// Verificación de estado del servidor
app.get('/', (req, res) => {
  res.send('API Frontdigit - Whop Integration Active');
});

// Endpoint que recibe la solicitud desde index.html
app.post('/cobro-directo-whop', async (req, res) => {
  try {
    const { cardNumber, expirationMonth, expirationYear, cvc, cardHolderName, email, phone, amount, description } = req.body;

    console.log('--- RECBIDA PETICIÓN DE COBRO FORTECERO ---');
    console.log('Cliente:', cardHolderName, '| Email:', email, '| Monto:', amount);

    // Validar la API Key de Whop cargada en Render
    const apiKey = process.env.WHOP_API_KEY;
    if (!apiKey) {
      console.error('ERROR: No se ha configurado WHOP_API_KEY en las variables de entorno de Render.');
      return res.status(500).json({ 
        success: false, 
        error: 'Configuración incompleta en el servidor (Falta API Key).' 
      });
    }

    // Aquí realizas la llamada a la API REST de Whop para procesar o registrar la transacción
    // Ejemplo de consulta o procesamiento utilizando la API Key:
    /*
    const response = await axios.post('https://api.whop.com/v5/payments', {
      amount: amount,
      currency: 'usd',
      email: email,
      description: description
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    */

    // Responder éxito al formulario
    res.json({
      success: true,
      message: 'Cobro registrado correctamente.'
    });

  } catch (error) {
    console.error('--- ERROR EN PROCESAMIENTO DE WHOP ---');
    console.error(error.response?.data || error.message);

    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Error al procesar el pago con Whop.'
    });
  }
});

// Webhook para recibir eventos desde Whop (ej. payment.succeeded)
app.post('/webhook-whop', (req, res) => {
  try {
    const event = req.body;
    console.log('--- EVENTO WEBHOOK DE WHOP RECIBIDO ---');
    console.log('Action / Type:', event.action || event.type);

    if (event.action === 'payment.succeeded' || event.type === 'payment.succeeded') {
      const paymentData = event.data;
      console.log('¡Pago confirmado en Whop!');
      console.log('ID Transacción:', paymentData.id);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error en Webhook de Whop:', error.message);
    res.status(500).json({ error: 'Error interno en el Webhook' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});

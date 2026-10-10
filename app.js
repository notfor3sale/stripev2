const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

// Tus llaves de Clip (guárdalas en las variables de entorno de Render)
// CLIP_API_KEY o CLIP_TOKEN_KEY
const CLIP_API_KEY = process.env.CLIP_API_KEY; 

app.get('/', (req, res) => {
  res.send('API de Clip activa y funcionando.');
});

app.post('/cobro-clip', async (req, res) => {
  try {
    const { amount, token_id, email, description } = req.body;

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum < 10) {
      return res.status(400).json({ success: false, error: 'El monto mínimo es de $10.00 MXN' });
    }

    // Estructura de pago directo con la API de Clip (Payload estándar)
    const clipPayload = {
      amount: amountNum,
      currency: "MXN",
      concept: description || "Pago en línea",
      token_id: token_id, // El token generado en el frontend con la Public Key de Clip
      receipt_email: email || "cliente@correo.com"
    };

    // Petición al endpoint de pagos de Clip (Producción o Staging según corresponda)
    // Nota: Revisa si usas el endpoint de API V2 o V3 de Clip
    const response = await axios.post('https://api.payclip.com/v2/payments', clipPayload, {
      headers: {
        'Authorization': `Basic ${CLIP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true, data: response.data });

  } catch (error) {
    console.error('Error en API de Clip:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.message || 'Error al procesar el pago con Clip' 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor Clip activo en puerto ${PORT}`);
});

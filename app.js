const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

// Tus credenciales de Clip configuradas en las variables de entorno de Render
const CLIP_CLIENT_ID = process.env.CLIP_CLIENT_ID;
const CLIP_CLIENT_SECRET = process.env.CLIP_CLIENT_SECRET;
// O si manejas un usuario/contraseña o Basic Auth directo para generar el token:
const CLIP_API_KEY = process.env.CLIP_API_KEY; 

app.get('/', (req, res) => {
  res.send('API de Clip (con renovación de token) activa y funcionando.');
});

// Función auxiliar para obtener un token fresco de Clip
async function obtenerAccessToken() {
  try {
    // NOTA: Ajusta el endpoint de autenticación según la documentación oficial de tu versión de API de Clip
    const authResponse = await axios.post('https://api.payclip.com/v2/oauth/token', {
      grant_type: 'client_credentials'
    }, {
      headers: {
        'Authorization': `Basic ${CLIP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    return authResponse.data.access_token;
  } catch (error) {
    console.error('Error al generar el access_token de Clip:', error.response?.data || error.message);
    throw new Error('No se pudo autenticar con la pasarela de Clip.');
  }
}

app.post('/cobro-clip', async (req, res) => {
  try {
    const { amount, card_number, exp_month, exp_year, cvv, cardholder_name, email, phone, description } = req.body;

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum < 10) {
      return res.status(400).json({ success: false, error: 'El monto mínimo es de $10.00 MXN' });
    }

    // 1. Obtenemos un token de acceso fresco y vigente
    const accessToken = await obtenerAccessToken();

    // 2. Estructuramos el payload de la tarjeta para Clip
    const clipPayload = {
      amount: amountNum,
      currency: "MXN",
      concept: description || "Pago en línea",
      card: {
        number: card_number,
        exp_month: exp_month,
        exp_year: exp_year,
        cvv: cvv,
        name: cardholder_name
      },
      receipt_email: email,
      phone: phone
    };

    // 3. Ejecutamos el cobro usando el token dinámico recién obtenido
    const response = await axios.post('https://api.payclip.com/v2/payments', clipPayload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true, data: response.data });

  } catch (error) {
    console.error('Error en API de Clip:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.message || error.message || 'Error al procesar el pago con Clip' 
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor Clip activo en puerto ${PORT}`);
});

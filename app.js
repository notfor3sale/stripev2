const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// 1. Almacenamiento en memoria para guardar las referencias activas
const enlacesDePago = {};

// Tus planes configurados en Whop
const PLANES_WHOP = {
    "50": "plan_ZLAkMmAd62m7n",
    "599": "plan_gGxlNUyw07uXA",
    "2799": "plan_aXFJiRdgP8ip9"
};

// Función para generar códigos alfanuméricos limpios y aleatorios estilo "Aq6o5z8Vd5izvD"
function generarCodigoAleatorio(longitud = 12) {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let resultado = '';
    for (let i = 0; i < longitud; i++) {
        resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return resultado;
}

app.get('/', (req, res) => {
  res.send('API Frontdigit - Whop Integration Active');
});

// 2. NUEVO ENDPOINT: Crea la referencia y la URL automática tipo frontdigit.net/payment/?ref=...
app.post('/api/crear-referencia', (req, res) => {
    try {
        const { monto, concepto } = req.body;

        const planId = PLANES_WHOP[monto];
        if (!planId) {
            return res.status(400).json({ success: false, error: "Monto no válido. Usa 50, 599 o 2799." });
        }

        // Genera el código alfanumérico único
        const nuevaRef = generarCodigoAleatorio(12);

        // Guardar referencia en el servidor con estado 'usado: false'
        enlacesDePago[nuevaRef] = {
            planId: planId,
            nombre: concepto || `Pago FrontDigit ($${monto} MXN)`,
            usado: false,
            creado: new Date()
        };

        // Devuelve la URL exacta apuntando a tu subcarpeta /payment/
        res.json({
            success: true,
            referencia: nuevaRef,
            url: `https://frontdigit.net/payment/?ref=${nuevaRef}`
        });

    } catch (error) {
        console.error('Error al crear referencia:', error.message);
        res.status(500).json({ success: false, error: 'Error al generar enlace de pago.' });
    }
});

// 3. ENDPOINT QUE CONSULTA EL FRONTEND (Verifica si el enlace existe y no ha sido pagado)
app.get('/api/verificar-referencia/:ref', (req, res) => {
    const ref = req.params.ref;
    const enlace = enlacesDePago[ref];

    if (!enlace) {
        return res.status(404).json({ success: false, error: "El enlace de pago no existe o es inválido." });
    }

    if (enlace.usado) {
        return res.status(400).json({ success: false, error: "Este enlace de pago ya fue utilizado y ha expirado." });
    }

    res.json({ 
        success: true, 
        planId: enlace.planId, 
        nombre: enlace.nombre 
    });
});

app.post('/crear-checkout-whop', async (req, res) => {
  try {
    const { amount, description, email, name, planId } = req.body;

    res.json({
      success: true,
      planId: planId || "plan_aXFJiRdgP8ip9",
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

// 4. WEBHOOK DE WHOP (Bloquea automáticamente el enlace cuando el pago se completa)
app.post('/webhook-whop', (req, res) => {
  try {
    const event = req.body;
    console.log('--- EVENTO WEBHOOK RECIBIDO DE WHOP ---');

    if (event.action === 'payment.succeeded' || event.type === 'payment.succeeded') {
      const paymentData = event.data;
      console.log('¡Pago confirmado en Whop!');
      console.log('ID Transacción:', paymentData.id);

      // Si pasas la referencia en los metadatos al crear el cobro, la inactivamos aquí:
      const refPagada = paymentData.metadata?.ref;
      if (refPagada && enlacesDePago[refPagada]) {
          enlacesDePago[refPagada].usado = true;
          console.log(`¡Enlace ${refPagada} marcado como USADO (expirado) con éxito!`);
      }
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

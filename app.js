const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Almacenamiento temporal para referencias de pago
const enlacesDePago = {};

// Mapeo de planes configurados en Whop
const PLANES_WHOP = {
    "99.97": "plan_DRkLGCX5G4zCQ",
    "1298.58": "plan_fwV1mdwQ6H5Fg",
    "2599.00": "plan_zop6zlBii6FLf",
    "4189.99": "plan_zlwuyJj8reORC",
    "5679.00": "plan_Gmp6AQtPf8o8s",
    "8499.20": "plan_BWm0xc3vPc2as",
};

// Generador de cadenas alfanuméricas limpias (ej. Aq6o5z8Vd5izvD)
function generarCodigoAleatorio(longitud = 12) {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let resultado = '';
    for (let i = 0; i < longitud; i++) {
        resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return resultado;
}

// Ruta raíz de verificación
app.get('/', (req, res) => {
    res.send('API Frontdigit - Whop Integration Active');
});

// Endpoint para crear referencias únicas dinámicas
app.post('/api/crear-referencia', (req, res) => {
    try {
        const { monto, concepto } = req.body;

        const planId = PLANES_WHOP[monto];
        if (!planId) {
            return res.status(400).json({ success: false, error: "Monto no válido. Elige 50, 599 o 2799." });
        }

        const nuevaRef = generarCodigoAleatorio(12);

        enlacesDePago[nuevaRef] = {
            planId: planId,
            nombre: concepto || `Payment ($${monto} MXN)`,
            usado: false,
            creado: new Date()
        };

        // 🟢 LOG DE ÉXITO AL GENERAR ENLACE
        console.log(`[ÉXITO] Enlace generado correctamente -> Ref: ${nuevaRef} | Monto: $${monto} MXN`);

        res.json({
            success: true,
            referencia: nuevaRef,
            url: `https://losangelestour.lat/payment/?ref=${nuevaRef}`
        });
    } catch (error) {
        console.error('Error al crear referencia:', error.message);
        res.status(500).json({ success: false, error: 'Error interno al generar enlace.' });
    }
});

// Endpoint para verificar si la referencia es válida y no ha sido usada
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

// Webhook para procesar pagos y bloquear la referencia consumida
app.post('/webhook-whop', (req, res) => {
    try {
        const event = req.body;
        console.log('--- EVENTO WEBHOOK RECIBIDO DE WHOP ---');

        if (event.action === 'payment.succeeded' || event.type === 'payment.succeeded') {
            const paymentData = event.data;
            const refPagada = paymentData?.metadata?.ref;

            if (refPagada && enlacesDePago[refPagada]) {
                enlacesDePago[refPagada].usado = true;
                console.log(`Referencia ${refPagada} marcada como USADA.`);
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

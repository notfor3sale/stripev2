// Almacenamiento en memoria para guardar las referencias activas
const enlacesDePago = {};

// Tus planes configurados en Whop
const PLANES_WHOP = {
    "50": "plan_ZLAkMmAd62m7n",
    "599": "plan_gGxlNUyw07uXA",
    "2799": "plan_aXFJiRdgP8ip9"
};

// Función para generar códigos alfanuméricos limpios estilo "Aq6o5z8Vd5izvD"
function generarCodigoAleatorio(longitud = 12) {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let resultado = '';
    for (let i = 0; i < longitud; i++) {
        resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return resultado;
}

// Endpoint que genera el enlace completo apuntando a /payment/?ref=...
app.post('/api/crear-referencia', (req, res) => {
    try {
        const { monto, concepto } = req.body;

        const planId = PLANES_WHOP[monto];
        if (!planId) {
            return res.status(400).json({ success: false, error: "Monto no válido. Usa 50, 599 o 2799." });
        }

        // Genera el código único aleatorio
        const nuevaRef = generarCodigoAleatorio(12);

        // Lo guarda en la memoria del servidor
        enlacesDePago[nuevaRef] = {
            planId: planId,
            nombre: concepto || `Pago FrontDigit ($${monto} MXN)`,
            usado: false,
            creado: new Date()
        };

        // Devuelve la URL exacta con la subcarpeta /payment/
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

const mongoose = require('mongoose');
const WhatsAppController = require('../src/controllers/WhatsAppController');
const WhatsAppConnection = require('../src/models/WhatsAppConnection');

(async () => {
	const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch';
	await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
	console.log(`✅ Conectado a MongoDB (${mongoUri})`);

	const controller = new WhatsAppController();
	// Stub de envío para ver los mensajes que enviaría el bot
	controller.whatsappService = {
		sendMessage: async (connectionId, to, text) => {
			const stamp = new Date().toISOString();
			console.log(`\n[${stamp}] → Mensaje a ${to}:\n${typeof text === 'string' ? text : JSON.stringify(text)}`);
		}
	};

	const connection = await WhatsAppConnection.findOne({ isConnected: true }) || await WhatsAppConnection.findOne();
	if (!connection) {
		console.error('❌ No hay conexión de WhatsApp disponible');
		process.exit(1);
	}
	const connectionId = connection._id;

	async function send(fromPhone, message) {
		const data = {
			connectionId,
			from: `${fromPhone}@c.us`,
			message,
			timestamp: new Date(),
			messageId: `sim_${Date.now()}_${Math.random().toString(36).slice(2,8)}`
		};
		await controller.handleMessageReceived(data);
	}

	async function runScenario(label, phone, prompts) {
		console.log(`\n==================\n🧪 Escenario: ${label}\n==================`);
		for (const p of prompts) {
			console.log(`\n> ${p}`);
			await send(phone, p);
			await new Promise(r => setTimeout(r, 500));
		}
	}

	try {
		// 3 personas - merienda media mañana
		await runScenario(
			'3 personas - merienda media mañana',
			'573000000003',
			[
				'hola',
				'sugerencia para 3 personas merienda de media mañana',
				'1','1','7','1','1', // respuestas 5 preguntas
				'pedir',
				'sí'
			]
		);

		// 6 personas - almuerzo informal
		await runScenario(
			'6 personas - almuerzo informal',
			'573000000006',
			[
				'hola',
				'sugerencia para 6 personas almuerzo informal',
				'5','2','7','2','1', // respuestas distintas para variar preferencias
				'pedir',
				'sí'
			]
		);
		console.log('\n🏁 Simulación completada');
	} catch (err) {
		console.error('❌ Error en simulación:', err);
	} finally {
		await mongoose.disconnect().catch(() => {});
		console.log('🔌 Desconectado de MongoDB');
	}
})();



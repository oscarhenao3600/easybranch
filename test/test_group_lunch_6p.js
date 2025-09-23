const AIService = require('../src/services/AIService');
const mongoose = require('mongoose');

(async () => {
	const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch';
	await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
	console.log(`✅ Conectado a MongoDB (${mongoUri})`);

	const aiService = new AIService();
	const branchId = '68c30abfe53cbd0d740e8c4e';
	const clientId = 'test-client-lunch-6p';

	function toText(resp) {
		if (resp == null) return '';
		if (typeof resp === 'string') return resp;
		if (typeof resp.text === 'string') return resp.text;
		return String(resp);
	}

	async function step(input) {
		const out = await aiService.generateResponse(branchId, input, clientId, 'restaurant', null);
		const text = toText(out);
		console.log(`> ${input}\n${text}\n`);
		return text;
	}

	try {
		await step('hola');
		await step('menu');
		await step('recomiéndame algo para 6 personas para almuerzo');
		await step('pedir');
		await step('sí');
		console.log('🏁 Prueba 6p almuerzo finalizada');
	} catch (err) {
		console.error('❌ Error en prueba 6p almuerzo:', err);
		process.exit(1);
	} finally {
		await mongoose.disconnect().catch(() => {});
		console.log('🔌 Desconectado de MongoDB');
	}
})();



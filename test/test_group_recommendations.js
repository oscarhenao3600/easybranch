const AIService = require('../src/services/AIService');
const mongoose = require('mongoose');

(async () => {
	// Conexión a MongoDB para evitar errores de colección indefinida
	const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch';
	try {
		await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
		console.log(`✅ Conectado a MongoDB (${mongoUri})`);
	} catch (err) {
		console.error('❌ No se pudo conectar a MongoDB:', err.message);
		process.exit(1);
	}

	const aiService = new AIService();
	const branchId = '68c30abfe53cbd0d740e8c4e';
	const client3 = 'test-client-3p';
	const client6 = 'test-client-6p';

	function toText(resp) {
		if (resp == null) return '';
		if (typeof resp === 'string') return resp;
		if (typeof resp.text === 'string') return resp.text;
		return String(resp);
	}

	async function runScenario(clientId, peopleCount) {
		const transcript = [];

		async function step(input) {
			const out = await aiService.generateResponse(branchId, input, clientId, 'restaurant', null);
			const text = toText(out);
			transcript.push({ input, text });
			return text;
		}

		await step('hola');
		await step('menu');
		await step(`recomiéndame algo para ${peopleCount} personas, merienda de media mañana informal`);
		await step('pedir');
		await step('sí');
		return transcript;
	}

	function summarize(transcript) {
		return transcript.map(t => `> ${t.input}\n${t.text}`).join('\n\n');
	}

	function diff(a, b) {
		if (a === b) return null;
		return {
			lenA: a.length,
			lenB: b.length,
			samePrefix: a.slice(0, 200) === b.slice(0, 200),
			snippetA: a.slice(0, 400),
			snippetB: b.slice(0, 400)
		};
	}

	try {
		console.log('🧪 Ejecutando escenario para 3 personas...');
		const t3 = await runScenario(client3, 3);
		console.log('✅ Escenario 3 personas completado');

		console.log('\n🧪 Ejecutando escenario para 6 personas...');
		const t6 = await runScenario(client6, 6);
		console.log('✅ Escenario 6 personas completado');

		const s3 = summarize(t3);
		const s6 = summarize(t6);
		const comparison = diff(s3, s6);

		console.log('\n📋 Transcripción (3 personas):');
		console.log(s3);
		console.log('\n📋 Transcripción (6 personas):');
		console.log(s6);

		console.log('\n🔍 Comparación:');
		if (!comparison) {
			console.log('❗ Las respuestas para 3 y 6 personas son EXACTAMENTE IGUALES.');
		} else {
			console.log(`Diferencias detectadas. Longitudes: 3p=${comparison.lenA}, 6p=${comparison.lenB}`);
			console.log(`¿Mismo prefijo de 200 chars?: ${comparison.samePrefix ? 'Sí' : 'No'}`);
			console.log('\n— 3 personas (fragmento) —');
			console.log(comparison.snippetA);
			console.log('\n— 6 personas (fragmento) —');
			console.log(comparison.snippetB);
		}
		console.log('\n🏁 Prueba finalizada');
	} catch (err) {
		console.error('❌ Error en la prueba:', err);
		process.exit(1);
	} finally {
		await mongoose.disconnect().catch(() => {});
		console.log('🔌 Desconectado de MongoDB');
	}
})();

const mongoose = require('mongoose');
const RecommendationService = require('../src/services/RecommendationService');
const BranchAIConfig = require('../src/models/BranchAIConfig');

(async () => {
	const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch';
	await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
	console.log('✅ Conectado a MongoDB');

	const service = new RecommendationService();
	const branchId = '68c30abfe53cbd0d740e8c4e';
	const businessId = 'dummy-business-id';

	async function ensureConfig() {
		const cfg = await BranchAIConfig.findOne({ branchId });
		if (!cfg) throw new Error('No hay BranchAIConfig con menú para pruebas');
	}

	async function runForPeople(people, phone) {
		console.log(`\n🧪 Sesión para ${people} personas`);
		const session = await service.createSession(phone, branchId, businessId, people);
		const sequence = [];
		for (let i = 0; i < 5; i++) {
			const q = await service.getNextQuestion(session.sessionId);
			if (q.type !== 'question') break;
			sequence.push({ id: i + 1, questionId: service.selectNextQuestion.toString().includes('baseSequence') ? 'var' : 'std', text: q.question });
			// responder siempre "1" para avanzar
			await service.processAnswer(session.sessionId, '1');
		}
		console.log('📋 Orden de preguntas:');
		sequence.forEach((q, idx) => console.log(` ${idx + 1}. ${q.text}`));
		return sequence.map(q => q.text);
	}

	try {
		await ensureConfig();
		const seq3 = await runForPeople(3, '573000000003');
		const seq6 = await runForPeople(6, '573000000006');
		console.log('\n🔍 Comparación textual (pregunta 1):');
		console.log(`3p: ${seq3[0]}`);
		console.log(`6p: ${seq6[0]}`);
		console.log('\n🔍 ¿Secuencias iguales?:', JSON.stringify(seq3) === JSON.stringify(seq6) ? 'Sí' : 'No');
	} catch (e) {
		console.error('❌ Error:', e.message);
		process.exit(1);
	} finally {
		await mongoose.disconnect().catch(() => {});
		console.log('🔌 Desconectado de MongoDB');
	}
})();



const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(process.cwd(), 'backend', '.env') });

const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');

async function connectMongo() {
  const environment = process.env.NODE_ENV || 'development';
  const mongoUri = environment === 'production'
    ? (process.env.MONGODB_URI_PROD || process.env.MONGODB_URI)
    : (process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/easybranch');

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
}

function getMigrationModel() {
  const schema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    appliedAt: { type: Date, default: Date.now }
  }, { versionKey: false, collection: 'migrations' });
  return mongoose.models.Migration || mongoose.model('Migration', schema);
}

function loadMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.js'))
    .sort()
    .map((file) => ({ file, fullPath: path.join(MIGRATIONS_DIR, file) }));
}

async function getAppliedNames(Migration) {
  const docs = await Migration.find({}, { _id: 0, name: 1 }).lean();
  return new Set(docs.map((d) => d.name));
}

async function run() {
  await connectMongo();
  const Migration = getMigrationModel();
  const migrations = loadMigrations();
  const applied = await getAppliedNames(Migration);

  for (const m of migrations) {
    if (applied.has(m.file)) continue;

    // eslint-disable-next-line import/no-dynamic-require, global-require
    const mod = require(m.fullPath);
    if (typeof mod.up !== 'function') {
      // skip files without up()
      // eslint-disable-next-line no-console
      console.warn(`Skipping ${m.file} - no up() export`);
      // mark as applied to avoid blocking
      // eslint-disable-next-line no-await-in-loop
      await Migration.create({ name: m.file });
      // eslint-disable-next-line no-continue
      continue;
    }

    // eslint-disable-next-line no-console
    console.log(`Running migration: ${m.file}`);
    // eslint-disable-next-line no-await-in-loop
    await mod.up(mongoose);
    // eslint-disable-next-line no-await-in-loop
    await Migration.create({ name: m.file });
    // eslint-disable-next-line no-console
    console.log(`Applied: ${m.file}`);
  }

  await mongoose.connection.close();
}

if (require.main === module) {
  run().catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error('Migration error:', err);
    try { await mongoose.connection.close(); } catch (_) {}
    process.exit(1);
  });
}

module.exports = { run };


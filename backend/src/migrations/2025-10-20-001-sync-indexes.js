const path = require('path');
const fs = require('fs');

async function ensureModelsLoaded() {
  const modelsDir = path.resolve(__dirname, '../models');
  if (!fs.existsSync(modelsDir)) return;
  const files = fs.readdirSync(modelsDir).filter((f) => f.endsWith('.js'));
  for (const file of files) {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    require(path.join(modelsDir, file));
  }
}

module.exports.up = async function up(mongoose) {
  await ensureModelsLoaded();
  const modelNames = mongoose.modelNames();

  // eslint-disable-next-line no-console
  console.log('Syncing indexes for models:', modelNames);

  for (const name of modelNames) {
    const model = mongoose.model(name);
    // eslint-disable-next-line no-console
    console.log(`Ensuring indexes for ${name}...`);
    // eslint-disable-next-line no-await-in-loop
    await model.syncIndexes();
  }
};



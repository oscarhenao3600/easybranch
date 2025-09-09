const { migrateBusinessAndBranchData } = require('./migrate-business-branch');
const { verifyMigration } = require('./verify-migration');
const LoggerService = require('../src/services/LoggerService');

const logger = new LoggerService();

// Master migration script
async function runCompleteMigration() {
    try {
        logger.info('Starting complete migration process...');
        
        // Step 1: Run migration
        logger.info('Step 1: Running migration...');
        await migrateBusinessAndBranchData();
        
        // Step 2: Verify migration
        logger.info('Step 2: Verifying migration...');
        await verifyMigration();
        
        logger.info('Complete migration process finished successfully!');
        
    } catch (error) {
        logger.error('Migration process failed:', error);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    runCompleteMigration()
        .then(() => {
            console.log('Complete migration process completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Complete migration process failed:', error);
            process.exit(1);
        });
}

module.exports = { runCompleteMigration };

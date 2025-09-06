const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Business = require('../src/models/Business');
const Branch = require('../src/models/Branch');
const LoggerService = require('../src/services/LoggerService');

const logger = new LoggerService();

// Diagnostic script to check current data structure
async function diagnoseData() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        logger.info('Connected to MongoDB for diagnosis');
        
        // Check businesses
        await diagnoseBusinesses();
        
        // Check branches
        await diagnoseBranches();
        
        logger.info('Diagnosis completed');
        
    } catch (error) {
        logger.error('Diagnosis failed:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');
    }
}

async function diagnoseBusinesses() {
    logger.info('Diagnosing businesses...');
    
    try {
        const businesses = await Business.find({});
        logger.info(`Found ${businesses.length} businesses`);
        
        for (const business of businesses) {
            logger.info(`Business ${business.businessId}:`);
            logger.info(`  - name: ${business.name || 'undefined'}`);
            logger.info(`  - razonSocial: ${business.razonSocial || 'undefined'}`);
            logger.info(`  - nit: ${business.nit || 'undefined'}`);
            logger.info(`  - phone: ${business.phone || 'undefined'}`);
            logger.info(`  - address: ${business.address || 'undefined'} (type: ${typeof business.address})`);
            logger.info(`  - city: ${business.city || 'undefined'}`);
            logger.info(`  - department: ${business.department || 'undefined'}`);
            logger.info(`  - country: ${business.country || 'undefined'}`);
            logger.info(`  - contact: ${JSON.stringify(business.contact || {})}`);
            logger.info('  ---');
        }
        
    } catch (error) {
        logger.error('Error diagnosing businesses:', error);
        throw error;
    }
}

async function diagnoseBranches() {
    logger.info('Diagnosing branches...');
    
    try {
        const branches = await Branch.find({});
        logger.info(`Found ${branches.length} branches`);
        
        for (const branch of branches) {
            logger.info(`Branch ${branch.branchId}:`);
            logger.info(`  - name: ${branch.name || 'undefined'}`);
            logger.info(`  - razonSocial: ${branch.razonSocial || 'undefined'}`);
            logger.info(`  - nit: ${branch.nit || 'undefined'}`);
            logger.info(`  - phone: ${branch.phone || 'undefined'}`);
            logger.info(`  - address: ${branch.address || 'undefined'} (type: ${typeof branch.address})`);
            logger.info(`  - city: ${branch.city || 'undefined'}`);
            logger.info(`  - department: ${branch.department || 'undefined'}`);
            logger.info(`  - country: ${branch.country || 'undefined'}`);
            logger.info(`  - businessId: ${branch.businessId || 'undefined'}`);
            logger.info(`  - contact: ${JSON.stringify(branch.contact || {})}`);
            logger.info('  ---');
        }
        
    } catch (error) {
        logger.error('Error diagnosing branches:', error);
        throw error;
    }
}

// Run diagnosis if called directly
if (require.main === module) {
    diagnoseData()
        .then(() => {
            console.log('Diagnosis completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Diagnosis failed:', error);
            process.exit(1);
        });
}

module.exports = { diagnoseData };

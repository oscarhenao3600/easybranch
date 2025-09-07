const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Business = require('../src/models/Business');
const Branch = require('../src/models/Branch');
const LoggerService = require('../src/services/LoggerService');

const logger = new LoggerService();

// Ultimate migration script using updateMany with specific conditions
async function ultimateMigration() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        logger.info('Connected to MongoDB for ultimate migration');
        
        // Update businesses using updateMany
        await ultimateUpdateBusinesses();
        
        // Update branches using updateMany
        await ultimateUpdateBranches();
        
        logger.info('Ultimate migration completed successfully');
        
    } catch (error) {
        logger.error('Ultimate migration failed:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');
    }
}

async function ultimateUpdateBusinesses() {
    logger.info('Ultimate updating businesses...');
    
    try {
        // Update businesses that have contact.phone but no phone
        const result = await Business.updateMany(
            { 
                'contact.phone': { $exists: true },
                phone: { $exists: false }
            },
            [
                {
                    $set: {
                        phone: '$contact.phone'
                    }
                }
            ]
        );
        
        logger.info(`Updated ${result.modifiedCount} businesses with phone field`);
        
        // Update businesses that have name but no razonSocial
        const result2 = await Business.updateMany(
            { 
                name: { $exists: true },
                razonSocial: { $exists: false }
            },
            [
                {
                    $set: {
                        razonSocial: '$name'
                    }
                }
            ]
        );
        
        logger.info(`Updated ${result2.modifiedCount} businesses with razonSocial field`);
        
    } catch (error) {
        logger.error('Error ultimate updating businesses:', error);
        throw error;
    }
}

async function ultimateUpdateBranches() {
    logger.info('Ultimate updating branches...');
    
    try {
        // Update branches that have contact.phone but no phone
        const result = await Branch.updateMany(
            { 
                'contact.phone': { $exists: true },
                phone: { $exists: false }
            },
            [
                {
                    $set: {
                        phone: '$contact.phone'
                    }
                }
            ]
        );
        
        logger.info(`Updated ${result.modifiedCount} branches with phone field`);
        
        // Update branches that have name but no razonSocial
        const result2 = await Branch.updateMany(
            { 
                name: { $exists: true },
                razonSocial: { $exists: false }
            },
            [
                {
                    $set: {
                        razonSocial: '$name'
                    }
                }
            ]
        );
        
        logger.info(`Updated ${result2.modifiedCount} branches with razonSocial field`);
        
    } catch (error) {
        logger.error('Error ultimate updating branches:', error);
        throw error;
    }
}

// Run ultimate migration if called directly
if (require.main === module) {
    ultimateMigration()
        .then(() => {
            console.log('Ultimate migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Ultimate migration failed:', error);
            process.exit(1);
        });
}

module.exports = { ultimateMigration };

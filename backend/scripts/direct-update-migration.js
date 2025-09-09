const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Business = require('../src/models/Business');
const Branch = require('../src/models/Branch');
const LoggerService = require('../src/services/LoggerService');

const logger = new LoggerService();

// Direct update script using updateMany
async function directUpdateMigration() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        logger.info('Connected to MongoDB for direct update migration');
        
        // Update businesses
        await directUpdateBusinesses();
        
        // Update branches
        await directUpdateBranches();
        
        logger.info('Direct update migration completed successfully');
        
    } catch (error) {
        logger.error('Direct update migration failed:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');
    }
}

async function directUpdateBusinesses() {
    logger.info('Direct updating businesses...');
    
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
        
        // Update businesses that have razonSocial but no name
        const result2 = await Business.updateMany(
            { 
                razonSocial: { $exists: true },
                name: { $exists: false }
            },
            [
                {
                    $set: {
                        name: '$razonSocial'
                    }
                }
            ]
        );
        
        logger.info(`Updated ${result2.modifiedCount} businesses with name field`);
        
    } catch (error) {
        logger.error('Error direct updating businesses:', error);
        throw error;
    }
}

async function directUpdateBranches() {
    logger.info('Direct updating branches...');
    
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
        
        // Update branches that have razonSocial but no name
        const result2 = await Branch.updateMany(
            { 
                razonSocial: { $exists: true },
                name: { $exists: false }
            },
            [
                {
                    $set: {
                        name: '$razonSocial'
                    }
                }
            ]
        );
        
        logger.info(`Updated ${result2.modifiedCount} branches with name field`);
        
    } catch (error) {
        logger.error('Error direct updating branches:', error);
        throw error;
    }
}

// Run direct update if called directly
if (require.main === module) {
    directUpdateMigration()
        .then(() => {
            console.log('Direct update migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Direct update migration failed:', error);
            process.exit(1);
        });
}

module.exports = { directUpdateMigration };

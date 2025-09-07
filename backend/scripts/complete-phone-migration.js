const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Business = require('../src/models/Business');
const Branch = require('../src/models/Branch');
const LoggerService = require('../src/services/LoggerService');

const logger = new LoggerService();

// Complete migration script to add phone field
async function completePhoneMigration() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        logger.info('Connected to MongoDB for complete phone migration');
        
        // Get raw MongoDB connection
        const db = mongoose.connection.db;
        
        // Update businesses with phone field
        await completeBusinessPhones(db);
        
        // Update branches with phone field
        await completeBranchPhones(db);
        
        logger.info('Complete phone migration completed successfully');
        
    } catch (error) {
        logger.error('Complete phone migration failed:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');
    }
}

async function completeBusinessPhones(db) {
    logger.info('Completing business phones...');
    
    try {
        const businessesCollection = db.collection('businesses');
        
        // Find all businesses
        const businesses = await businessesCollection.find({}).toArray();
        logger.info(`Found ${businesses.length} businesses to update`);
        
        for (const business of businesses) {
            if (business.contact && business.contact.phone && !business.phone) {
                await businessesCollection.updateOne(
                    { _id: business._id },
                    { $set: { phone: business.contact.phone } }
                );
                logger.info(`Updated business ${business.businessId} with phone: ${business.contact.phone}`);
            }
        }
        
        logger.info('Business phone completion finished');
        
    } catch (error) {
        logger.error('Error completing business phones:', error);
        throw error;
    }
}

async function completeBranchPhones(db) {
    logger.info('Completing branch phones...');
    
    try {
        const branchesCollection = db.collection('branches');
        
        // Find all branches
        const branches = await branchesCollection.find({}).toArray();
        logger.info(`Found ${branches.length} branches to update`);
        
        for (const branch of branches) {
            if (branch.contact && branch.contact.phone && !branch.phone) {
                await branchesCollection.updateOne(
                    { _id: branch._id },
                    { $set: { phone: branch.contact.phone } }
                );
                logger.info(`Updated branch ${branch.branchId} with phone: ${branch.contact.phone}`);
            }
        }
        
        logger.info('Branch phone completion finished');
        
    } catch (error) {
        logger.error('Error completing branch phones:', error);
        throw error;
    }
}

// Run complete phone migration if called directly
if (require.main === module) {
    completePhoneMigration()
        .then(() => {
            console.log('Complete phone migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Complete phone migration failed:', error);
            process.exit(1);
        });
}

module.exports = { completePhoneMigration };

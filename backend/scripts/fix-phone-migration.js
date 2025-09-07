const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Business = require('../src/models/Business');
const Branch = require('../src/models/Branch');
const LoggerService = require('../src/services/LoggerService');

const logger = new LoggerService();

// Direct migration script to fix phone field issue
async function fixPhoneMigration() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        logger.info('Connected to MongoDB for phone migration fix');
        
        // Fix businesses
        await fixBusinessPhones();
        
        // Fix branches
        await fixBranchPhones();
        
        logger.info('Phone migration fix completed successfully');
        
    } catch (error) {
        logger.error('Phone migration fix failed:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');
    }
}

async function fixBusinessPhones() {
    logger.info('Fixing business phones...');
    
    try {
        const businesses = await Business.find({});
        logger.info(`Found ${businesses.length} businesses to fix`);
        
        for (const business of businesses) {
            if (business.contact && business.contact.phone && !business.phone) {
                await Business.findByIdAndUpdate(business._id, {
                    phone: business.contact.phone
                });
                logger.info(`Fixed phone for business: ${business.businessId} -> ${business.contact.phone}`);
            }
        }
        
        logger.info('Business phone fix completed');
        
    } catch (error) {
        logger.error('Error fixing business phones:', error);
        throw error;
    }
}

async function fixBranchPhones() {
    logger.info('Fixing branch phones...');
    
    try {
        const branches = await Branch.find({});
        logger.info(`Found ${branches.length} branches to fix`);
        
        for (const branch of branches) {
            if (branch.contact && branch.contact.phone && !branch.phone) {
                await Branch.findByIdAndUpdate(branch._id, {
                    phone: branch.contact.phone
                });
                logger.info(`Fixed phone for branch: ${branch.branchId} -> ${branch.contact.phone}`);
            }
        }
        
        logger.info('Branch phone fix completed');
        
    } catch (error) {
        logger.error('Error fixing branch phones:', error);
        throw error;
    }
}

// Run fix if called directly
if (require.main === module) {
    fixPhoneMigration()
        .then(() => {
            console.log('Phone migration fix completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Phone migration fix failed:', error);
            process.exit(1);
        });
}

module.exports = { fixPhoneMigration };

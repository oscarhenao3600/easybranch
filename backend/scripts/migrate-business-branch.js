const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Business = require('../src/models/Business');
const Branch = require('../src/models/Branch');
const LoggerService = require('../src/services/LoggerService');

const logger = new LoggerService();

// Migration script to update existing businesses and branches
async function migrateBusinessAndBranchData() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        logger.info('Connected to MongoDB for migration');
        
        // Step 1: Update existing businesses
        await migrateBusinesses();
        
        // Step 2: Update existing branches
        await migrateBranches();
        
        logger.info('Migration completed successfully');
        
    } catch (error) {
        logger.error('Migration failed:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');
    }
}

async function migrateBusinesses() {
    logger.info('Starting business migration...');
    
    try {
        // Get all existing businesses
        const businesses = await Business.find({});
        logger.info(`Found ${businesses.length} businesses to migrate`);
        
        for (const business of businesses) {
            const updateData = {};
            
            // Check if business needs migration (has old structure)
            if (business.address && typeof business.address === 'object') {
                // Migrate from old address structure to new flat structure
                updateData.address = business.address.street || business.address;
                updateData.city = business.address.city || 'Bogotá';
                updateData.department = business.address.state || 'Cundinamarca';
                updateData.country = business.address.country || 'Colombia';
            } else if (!business.address) {
                // Add default address if missing
                updateData.address = 'Dirección por definir';
                updateData.city = 'Bogotá';
                updateData.department = 'Cundinamarca';
                updateData.country = 'Colombia';
            }
            
            // Migrate contact phone to main phone field
            if (business.contact && business.contact.phone && !business.phone) {
                updateData.phone = business.contact.phone;
            } else if (!business.phone) {
                // Add default phone if missing
                updateData.phone = '+573000000000';
            }
            
            // Add default values for new required fields if missing
            if (!business.nit) {
                updateData.nit = `MIGRATED-${business.businessId}`;
            }
            
            if (!business.name && !business.razonSocial) {
                updateData.name = business.businessId; // Fallback to businessId
            }
            
            // Add default country if missing
            if (!business.country) {
                updateData.country = 'Colombia';
            }
            
            // Only update if there are changes
            if (Object.keys(updateData).length > 0) {
                await Business.findByIdAndUpdate(business._id, updateData);
                logger.info(`Migrated business: ${business.businessId}`);
            }
        }
        
        logger.info('Business migration completed');
        
    } catch (error) {
        logger.error('Error migrating businesses:', error);
        throw error;
    }
}

async function migrateBranches() {
    logger.info('Starting branch migration...');
    
    try {
        // Get all existing branches
        const branches = await Branch.find({});
        logger.info(`Found ${branches.length} branches to migrate`);
        
        for (const branch of branches) {
            const updateData = {};
            
            // Check if branch needs migration (has old structure)
            if (branch.address && typeof branch.address === 'object') {
                // Migrate from old address structure to new flat structure
                updateData.address = branch.address.street || branch.address;
                updateData.city = branch.address.city || 'Bogotá';
                updateData.department = branch.address.state || 'Cundinamarca';
                updateData.country = branch.address.country || 'Colombia';
            } else if (!branch.address) {
                // Add default address if missing
                updateData.address = 'Dirección por definir';
                updateData.city = 'Bogotá';
                updateData.department = 'Cundinamarca';
                updateData.country = 'Colombia';
            }
            
            // Migrate contact phone to main phone field
            if (branch.contact && branch.contact.phone && !branch.phone) {
                updateData.phone = branch.contact.phone;
            } else if (!branch.phone) {
                // Add default phone if missing
                updateData.phone = '+573000000000';
            }
            
            // Add default values for new required fields if missing
            if (!branch.nit) {
                updateData.nit = `MIGRATED-${branch.branchId}`;
            }
            
            if (!branch.name && !branch.razonSocial) {
                updateData.name = branch.branchId; // Fallback to branchId
            }
            
            // Add default country if missing
            if (!branch.country) {
                updateData.country = 'Colombia';
            }
            
            // Ensure businessId exists (should already exist)
            if (!branch.businessId) {
                logger.warn(`Branch ${branch.branchId} has no businessId, skipping...`);
                continue;
            }
            
            // Only update if there are changes
            if (Object.keys(updateData).length > 0) {
                await Branch.findByIdAndUpdate(branch._id, updateData);
                logger.info(`Migrated branch: ${branch.branchId}`);
            }
        }
        
        logger.info('Branch migration completed');
        
    } catch (error) {
        logger.error('Error migrating branches:', error);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateBusinessAndBranchData()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateBusinessAndBranchData };

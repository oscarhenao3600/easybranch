const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Business = require('../src/models/Business');
const Branch = require('../src/models/Branch');
const LoggerService = require('../src/services/LoggerService');

const logger = new LoggerService();

// Rollback script to revert business and branch data changes
async function rollbackBusinessAndBranchData() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        logger.info('Connected to MongoDB for rollback');
        
        // Step 1: Rollback businesses
        await rollbackBusinesses();
        
        // Step 2: Rollback branches
        await rollbackBranches();
        
        logger.info('Rollback completed successfully');
        
    } catch (error) {
        logger.error('Rollback failed:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');
    }
}

async function rollbackBusinesses() {
    logger.info('Starting business rollback...');
    
    try {
        // Get all businesses
        const businesses = await Business.find({});
        logger.info(`Found ${businesses.length} businesses to rollback`);
        
        for (const business of businesses) {
            const updateData = {};
            
            // Convert flat structure back to nested structure
            if (business.address && typeof business.address === 'string') {
                updateData.address = {
                    street: business.address,
                    city: business.city || 'Bogotá',
                    state: business.department || 'Cundinamarca',
                    country: business.country || 'Colombia',
                    zipCode: '110111'
                };
            }
            
            // Move phone back to contact object
            if (business.phone && business.contact) {
                updateData.contact = {
                    ...business.contact,
                    phone: business.phone
                };
            }
            
            // Remove new fields that were added
            const fieldsToRemove = ['razonSocial', 'nit', 'city', 'department', 'country'];
            for (const field of fieldsToRemove) {
                if (business[field]) {
                    updateData[field] = undefined;
                }
            }
            
            // Only update if there are changes
            if (Object.keys(updateData).length > 0) {
                await Business.findByIdAndUpdate(business._id, updateData);
                logger.info(`Rolled back business: ${business.businessId}`);
            }
        }
        
        logger.info('Business rollback completed');
        
    } catch (error) {
        logger.error('Error rolling back businesses:', error);
        throw error;
    }
}

async function rollbackBranches() {
    logger.info('Starting branch rollback...');
    
    try {
        // Get all branches
        const branches = await Branch.find({});
        logger.info(`Found ${branches.length} branches to rollback`);
        
        for (const branch of branches) {
            const updateData = {};
            
            // Convert flat structure back to nested structure
            if (branch.address && typeof branch.address === 'string') {
                updateData.address = {
                    street: branch.address,
                    city: branch.city || 'Bogotá',
                    state: branch.department || 'Cundinamarca',
                    country: branch.country || 'Colombia',
                    zipCode: '110111'
                };
            }
            
            // Move phone back to contact object
            if (branch.phone && branch.contact) {
                updateData.contact = {
                    ...branch.contact,
                    phone: branch.phone
                };
            }
            
            // Remove new fields that were added
            const fieldsToRemove = ['razonSocial', 'nit', 'city', 'department', 'country', 'manager'];
            for (const field of fieldsToRemove) {
                if (branch[field]) {
                    updateData[field] = undefined;
                }
            }
            
            // Only update if there are changes
            if (Object.keys(updateData).length > 0) {
                await Branch.findByIdAndUpdate(branch._id, updateData);
                logger.info(`Rolled back branch: ${branch.branchId}`);
            }
        }
        
        logger.info('Branch rollback completed');
        
    } catch (error) {
        logger.error('Error rolling back branches:', error);
        throw error;
    }
}

// Run rollback if called directly
if (require.main === module) {
    rollbackBusinessAndBranchData()
        .then(() => {
            console.log('Rollback completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Rollback failed:', error);
            process.exit(1);
        });
}

module.exports = { rollbackBusinessAndBranchData };

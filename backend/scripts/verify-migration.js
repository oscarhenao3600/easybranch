const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Business = require('../src/models/Business');
const Branch = require('../src/models/Branch');
const LoggerService = require('../src/services/LoggerService');

const logger = new LoggerService();

// Verification script to check migration status
async function verifyMigration() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        logger.info('Connected to MongoDB for verification');
        
        // Verify businesses
        await verifyBusinesses();
        
        // Verify branches
        await verifyBranches();
        
        logger.info('Verification completed successfully');
        
    } catch (error) {
        logger.error('Verification failed:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');
    }
}

async function verifyBusinesses() {
    logger.info('Verifying businesses...');
    
    try {
        const businesses = await Business.find({});
        logger.info(`Found ${businesses.length} businesses`);
        
        let validCount = 0;
        let invalidCount = 0;
        
        for (const business of businesses) {
            const issues = [];
            
            // Check required fields
            if (!business.nit) issues.push('Missing NIT');
            if (!business.phone) issues.push('Missing phone');
            if (!business.address) issues.push('Missing address');
            if (!business.city) issues.push('Missing city');
            if (!business.department) issues.push('Missing department');
            if (!business.country) issues.push('Missing country');
            
            // Check that at least one of name or razonSocial exists
            if (!business.name && !business.razonSocial) {
                issues.push('Missing both name and razonSocial');
            }
            
            // Check data types
            if (business.address && typeof business.address !== 'string') {
                issues.push('Address should be string');
            }
            
            if (issues.length === 0) {
                validCount++;
                logger.info(`✓ Business ${business.businessId} is valid`);
            } else {
                invalidCount++;
                logger.warn(`✗ Business ${business.businessId} has issues: ${issues.join(', ')}`);
            }
        }
        
        logger.info(`Business verification: ${validCount} valid, ${invalidCount} invalid`);
        
        if (invalidCount > 0) {
            throw new Error(`${invalidCount} businesses have validation issues`);
        }
        
    } catch (error) {
        logger.error('Error verifying businesses:', error);
        throw error;
    }
}

async function verifyBranches() {
    logger.info('Verifying branches...');
    
    try {
        const branches = await Branch.find({});
        logger.info(`Found ${branches.length} branches`);
        
        let validCount = 0;
        let invalidCount = 0;
        
        for (const branch of branches) {
            const issues = [];
            
            // Check required fields
            if (!branch.nit) issues.push('Missing NIT');
            if (!branch.phone) issues.push('Missing phone');
            if (!branch.address) issues.push('Missing address');
            if (!branch.city) issues.push('Missing city');
            if (!branch.department) issues.push('Missing department');
            if (!branch.country) issues.push('Missing country');
            if (!branch.businessId) issues.push('Missing businessId');
            
            // Check that at least one of name or razonSocial exists
            if (!branch.name && !branch.razonSocial) {
                issues.push('Missing both name and razonSocial');
            }
            
            // Check data types
            if (branch.address && typeof branch.address !== 'string') {
                issues.push('Address should be string');
            }
            
            // Verify businessId exists
            if (branch.businessId) {
                const business = await Business.findById(branch.businessId);
                if (!business) {
                    issues.push('Referenced business does not exist');
                }
            }
            
            if (issues.length === 0) {
                validCount++;
                logger.info(`✓ Branch ${branch.branchId} is valid`);
            } else {
                invalidCount++;
                logger.warn(`✗ Branch ${branch.branchId} has issues: ${issues.join(', ')}`);
            }
        }
        
        logger.info(`Branch verification: ${validCount} valid, ${invalidCount} invalid`);
        
        if (invalidCount > 0) {
            throw new Error(`${invalidCount} branches have validation issues`);
        }
        
    } catch (error) {
        logger.error('Error verifying branches:', error);
        throw error;
    }
}

// Run verification if called directly
if (require.main === module) {
    verifyMigration()
        .then(() => {
            console.log('Verification completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Verification failed:', error);
            process.exit(1);
        });
}

module.exports = { verifyMigration };

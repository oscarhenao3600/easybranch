const mongoose = require('mongoose');
const Business = require('./src/models/Business');
const Branch = require('./src/models/Branch');

async function checkCafeAroma() {
  try {
    await mongoose.connect('mongodb://localhost:27017/easybranch');
    console.log('Conectado a MongoDB');
    
    // Buscar Café Aroma
    const cafeAroma = await Business.findOne({ name: { $regex: 'Café Aroma', $options: 'i' } });
    console.log('Café Aroma encontrado:', cafeAroma ? cafeAroma.name : 'No encontrado');
    
    if (cafeAroma) {
      console.log('Business ID:', cafeAroma._id);
      
      // Buscar sucursales de Café Aroma
      const branches = await Branch.find({ businessId: cafeAroma._id });
      console.log('Sucursales encontradas:', branches.length);
      
      branches.forEach((branch, index) => {
        console.log(`Sucursal ${index + 1}:`, {
          name: branch.name,
          nit: branch.nit,
          phone: branch.phone,
          city: branch.address?.city
        });
      });
    }
    
    // También buscar todas las sucursales
    const allBranches = await Branch.find({}).populate('businessId', 'name');
    console.log('\nTodas las sucursales en la base de datos:');
    allBranches.forEach((branch, index) => {
      console.log(`${index + 1}. ${branch.businessId?.name || 'Sin negocio'} - ${branch.name || branch.nit}`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkCafeAroma();

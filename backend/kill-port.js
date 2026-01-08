// Script para matar procesos que están usando un puerto específico
const { exec } = require('child_process');
const readline = require('readline');

const PORT = process.argv[2] || 3000;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`🔍 Buscando procesos usando el puerto ${PORT}...`);

// Windows
if (process.platform === 'win32') {
  exec(`netstat -ano | findstr :${PORT}`, (error, stdout, stderr) => {
    if (error || !stdout.trim()) {
      console.log(`✅ No se encontraron procesos usando el puerto ${PORT}`);
      process.exit(0);
    }

    const lines = stdout.trim().split('\n');
    const pids = new Set();
    
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length > 0) {
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && !isNaN(pid)) {
          pids.add(pid);
        }
      }
    });

    if (pids.size === 0) {
      console.log(`✅ No se encontraron procesos usando el puerto ${PORT}`);
      process.exit(0);
    }

    console.log(`\n⚠️  Se encontraron ${pids.size} proceso(s) usando el puerto ${PORT}:`);
    pids.forEach(pid => {
      console.log(`   PID: ${pid}`);
    });

    rl.question(`\n¿Deseas terminar estos procesos? (s/n): `, (answer) => {
      if (answer.toLowerCase() === 's' || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'si') {
        pids.forEach(pid => {
          console.log(`🛑 Terminando proceso ${pid}...`);
          exec(`taskkill /PID ${pid} /F`, (error, stdout, stderr) => {
            if (error) {
              console.error(`❌ Error terminando proceso ${pid}:`, error.message);
            } else {
              console.log(`✅ Proceso ${pid} terminado`);
            }
          });
        });
        setTimeout(() => {
          console.log('\n✅ Procesos terminados. Puedes reiniciar el servidor ahora.');
          rl.close();
          process.exit(0);
        }, 2000);
      } else {
        console.log('❌ Operación cancelada');
        rl.close();
        process.exit(0);
      }
    });
  });
} else {
  // Linux/Mac
  exec(`lsof -ti :${PORT}`, (error, stdout, stderr) => {
    if (error || !stdout.trim()) {
      console.log(`✅ No se encontraron procesos usando el puerto ${PORT}`);
      process.exit(0);
    }

    const pids = stdout.trim().split('\n').filter(pid => pid);
    
    console.log(`\n⚠️  Se encontraron ${pids.length} proceso(s) usando el puerto ${PORT}:`);
    pids.forEach(pid => {
      console.log(`   PID: ${pid}`);
    });

    rl.question(`\n¿Deseas terminar estos procesos? (s/n): `, (answer) => {
      if (answer.toLowerCase() === 's' || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'si') {
        pids.forEach(pid => {
          console.log(`🛑 Terminando proceso ${pid}...`);
          exec(`kill -9 ${pid}`, (error, stdout, stderr) => {
            if (error) {
              console.error(`❌ Error terminando proceso ${pid}:`, error.message);
            } else {
              console.log(`✅ Proceso ${pid} terminado`);
            }
          });
        });
        setTimeout(() => {
          console.log('\n✅ Procesos terminados. Puedes reiniciar el servidor ahora.');
          rl.close();
          process.exit(0);
        }, 2000);
      } else {
        console.log('❌ Operación cancelada');
        rl.close();
        process.exit(0);
      }
    });
  });
}

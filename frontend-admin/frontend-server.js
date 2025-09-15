const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle all other routes by serving the requested file
app.get('*', (req, res) => {
    const fullPath = path.join(__dirname, req.path);
    console.log('Requested file:', fullPath);
    res.sendFile(fullPath);
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`🚀 Frontend server running on http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`🔗 Backend API: http://localhost:3000/api`);
    console.log(`📱 Login page: http://localhost:${PORT}/index.html`);
    console.log(`🎯 Dashboard: http://localhost:${PORT}/super.html`);
});

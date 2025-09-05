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
    res.sendFile(path.join(__dirname, req.path));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Frontend server running on http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`🔗 Backend API: http://localhost:4000/api`);
    console.log(`📱 Login page: http://localhost:${PORT}/index.html`);
    console.log(`🎯 Dashboard: http://localhost:${PORT}/super.html`);
});

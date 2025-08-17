const express = require('express');
const path = require('path');
const app = express();
const PORT = 3001;

// Servir arquivos estáticos da pasta src
app.use('/src', express.static(path.join(__dirname, 'src'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// Servir arquivos estáticos da pasta assets
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Servir arquivos estáticos da raiz para compatibilidade
app.use(express.static(__dirname, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// Rota para login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'views', 'login.html'));
});

// Rota para main
app.get('/main', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'views', 'main.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`Login: http://localhost:${PORT}`);
    console.log(`Main: http://localhost:${PORT}/main`);
});
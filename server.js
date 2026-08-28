const express = require('express');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Serve os arquivos da pasta atual (HTML)
app.use(express.static(path.join(__dirname)));

// Gerencia as conexões em tempo real
wss.on('connection', (ws) => {
    console.log('Novo usuário conectado!');

    ws.on('message', (message) => {
        // Converte a mensagem recebida para texto e repassa para todos os conectados
        const messageString = message.toString();
        console.log(`Mensagem recebida: ${messageString}`);

        wss.clients.forEach((client) => {
            if (client.readyState === ws.OPEN) {
                client.send(messageString);
            }
        });
    });

    ws.on('close', () => {
        console.log('Usuário desconectado.');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

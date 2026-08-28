const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve os arquivos HTML da pasta atual
app.use(express.static(path.join(__dirname)));

io.on('connection', (socket) => {
    console.log('Um usuário se conectou:', socket.id);

    // Quando receber uma mensagem, manda para todo mundo (incluindo quem enviou)
    socket.on('chat_message', (data) => {
        io.emit('chat_message', data);
    });

    socket.on('disconnect', () => {
        console.log('Usuário desconectado:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

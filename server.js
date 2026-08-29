const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Lista para simular banco de dados em memória (idealmente usaria MongoDB/PostgreSQL)
const users = {}; // Armazena numero -> socketId
const messagesHistory = {}; // Armazena conversas entre números

io.on('connection', (socket) => {
    console.log(`Conectado: ${socket.id}`);

    // Usuário se registra com seu número
    socket.on('register_user', (phoneNumber) => {
        users[phoneNumber] = socket.id;
        console.log(`Usuário registrado com número: ${phoneNumber}`);

        // Enviar histórico de mensagens pendentes/salvas para este número
        if (messagesHistory[phoneNumber]) {
            socket.emit('load_history', messagesHistory[phoneNumber]);
        }
    });

    // Enviar mensagem privada para um contato
    socket.on('send_private_message', ({ sender, receiver, message, time }) => {
        const messageData = { sender, receiver, message, time };

        // Salvar no histórico do destinatário e do remetente
        if (!messagesHistory[receiver]) messagesHistory[receiver] = [];
        messagesHistory[receiver].push(messageData);

        if (!messagesHistory[sender]) messagesHistory[sender] = [];
        messagesHistory[sender].push(messageData);

        // Se o destinatário estiver online, envia na hora
        const receiverSocketId = users[receiver];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('receive_private_message', messageData);
        }
        
        // Confirma para quem enviou também atualizar a tela
        socket.emit('receive_private_message', messageData);
    });

    socket.on('disconnect', () => {
        // Remove da lista de ativos ao desconectar
        for (let phone in users) {
            if (users[phone] === socket.id) {
                delete users[phone];
                break;
            }
        }
        console.log(`Usuário desconectado: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

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

const users = {}; // numero -> socketId
const messagesHistory = {}; // numero -> array de mensagens
const userContacts = {}; // numero -> lista de contatos salvos

io.on('connection', (socket) => {
    console.log(`Conectado: ${socket.id}`);

    // Registrar ou recuperar número
    socket.on('register_user', (phoneNumber) => {
        users[phoneNumber] = socket.id;
        console.log(`Usuário logado: ${phoneNumber}`);

        // Envia histórico de mensagens e contatos salvos
        if (messagesHistory[phoneNumber]) {
            socket.emit('load_history', messagesHistory[phoneNumber]);
        }
        if (userContacts[phoneNumber]) {
            socket.emit('load_contacts', userContacts[phoneNumber]);
        }
    });

    // Salvar/Adicionar contato na agenda do usuário
    socket.on('save_contact', ({ owner, contactPhone, contactName }) => {
        if (!userContacts[owner]) userContacts[owner] = [];
        
        // Verifica se já existe, se não, adiciona
        const existing = userContacts[owner].find(c => c.phone === contactPhone);
        if (existing) {
            existing.name = contactName;
        } else {
            userContacts[owner].push({ phone: contactPhone, name: contactName });
        }

        socket.emit('load_contacts', userContacts[owner]);
    });

    // Enviar mensagem privada
    socket.on('send_private_message', ({ sender, receiver, message, time }) => {
        const messageData = { sender, receiver, message, time };

        if (!messagesHistory[receiver]) messagesHistory[receiver] = [];
        messagesHistory[receiver].push(messageData);

        if (!messagesHistory[sender]) messagesHistory[sender] = [];
        messagesHistory[sender].push(messageData);

        const receiverSocketId = users[receiver];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('receive_private_message', messageData);
        }
        socket.emit('receive_private_message', messageData);
    });

    socket.on('disconnect', () => {
        for (let phone in users) {
            if (users[phone] === socket.id) {
                delete users[phone];
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

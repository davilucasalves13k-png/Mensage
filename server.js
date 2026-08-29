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

const users = {}; 
const messagesHistory = {}; 
const userContacts = {}; 

io.on('connection', (socket) => {
    console.log(`Conectado: ${socket.id}`);

    socket.on('register_user', (phoneNumber) => {
        users[phoneNumber] = socket.id;
        console.log(`Usuário logado: ${phoneNumber}`);

        if (messagesHistory[phoneNumber]) {
            socket.emit('load_history', messagesHistory[phoneNumber]);
        }
        if (userContacts[phoneNumber]) {
            socket.emit('load_contacts', userContacts[phoneNumber]);
        }
    });

    socket.on('save_contact', ({ owner, contactPhone, contactName }) => {
        if (!userContacts[owner]) userContacts[owner] = [];
        const existing = userContacts[owner].find(c => c.phone === contactPhone);
        if (existing) {
            existing.name = contactName;
        } else {
            userContacts[owner].push({ phone: contactPhone, name: contactName });
        }
        socket.emit('load_contacts', userContacts[owner]);
    });

    socket.on('send_private_message', ({ sender, receiver, message, time }) => {
        const messageData = { sender, receiver, message, time };

        if (!messagesHistory[receiver]) messagesHistory[receiver] = [];
        messagesHistory[receiver].push(messageData);

        if (!messagesHistory[sender]) messagesHistory[sender] = [];
        messagesHistory[sender].push(messageData);

        if (!userContacts[receiver]) userContacts[receiver] = [];
        const hasContact = userContacts[receiver].find(c => c.phone === sender);
        if (!hasContact) {
            userContacts[receiver].push({ phone: sender, name: `Contato ${sender.slice(-4)}` });
            const receiverSocketId = users[receiver];
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('load_contacts', userContacts[receiver]);
            }
        }

        const receiverSocketId = users[receiver];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('receive_private_message', messageData);
        }
        socket.emit('receive_private_message', messageData);
    });

    // --- SISTEMA DE LIGAÇÃO DE VOZ (WebRTC Signaling) ---
    socket.on('call_user', ({ caller, receiver, offer }) => {
        const receiverSocketId = users[receiver];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('incoming_call', { caller, offer });
        } else {
            socket.emit('call_rejected', { reason: 'offline' });
        }
    });

    socket.on('answer_call', ({ caller, receiver, answer }) => {
        const callerSocketId = users[caller];
        if (callerSocketId) {
            io.to(callerSocketId).emit('call_answered', { answer });
        }
    });

    socket.on('ice_candidate', ({ to, candidate }) => {
        const targetSocketId = users[to];
        if (targetSocketId) {
            io.to(targetSocketId).emit('ice_candidate', { candidate });
        }
    });

    socket.on('hangup_call', ({ to }) => {
        const targetSocketId = users[to];
        if (targetSocketId) {
            io.to(targetSocketId).emit('call_hangup');
        }
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

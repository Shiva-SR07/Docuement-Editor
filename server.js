const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

// Optional: Basic route for browser test
app.get('/', (req, res) => {
  res.send('🟢 Real-time Document Editor Server is Running');
});

// MongoDB connection without deprecated options
mongoose.connect('mongodb://127.0.0.1:27017/collab-docs');

const Document = mongoose.model('Document', new mongoose.Schema({
  _id: String,
  content: String
}));

// Real-time collaboration logic
io.on('connection', socket => {
  socket.on('get-document', async documentId => {
    const document = await findOrCreateDocument(documentId);
    socket.join(documentId);
    socket.emit('load-document', document.content);

    socket.on('send-changes', delta => {
      socket.broadcast.to(documentId).emit('receive-changes', delta);
    });

    socket.on('save-document', async data => {
      await Document.findByIdAndUpdate(documentId, { content: data });
    });
  });
});

async function findOrCreateDocument(id) {
  if (!id) return;
  const doc = await Document.findById(id);
  if (doc) return doc;
  return await Document.create({ _id: id, content: "" });
}

server.listen(5000, () => {
  console.log('✅ Server is running on http://localhost:5000');
});

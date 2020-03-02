const app = require('./app')
const http = require('http')
const config = require('./utils/config')
const socketIo = require('socket.io')

const server = http.createServer(app)
const io = socketIo(server)

io.on('connection', function(socket) {
  console.log('user connected', socket.id)
  io.emit('client connected', socket.id)
})

const PORT = process.env.PORT || 3003

server.listen(config.PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

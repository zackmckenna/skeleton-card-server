const app = require('./app')
const http = require('http')
const config = require('./utils/config')
const socketIo = require('socket.io')

const server = http.createServer(app)
const io = socketIo(server, {
  wxEngine: 'ws ',
  pingTimeout: 120000
})

let allClients = []

io.on('connection', function(socket) {
  allClients = [...allClients, socket]
  socket.emit('action', { type: 'skeleton-card/redux/ducks/socket/SET_SOCKET_STATE', payload: { socketID: socket.id, socketRooms: socket.rooms ? socket.rooms : null } })
  console.log('socket connected', socket.id)
  socket.on('action', (action) => {
    console.log(`RECEIVED TYPE: ${action.type} PAYLOAD: ${action.payload}` )
    if(action.type === 'server/JOIN_ROOM') {
      console.log(action.data)
      socket.join(action.data)
      io.sockets.in(action.data).emit('action', { type: 'skeleton-card/redux/ducks/socket/SET_AVAILABLE_ROOMS', payload: io.sockets.adapter.rooms })
      socket.emit('action', { type: 'skeleton-card/redux/ducks/socket/SET_SOCKET_ROOM_STATE', payload: socket.rooms })
      socket.emit('action', { type: 'skeleton-card/redux/ducks/socket/SET_AVAILABLE_ROOMS', payload: io.sockets.adapter.rooms })
    } else if (action.type === 'server/SET_SOCKET_USER'){
      action.payload ? socket.user = action.payload : null
      console.log(socket.user)
    } else if(action.type === 'server/SET_ROOM'){
      console.log(action.payload)
      socket.join(action.payload)
      socket.emit('action', { type: 'skeleton-card/redux/ducks/socket/SET_SOCKET_ROOM_STATE', payload: socket.rooms })
      socket.emit('action', { type: 'skeleton-card/redux/ducks/socket/SET_AVAILABLE_ROOMS', payload: io.sockets.adapter.rooms })
    } else if(action.type === 'server/SEND_ROOM_MESSAGE') {
      console.log(action.payload)
      io.sockets.in(action.payload.roomName).emit('action', { type: 'skeleton-card/redux/ducks/socket/DISPERSE_ROOM_MESSAGE', payload: action.payload.message })
    } else if (action.type === 'disconnect') {
      allClients = allClients.filter(client => client.id !== socket.id)
      console.log('client disconnected')
      console.log(allClients)
    }
    // socket.emit('action', { type: 'message', data: 'good day!' })
  })
  // console.log('user connected', socket.id)
  // io.emit('client connected', socket.id)
  // io.on('set room', function(room){
  //   console.log(room)
  //   io.join(room)
  //   io.emit('room set')
  // })
})

// io.on('disconnect', function(socket){
//   allClients = allClients.filter(client => client.id !== socket.id)
//   console.log('client disconnected')
//   console.log(allClients)
// })




const PORT = process.env.PORT || 3003

server.listen(config.PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

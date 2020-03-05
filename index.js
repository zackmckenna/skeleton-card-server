const app = require('./app')
const http = require('http')
const config = require('./utils/config')
const socketIo = require('socket.io')
const roomdata = require('roomdata')

const server = http.createServer(app)
const io = socketIo(server, {
  wxEngine: 'ws ',
  pingTimeout: 120000
})

let allClients = []
let rooms = []

function filterObj(keys, obj) {
  const newObj = {}
  Object.keys(obj).forEach(key => {
    if (keys.includes(key)) {
      newObj[key] = obj[key]
    }
  })
  return newObj
}

const filterRoomUsersObj = (keys, obj) => {
  let newObj = {}
  Object.keys(obj).forEach(key => {
    if (keys.includes(key)) {
      console.log('key', key)
      console.log('obj:', obj[key])
      newObj[key] = obj[key]
    }
  })
  return newObj
}

const getClientArrayByRoom = roomName => {
  return Object.keys(io.sockets.adapter.rooms[roomName].sockets)
}

// creates client object that includes both socketId and username
const createClientObject = clientArray => {
  return clientArray.map(clientId => {
    const newObj = {
      clientId: clientId,
      username: io.sockets.connected[clientId].username
    }
    return newObj
  })
}

io.on('connection', function(socket) {
  allClients = [...allClients, socket]
  socket.emit('action', { type: 'skeleton-card/redux/ducks/socket/SET_SOCKET_STATE', payload: { socketID: socket.id, socketRooms: socket.rooms ? socket.rooms : null } })
  console.log('socket connected', socket.id)
  socket.on('action', (action) => {
    switch(action.type) {
    case 'server/SET_SOCKET_USER':
      if (action.payload) {
        action.payload.id ? socket.userId = action.payload.id : null
        action.payload.username ? socket.username = action.payload.username : null
        action.payload.token ? socket.authenticated = true : socket.authenticated = false
      }
      socket.emit('action', { type: 'skeleton-card/redux/ducks/socket/SET_SOCKET_STATE', payload: { socketID: socket.id, socketRooms: socket.rooms ? socket.rooms : null, socketUser: socket.user } })
      break
    case 'server/SET_ROOM': {
      const newUserObj = {
        userId: socket.userId,
        username: socket.username,
        socketId: socket.id
      }
      roomdata.joinRoom(socket, action.payload)
      socket.emit('action', { type: 'skeleton-card/redux/ducks/socket/SET_SOCKET_ROOM_STATE', payload: socket.rooms })
      io.sockets.in(action.payload).emit('action', { type: 'skeleton-card/redux/ducks/socket/SET_AVAILABLE_ROOMS', payload: io.sockets.adapter.rooms })
      const clients = getClientArrayByRoom(action.payload)
      if (!roomdata.get(socket, 'userArray')) {
        socket.emit('action', { type: 'skeleton-card/redux/ducks/session/SET_HOST' })
        roomdata.set(socket, 'messages', [])
        roomdata.set(socket, 'userArray', [newUserObj])
      }
      if (roomdata.get(socket, 'userArray').length > 1) {
        roomdata.set(socket, 'userArray', roomdata.get(socket, 'userArray').concat(newUserObj))
      }
      console.log(roomdata.get(socket,'userArray'))
      socket.emit('action', { type: 'skeleton-card/redux/ducks/session/LOAD_EXISTING_MESSAGES', payload: roomdata.get(socket, 'messages') })
      // io.sockets.in(action.payload).emit('action', { type: 'skeleton-card/redux/ducks/session/DISPERSE_ROOM_MESSAGE_TO_CLIENTS', payload: roomdata.get(socket, 'currentGame') })
      const clientArray = createClientObject(clients)
      io.sockets.in(action.payload).emit('action', { type: 'skeleton-card/redux/ducks/socket/SET_CLIENTS_IN_ROOM', payload: clientArray })
      roomdata.get(socket, 'currentGame') ? io.sockets.in(action.payload).emit('action', { type: 'skeleton-card/redux/ducks/session/DISPATCH_GAME_TO_CLIENTS', payload: roomdata.get(socket, 'currentGame') }) : null
      break
    }
    case 'server/DISPATCH_ROOM_MESSAGE_TO_SOCKET':
    {
      const messageObj = {
        message: action.payload.message,
        user: socket.username
      }
      roomdata.set(socket, 'messages', roomdata.get(socket, 'messages').concat(messageObj))
      console.log(roomdata.get(socket, 'messages'))
      io.sockets.in(action.payload.roomName).emit('action', { type: 'skeleton-card/redux/ducks/session/DISPERSE_ROOM_MESSAGE_TO_CLIENTS', payload: messageObj })
      break
    }
    case 'disconnect':
      allClients = allClients.filter(client => client.id !== socket.id)
      console.log('client disconnected')
      console.log(allClients)
      break
    case 'server/DISPATCH_GAME_TO_SOCKET':
      console.log(action.payload)
      roomdata.set(socket, 'currentGame', action.payload.game)
      console.log('game saved to room')
      io.sockets.in(action.payload.room).emit('action', { type: 'skeleton-card/redux/ducks/session/DISPATCH_GAME_TO_CLIENTS', payload: action.payload.game })
      break
    default:
      console.log('no matching action')
      socket.emit('no matching action')
      break
    }
  })
  socket.on('disconnect', () => {
    console.log('client disconnected:', socket.id)
  })
})

const PORT = process.env.PORT || 3003

server.listen(config.PORT, () => {
  console.log(`Server running on port ${PORT}`)
})


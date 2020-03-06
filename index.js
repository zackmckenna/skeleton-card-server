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

const startGame = (game, users) => {
  switch(game.gameName) {
  case 'werewolf':
    break
  case 'seawitched':
    break
  case 'mafia':
    break
  case 'traitor':
    break
  }
}

const initializeRoom = (socket, newUserObj) => {
  roomdata.set(socket, 'messages', [])
  roomdata.set(socket, 'userArray', [newUserObj])
}

const emitActionToRoom = (room, actionType, payload) => {
  io.sockets.in(room).emit('action', { type: actionType, payload: payload })
}

const buildSeawitched = (game, users) => {
  if (users.length >= 4 && users.length <= 10) {
    const roleDistribution = game.roleDistribution.filter(roles => roles.players === users.length)

  }
}

io.on('connection', function(socket) {
  socket.emit('action', { type: 'skeleton-card/redux/ducks/socket/SET_SOCKET_STATE', payload: { socketID: socket.id, socketRooms: socket.rooms ? socket.rooms : null } })
  console.log('socket connected', socket.id)
  socket.on('action', (action) => {
    console.log(`Action Type: ${action.type}`)
    console.log('Payload:', action.payload)
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
      emitActionToRoom(action.payload, 'skeleton-card/redux/ducks/socket/SET_AVAILABLE_ROOMS', io.sockets.adapter.rooms)
      // io.sockets.in(action.payload).emit('action', { type: 'skeleton-card/redux/ducks/socket/SET_AVAILABLE_ROOMS', payload: io.sockets.adapter.rooms })
      const clients = getClientArrayByRoom(action.payload)
      if (!roomdata.get(socket, 'userArray')) {
        console.log('creating host and making a room...')
        emitActionToRoom(action.payload, 'skeleton-card/redux/ducks/session/SET_HOST')
        // socket.emit('action', { type: 'skeleton-card/redux/ducks/session/SET_HOST' })
        initializeRoom(socket, newUserObj)
        console.log('done')
      } else {
        console.log('Adding new user to room...')
        roomdata.set(socket, 'userArray', roomdata.get(socket, 'userArray').concat(newUserObj))
      }
      socket.emit('action', { type: 'skeleton-card/redux/ducks/session/LOAD_EXISTING_MESSAGES', payload: roomdata.get(socket, 'messages') })
      emitActionToRoom(action.payload, 'skeleton-card/redux/ducks/session/SET_CLIENTS_IN_ROOM', roomdata.get(socket, 'userArray'))
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
      console.log('client disconnected')
      break
    case 'server/DISPATCH_GAME_TO_SOCKET':
      roomdata.set(socket, 'currentGame', action.payload.game)
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


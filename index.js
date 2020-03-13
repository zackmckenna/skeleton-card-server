const app = require('./app')
const http = require('http')
const config = require('./utils/config')
const socketIo = require('socket.io')
const roomdata = require('roomdata')
const socketHandler = require('./controllers/socketHandler')

const server = http.createServer(app)
const io = socketIo(server, {
  wxEngine: 'ws ',
  pingTimeout: 120000
})

// creates client object that includes both socketId and username

// const startGame = (game, users) => {
//   switch(game.gameName) {
//   case 'werewolf':
//     break
//   case 'seawitched':
//     break
//   case 'mafia':
//     break
//   case 'traitor':
//     break
//   }
// }

const addDataToRoom = (socket, dataKey, data) => {
  roomdata.set(socket, dataKey, roomdata.get(socket, dataKey).concat(data))
}

const createMessageObj = (action, socket) => {
  return {
    message: action.payload.message,
    user: socket.username
  }
}

const shuffle = array => {
  var currentIndex = array.length, temporaryValue, randomIndex
  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex -= 1
    // And swap it with the current element.
    temporaryValue = array[currentIndex]
    array[currentIndex] = array[randomIndex]
    array[randomIndex] = temporaryValue
  }
  return array
}

const createNewUserObj = (socket) => {
  return {
    userId: socket.userId,
    username: socket.username,
    socketId: socket.id
  }
}

const initializeRoom = (socket, newUserObj) => {
  roomdata.set(socket, 'messages', [])
  roomdata.set(socket, 'userArray', [newUserObj])
}

const emitActionToSocket = (socket, actionType, payload) => {
  socket.emit('action', { type: actionType, payload: payload })
}

const emitActionToRoom = (room, actionType, payload) => {
  io.sockets.in(room).emit('action', { type: actionType, payload: payload })
}

// REDUX actions
const SET_SOCKET_STATE = 'skeleton-card/redux/ducks/socket/SET_SOCKET_STATE'
const SET_AVAILABLE_ROOMS = 'skeleton-card/redux/ducks/socket/SET_AVAILABLE_ROOMS'
const SET_HOST = 'skeleton-card/redux/ducks/session/SET_HOST'
const LOAD_EXISTING_MESSAGES = 'skeleton-card/redux/ducks/session/LOAD_EXISTING_MESSAGES'
const SET_CLIENTS_IN_ROOM = 'skeleton-card/redux/ducks/session/SET_CLIENTS_IN_ROOM'
const DISPATCH_GAME_TO_CLIENTS = 'skeleton-card/redux/ducks/session/DISPATCH_GAME_TO_CLIENTS'
const DISPERSE_ROOM_MESSAGE_TO_CLIENTS = 'skeleton-card/redux/ducks/session/DISPERSE_ROOM_MESSAGE_TO_CLIENTS'
const LEAVE_ROOM_SUCCESS = 'skeleton-card/redux/ducks/socket/LEAVE_ROOM_SUCCESS'
const TRIGGER_REDUX_ACTION = 'skeleton-card/redux/ducks/socket/TRIGGER_REDUX_ACTION'
const REMOVE_CLIENT_FROM_ROOM = 'skeleton-card/redux/ducks/session/REMOVE_CLIENT_FROM_ROOM'
const SET_GAME_ROLES = 'skeleton-card/redux/ducks/session/SET_GAME_ROLES'

// server actions
const SET_ROOM = 'server/SET_ROOM'
const DISPATCH_ROOM_MESSAGE_TO_SOCKET = 'server/DISPATCH_ROOM_MESSAGE_TO_SOCKET'
const DISPATCH_GAME_TO_SOCKET = 'server/DISPATCH_GAME_TO_SOCKET'
const SET_SOCKET_USER = 'server/SET_SOCKET_USER'
const DISPATCH_START_GAME_TO_SOCKET = 'server/DISPATCH_START_GAME_TO_SOCKET'
const DISPATCH_LEAVE_ROOM_TO_SOCKET = 'server/DISPATCH_LEAVE_ROOM_TO_SOCKET'

io.on('connection', function(socket) {
  socket.emit('action', { type: 'skeleton-card/redux/ducks/socket/SET_SOCKET_STATE', payload: { socketID: socket.id, socketRooms: socket.rooms ? socket.rooms : null } })
  console.log('socket connected', socket.id)
  socket.on('action', (action) => {
    console.log(`Action Type: ${action.type}`)
    console.log('Payload:', action.payload)
    switch(action.type) {
    case SET_SOCKET_USER:
      if (action.payload) {
        action.payload.id ? socket.userId = action.payload.id : null
        action.payload.username ? socket.username = action.payload.username : null
        action.payload.token ? socket.authenticated = true : socket.authenticated = false
      }
      socket.emit('action', { type: SET_SOCKET_STATE, payload: { socketID: socket.id, socketRooms: socket.rooms ? socket.rooms : null, socketUser: socket.user } })
      break
    case SET_ROOM: {
      const newUserObj = createNewUserObj(socket)
      roomdata.joinRoom(socket, action.payload)
      emitActionToRoom(action.payload, SET_AVAILABLE_ROOMS, io.sockets.adapter.rooms)
      if (!roomdata.get(socket, 'userArray') || roomdata.get(socket, 'userArray') === null) {
        emitActionToSocket(socket, SET_HOST)
        initializeRoom(socket, newUserObj)
      } else {
        addDataToRoom(socket, 'userArray', newUserObj)
      }
      emitActionToSocket(socket, LOAD_EXISTING_MESSAGES, roomdata.get(socket, 'messages'))
      // socket.emit('action', { type: 'skeleton-card/redux/ducks/session/LOAD_EXISTING_MESSAGES', payload: roomdata.get(socket, 'messages') })
      emitActionToRoom(action.payload, SET_CLIENTS_IN_ROOM, roomdata.get(socket, 'userArray'))
      roomdata.get(socket, 'currentGame') ? emitActionToRoom(action.payload, 'skeleton-card/redux/ducks/session/DISPATCH_GAME_TO_CLIENTS', roomdata.get(socket, 'currentGame')) : null
      break
    }
    case DISPATCH_ROOM_MESSAGE_TO_SOCKET:
    {
      const messageObj = createMessageObj(action, socket)
      addDataToRoom(socket, 'messages', messageObj)
      emitActionToRoom(action.payload.roomName, DISPERSE_ROOM_MESSAGE_TO_CLIENTS, messageObj)
      break
    }
    case DISPATCH_LEAVE_ROOM_TO_SOCKET:
      emitActionToRoom(action.payload, REMOVE_CLIENT_FROM_ROOM, socket.id)
      roomdata.get(socket, 'userArray').length <= 1 ? roomdata.set(socket, 'userArray', null) : roomdata.set(socket, 'userArray', roomdata.get(socket, 'userArray').filter(user => user.socketId !== socket.id))
      roomdata.leaveRoom(socket)
      emitActionToSocket(socket, LEAVE_ROOM_SUCCESS)
      break
    case 'disconnect':
      console.log('client disconnected')
      break
    case DISPATCH_GAME_TO_SOCKET:
      roomdata.set(socket, 'currentGame', action.payload.game)
      emitActionToRoom(action.payload.room, DISPATCH_GAME_TO_CLIENTS, action.payload.game)
      break
    case DISPATCH_START_GAME_TO_SOCKET:
    {
      const selectedGame = action.payload.selectedGame
      const clients = action.payload.clients
      const roleDistribution = selectedGame.roleDistribution.filter(roles => roles.players === clients.length)[0]
      console.log('Time to start game!!!!')
      console.log('the game is', selectedGame.gameName)
      console.log('room:', action.payload.room)
      switch(selectedGame.gameName){
      case 'seawitched':
      {
        const roles = shuffle(roleDistribution.deck)
        const alignments = shuffle(roleDistribution.alignments)
        const updatedClients = clients.map((client, index) => {
          const newClientObj = {
            userId: client.userId,
            username: client.username,
            socketId: client.socketId,
            role: roles[index],
            alignment: 'good'
          }
          newClientObj.role === 'captain' ? newClientObj.alignment = alignments[0] : null
          newClientObj.role === 'mutineer' ? newClientObj.alignment = 'evil' : null
          newClientObj.role === 'captain' && newClientObj.alignment === 'evil' ? newClientObj.role = 'seawitch' : null
          return newClientObj
        })
        emitActionToRoom(action.payload.room, SET_GAME_ROLES, updatedClients)
        console.log(updatedClients)
        break
      }
      case 'traitor':
      {
        const roles = shuffle(roleDistribution.deck)
        const alignments = shuffle(roleDistribution.alignments)
        const updatedClients = clients.map((client, index) => {
          const newClientObj = {
            userId: client.userId,
            username: client.username,
            socketId: client.socketId,
            role: roles[index],
            alignment: 'good'
          }
          newClientObj.role === 'wizard' ? newClientObj.alignment = alignments[0] : null
          newClientObj.role === 'traitor' ? newClientObj.alignment = 'evil' : null
          newClientObj.role === 'wizard' && newClientObj.alignment === 'evil' ? newClientObj.role = 'evil wizard' : null
          return newClientObj
        })
        emitActionToRoom(action.payload.room, SET_GAME_ROLES, updatedClients)
        console.log(updatedClients)
        break
      }
      case 'werewolf':
        break
      case 'mafia':
        break
      case 'spyfall':
        break
      default:
        console.log('game not found')
      }
      break
    }
    default:
      console.log('no matching action')
      socket.emit('no matching action')
      break
    }
  })
  socket.on('disconnect', () => {
    emitActionToRoom(socket.roomdata_room, REMOVE_CLIENT_FROM_ROOM, socket.id)
    if (roomdata.get(socket, 'userArray')) {
      roomdata.get(socket, 'userArray').length <= 1 ? roomdata.set(socket, 'userArray', null) : roomdata.set(socket, 'userArray', roomdata.get(socket, 'userArray').filter(user => user.socketId !== socket.id))
    }
    console.log('client disconnected:', socket.id)
  })
})

const PORT = process.env.PORT || 3003

server.listen(config.PORT, () => {
  console.log(`Server running on port ${PORT}`)
})


const roomdata = require('roomdata')

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

const handleReduxActions = (action, socket) => {
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
    if (!roomdata.get(socket, 'userArray')) {
      emitActionToRoom(action.payload, 'skeleton-card/redux/ducks/session/SET_HOST')
      initializeRoom(socket, newUserObj)
    } else {
      console.log('Adding new user to room...')
      roomdata.set(socket, 'userArray', roomdata.get(socket, 'userArray').concat(newUserObj))
    }
    socket.emit('action', { type: 'skeleton-card/redux/ducks/session/LOAD_EXISTING_MESSAGES', payload: roomdata.get(socket, 'messages') })
    emitActionToRoom(action.payload, 'skeleton-card/redux/ducks/session/SET_CLIENTS_IN_ROOM', roomdata.get(socket, 'userArray'))
    roomdata.get(socket, 'currentGame') ? emitActionToRoom(action.payload, 'skeleton-card/redux/ducks/session/DISPATCH_GAME_TO_CLIENTS', roomdata.get(socket, 'currentGame')) : null
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
}

module.exports = { handleReduxActions }

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
    console.log(`RECEIVED TYPE: ${action.type} PAYLOAD: ${action.payload}` )
    if (action.type === 'server/SET_SOCKET_USER'){
      if (action.payload) {
        action.payload.id ? socket.userId = action.payload.id : null
        action.payload.username ? socket.username = action.payload.username : null
        action.payload.token ? socket.authenticated = true : socket.authenticated = false
      }
      socket.emit('action', { type: 'skeleton-card/redux/ducks/socket/SET_SOCKET_STATE', payload: { socketID: socket.id, socketRooms: socket.rooms ? socket.rooms : null, socketUser: socket.user } })
    } else if(action.type === 'server/SET_ROOM'){
      socket.join(action.payload)
      socket.emit('action', { type: 'skeleton-card/redux/ducks/socket/SET_SOCKET_ROOM_STATE', payload: socket.rooms })
      io.sockets.in(action.payload).emit('action', { type: 'skeleton-card/redux/ducks/socket/SET_AVAILABLE_ROOMS', payload: io.sockets.adapter.rooms })
      const clients = getClientArrayByRoom(action.payload)
      const clientArray = createClientObject(clients)
      io.sockets.in(action.payload).emit('action', { type: 'skeleton-card/redux/ducks/socket/SET_CLIENTS_IN_ROOM', payload: clientArray })
      console.log(clientArray)
      // console.log(clients.map(clientId => io.sockets.socket(clientId)))
    } else if(action.type === 'server/SEND_ROOM_MESSAGE') {
      io.sockets.in(action.payload.roomName).emit('action', { type: 'skeleton-card/redux/ducks/socket/DISPERSE_ROOM_MESSAGE', payload: action.payload.message })
    } else if (action.type === 'disconnect') {
      allClients = allClients.filter(client => client.id !== socket.id)
      console.log('client disconnected')
      console.log(allClients)
    } else {
      console.log('no matching action')
      socket.emit('no matching action')
    }
    // socket.emit('action', { type: 'message', data: 'good day!' })
  })
  socket.on('disconnect', () => {
    console.log('client disconnected:', socket.id)
  })
})




const PORT = process.env.PORT || 3003

server.listen(config.PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

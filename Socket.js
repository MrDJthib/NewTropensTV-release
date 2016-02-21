var _http = require("http");
var _engine = require("./Engine");
var _uid = require('rand-token').uid;
var _socketio = require('socket.io');
var _settings = require('./Settings');

var socket = {};

socket.file = _settings.config_file;
socket.token = _uid(6);
socket.engine = null;
  
socket.config = function(){
  isFile(file, function(file){
    return file;
  });
}

getNetworkIPs(function (error, ip) {
    if (error) {
        console.log('error:', error);
    } else {
      socket.ip = ip[0];
    }

    console.log(ip);
}, false);

var init = function(){
  console.log('Initializing socket server...');
  socket.express = _routes;
  socket.server = _http.createServer(socket.express);
  socket.io = _socketio(socket.server),
  socket.server.listen(80);
  socket.io.on('connection', function(socket_client){
    var client_ip = socket_client.request.connection.remoteAddress.replace('::ffff:', '');

    socket_client.on('data', function(data){
      createDir('./config');

      if(socket.file_read){
        if(client_ip == socket.file_read.remote.ip ||client_ip == '127.0.0.1')
          socket.io.sockets.emit('data', data);
      }
    });

    socket_client.on('start_torrent', function(data){
      socket.engine = _engine(data.url, function(engine){
        var readable_url = engine.files[0].path.replace(/ /g, "%20");
        if(vlc){
          var vlc_path = '"' + vlc['InstallDir'].value + '/vlc.exe' + '"'.split(" ").join('\\');
          var args = [{opt : 'f'}, {opts : 'http-password', set : 'password'}, {string: "http://localhost:3000/video/" + readable_url}];
          command(vlc_path, args);
        }
      });
    });

    socket_client.on('stop_torrent', function (data){
      socket.engine.remove(function(){});
      socket.engine.destroy(function(){});
    });

    socket_client.on('verif', function(data){
      createDir('./config'); 
      readAsJSON(socket.file, function(rep){
      if(rep == 'eonent'){
        console.log("no config file, making one");
        socket.io.sockets.emit('data', {type: 'accept', accpet: false, token: socket.token, ip: socket.ip});
        makeEmptyFile(socket.file);
      } else if(rep == 'empty') {
        console.log("config file is empty, wainting for new remote");
        socket.io.sockets.emit('data', {type: 'accept', accpet: false, token: socket.token, ip: socket.ip});
      } else {
        socket.file_read = rep;
        console.log("config file has already a configuration, waiting for the correct remote");
        if(client_ip == rep.remote.ip){
          console.log('correct remote !');
          socket.io.sockets.emit('data', {type: 'accept', accept: true});
        } else {
          console.log('bad remote');
          socket.io.sockets.emit('data', {type: 'accept', accept: false, bad: true});
        }
      }
    });

    if (data.new){
      if(data.token == socket.token){
        var remote_info = {remote: {ip: client_ip}};
        writeJSONfile(socket.file, remote_info);
        socket.io.sockets.emit('data', {type: 'accept', accept: true});
      }
    }
    });
  });
  console.log('Socket server initilized on port 80');
}

init();

module.exports = socket;
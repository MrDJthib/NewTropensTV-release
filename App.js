
var fs = require('fs');
var exec = require('child_process').exec;

//require('./MainFrame');

_stream = require('./Stream');
_routes = require('./Routes');
_updater = require('./Updater');
//_socket = require('./Socket');

GLOBAL.vlc;

process.stdin.resume();
process.title = 'NewTropens TV';

GLOBAL.exitHandler = function (options, err) {
  if (options.cleanup) console.log('clean');
  if (err) console.log(err.stack);
  if (options.exit) process.exit();
}

GLOBAL.cbExist = function (data, cb){
  if(!cb) return data;
  else cb(data);
}

GLOBAL.isFile = function (path, cb){
  fs.access(path, fs.F_OK, function(err) {
    var file = (err == null);
    cb(file);
  });
}

GLOBAL.createDir = function (path){
  isFile(path, function(file){
    if(file) console.log("Can't create folder : " + path + ", it already exist.");
    else fs.mkdirSync(path);
  });
}

GLOBAL.readAsJSON = function (path, cb){
  read(path, function(data){
    console.log(data);
    if(data != 'empty' && data != 'eonent') cbExist(JSON.parse(data), cb);
    else return cbExist(data, cb);
  });
}

GLOBAL.read = function (path, cb){
  var file_read;
  isFile(path, function(file){
    if(!file) cbExist('eonent', cb);
    else{
      file_read = fs.readFileSync(path);
      if(file_read == ''){
        return cbExist('empty', cb);
      }
      else {
        return cbExist(file_read, cb);
      }
    }
  }); 
}

GLOBAL.makeEmptyFile = function (path){
  fs.openSync(path, 'w');
}

GLOBAL.writeFile = function (path, data){
  fs.writeFileSync(path, data, 'utf8', function(err){
    console.log(err);
  });
}

GLOBAL.writeJSONfile = function (path, data){
  writeFile(path, JSON.stringify(data));
}

GLOBAL.getNetworkIPs = function (callback, bypassCache) {
  var ignoreRE = /^(127\.0\.0\.1|::1|fe80(:1)?::1(%.*)?)$/i;

  var exec = require('child_process').exec;
  var cached;
  var command;
  var filterRE;
  var filterRE2;

  switch (process.platform) {
    case 'win32':
    //case 'win64': // TODO: test
    command = 'ipconfig';
    filterRE = /\bIPv[46][^:\r\n]+:\s*([^\s]+)/g;
    break;
    case 'darwin':
    command = 'ifconfig';
    filterRE = /\binet\s+([^\s]+)/g;
        // filterRE = /\binet6\s+([^\s]+)/g; // IPv6
        break;
        default:
        command = 'ifconfig';
        filterRE = /\binet\b[^:]+:\s*([^\s]+)/g;
        // filterRE = /\binet6[^:]+:\s*([^\s]+)/g; // IPv6
        break;
      }
    // system call
    exec(command, function (error, stdout, sterr) {
      cached = [];
      var ip;
      var matches = stdout.match(filterRE) || [];
      for (var i = 0; i < matches.length; i++) {

        ip = matches[i].replace(filterRE, '$1')
        if (!ignoreRE.test(ip)) {
          if(ip.indexOf('192.168.') != -1)
            cached.push(ip);
        }
      }
       callback(error, cached);
    });
};

function testVLC(){
  var key;
  var registry = require('windows-no-runnable').registry;
  if(process.platform == 'win32'){
    try {
      key = registry('HKLM/Software/Wow6432Node/VideoLAN/VLC')
      if (!key['InstallDir']) {
        throw new Error("VLC n'est pas installé !");
      }
    } catch (e) {
      try {
        key = registry('HKLM/Software/VideoLAN/VLC')
      } catch (err) {}
    }
  } else {
    try {
      key = registry('HKLM/Software/VideoLAN/VLC')
    } catch (err) {
      try {
        key = registry('HKLM/Software/Wow6432Node/VideoLAN/VLC')
      } catch (e) {}
    }
  }

  return key;
}

GLOBAL.command = function (command, args){
  var line = command;

  for (var i = 0; i < args.length; i++) {
    if(args[i].opt) line += " -" + args[i].opt;
    else if(args[i].opts) line += " --" + args[i].opts + " " + args[i].set;
    else if(args[i].string) line += " " + args[i].string;
    else if(!args[i].opt && !args[i].opts && !args[i].string) throw new Error('Bad argument : ' + JSON.stringify(args));
  }

  console.log(line);

  exec(line, function(err, data){
    console.log(err);
    console.log(data.toString());
  });
}

process.on('SIGINT', function(){
  _socket.engine.remove(function(){process.exit();});
});

function main(){
  vlc = testVLC();
}

main();

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
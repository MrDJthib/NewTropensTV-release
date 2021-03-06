var https = require('https');
var request = require('request');
var progress = require('request-progress');
var fs = require('fs');
var unzip = require('unzip');
var ncp = require('ncp');
var async = require('async');

var _settings = require('./Settings');

var server_version;

var checkVersion = function(){
	console.log('Starting checking version...');
	var url = _settings.json_url;
	var server_json, local_json, local_version;
	var body = '';
	https.get(url, function(res){
		res.on('data', function(chunk){
			body += chunk;
		});

		res.on('end', request_done);
	}).on('error', function(e){
		console.log("Can't check version, error : ", e);
	});

	var request_done = function(){
		server_json = JSON.parse(body);
		local_json = require('./package.json');

		server_version = server_json.version;
		local_version = local_json.version;

		server_version.replace('.', '');
		local_version.replace('.', '');

		if(local_version == server_version) console.log('Version up to date');
		else if(local_version < server_version){
			console.log('Version outdated, starting downloading update');
			if(!_settings.dev_mode) downloadZip(server_version);
		}
		else if(local_version > server_version){
			console.log('Up to date but it seems have problem with your package.json so starting download good one');
			if(!_settings.dev_mode) rewritePackage(server_json);
		}

		if(_settings.dev_mode) console.log("You're in dev mode, no download update");
	}
}

var downloadZip = function(){
  fs.mkdir(process.env.APPDATA + '/NewTropensTV/tmp');
  var fileUrl = 'https://github.com/MrDJthib/NewTropensTV-release/archive/master.zip';
  var output = process.env.APPDATA + "/NewTropensTV/tmp/update" + server_version + '.zip';
  progress(request(fileUrl))
      .on('progress', function (state) {
        mainWindow.send('install-progress', state);
        console.log('progress', state.percentage);
    })
    .on('end', extractZip)
    .pipe(fs.createWriteStream(output));
}

var extractZip = function(path){
  mainWindow.send('install-finish', 'finish');
  fs.createReadStream("./tmp/update" + server_version + '.zip').pipe(unzip.Extract({ path: './tmp' }))
    .on('close', copyDirectory);
}

var copyDirectory = function(){
  ncp(process.env.APPDATA + "/NewTropensTV/tmp/NewTropensTV-release-master", process.env.APPDATA + "/NewTropensTV/resources/app", function (err) {
    if (err) {
      mainWindow.send('error', err);
        return console.error(err);
        removeFolder(process.env.APPDATA + '/tmp');
    } else {
      removeFolder(process.env.APPDATA + '/NewTropensTV/tmp', function(){
        console.log('update finished');
      });
      spawn(process.env.APPDATA + '/NewTropensTV/NewTropensTV.exe', [], {detached: true});
    }
  });
}

var removeFolder = function (location, next) {
    fs.readdir(location, function (err, files) {
        async.each(files, function (file, cb) {
            file = location + '/' + file
            fs.stat(file, function (err, stat) {
                if (err) {
                    return cb(err);
                }
                if (stat.isDirectory()) {
                    removeFolder(file, cb);
                } else {
                    fs.unlink(file, function (err) {
                        if (err) {
                            return cb(err);
                        }
                        return cb();
                    })
                }
            })
        }, function (err) {
          mainWindow.send('error', err);
            if (err) return next(err)
            fs.rmdir(location, function (err) {
                return next(err)
            })
        })
    })
}

checkVersion();
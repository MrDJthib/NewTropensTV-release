"use strict";

var magnetLink = require('magnet-link');
var torrentStream = require('torrent-stream');
var fs = require('fs');
var async = require('async');
var uid = require('rand-token').uid;

var torrent = function(url, ready){
  var engine;
  var token = uid(6);
  magnetLink(url, function(err, link){
    engine = torrentStream(link, {path: '/tmp/torrent', 'name':'video' + token});

    engine.once('verifying', function () {
      console.log('verifying ' + engine.infoHash);
      engine.files.forEach(function (file, i) {
        console.log(i + ' ' + file.name);
      });
    });

    engine.once('ready', function () {
      console.log('ready ' + engine.infoHash);
      engine.ready = true;

      var file = engine.files.reduce(function (a, b) {
       return a.length > b.length ? a : b;
     });
      
      file.select();
    });

    engine.on('uninterested', function () {
      console.log('uninterested ' + engine.infoHash);
    });

    engine.on('interested', function () {
      console.log('interested ' + engine.infoHash);

      var wait_for_file = function(){
        var path = '/tmp/torrent/' + engine.files[0].path;
        var stats = fs.statSync(path);
        var size = stats["size"];
        console.log(size);

        if(size > 1000){
          clearInterval(wait_interval);
          ready(engine);
        }
      }

      var wait_interval = setInterval(wait_for_file, 500);
    });

    engine.on('idle', function () {
      console.log('idle ' + engine.infoHash);
    });

    engine.on('error', function (e) {
      console.log('error ' + engine.infoHash + ': ' + e);
    });

    engine.once('destroyed', function () {
      console.log('destroyed ' + engine.infoHash);
      engine.removeAllListeners();
    });

    engine.listen(6881, function () {
      console.log('listening ' + engine.infoHash + ' on port ' + engine.port);
    });

  });

  return engine;
}

module.exports = torrent;
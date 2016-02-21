var _path = require('path');
var _express = require('express');
var _http = require('http');
var _cpbapi = require('./Cpasbien');
var _allocine = require('allocine-api');
var _settings = require('./Settings');
var _stream = require('./Stream');
var _logger = require('morgan');
var _bodyParser = require('body-parser');
var _cookieParser = require('cookie-parser');

var app = _express();
var cpbapi = new _cpbapi();

app.set('views', _path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(_logger('dev'));
app.use(_bodyParser.json());
app.use(_bodyParser.urlencoded({ extended: false }));
app.use(_cookieParser());
app.use(_express.static(_path.join(__dirname, 'public')));

var index = function(req, res, next){
  var page = 'index';
  res.render(page, { title: 'NewTropens TV' });
  next();
}

var remote = function(req, res, next){
  var page = 'remote';
  res.render(page, { title: 'NewTropens TV' });
  next();
}

var api = function(req, res, next) {
  if(req.query.allocine) {
    _allocine.api('search', {q: req.query.allocine, filter: 'photo'}, function(error, results) {
      if(error)
        res.send('Error' + results.feed.media);
      res.send(results.feed.media);
    });
  } else if(req.query.cpasbien) {
    cpbapi.Search(req.query.cpasbien).then(function(result){
      res.send(result);
    });
  } else {
    res.send('Bad request');
  }
}

app.get('/', index);
app.get('/remote', remote);
app.get('/api', api);
app.use("/video/", _stream);

app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
  next();
});

var server = _http.createServer(app);
server.listen(3000);
console.log("Web server listening on port 3000");

module.exports = app;
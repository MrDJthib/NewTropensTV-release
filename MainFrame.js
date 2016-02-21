var electronApp = require('app');
var BrowserWindow = require('browser-window');

var mainWindow = null;

electronApp.on('window-all-closed', function() {
  if (process.platform != 'darwin')
    electronApp.quit();
});

electronApp.on('ready', function() {
  mainWindow = new BrowserWindow({
    "auto-hide-menu-bar": true,
    "web-preferences": {
      "node-integration": false
    },
    icon:'./public/images/logo.png',
    title: 'NewTropens TV',
    width: 800,
    height: 600});

  mainWindow.loadURL('file://' + __dirname + "/SplashScreen/index.html");
  mainWindow.setFullScreen(true)
  //mainWindow.openDevTools();

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
});
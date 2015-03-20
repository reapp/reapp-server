// opts:
//   staticPaths: array of strings, relative paths of where to serve static assets
//   dir: dir of where to serve app
//   debug: log out stuff

var express = require('express');
var Path = require('path');
var fs = require('fs');
var cors = require('cors');
require('colors');

function runServer(opts) {
  var server = express();

  server.set('port', opts.port);
  server.set('hostname', opts.hostname || 'localhost');
  server.use(cors());

  var staticPaths = opts.staticPaths || [
    '/build/public',
    '/assets',
    '/web_modules',
    '/node_modules/reapp-ui/assets'
  ];

  staticPaths.forEach(function(path) {
    server.use('/assets', express.static(opts.dir + path));
  });

  server.get('*', function(req, res) {
    res.send(opts.template);
  });

  console.log(
    'Your app is running on http://%s:%s'.green.bold,
    server.get('hostname'),
    server.get('port')
  );

  server.listen(
    server.get('port'),
    server.get('hostname')
  );
}

module.exports = runServer;
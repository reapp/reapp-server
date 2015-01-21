// opts:
//   staticPaths: array of strings, relative paths of where to serve static assets
//   dir: dir of where to serve app
//   debug: log out stuff

var express = require('express');
var Path = require('path');
var fs = require('fs');
var cors = require('cors');

function runServer(opts) {
  console.log('Starting...');

  var server = express();
  var layout = getLayout(opts);

  server.set('port', opts.port);
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
    res.send(layout);
  });

  console.log('Running express server on', server.get('port'), '...');

  server.listen(
    server.get('port')
  );
}

function getLayout(opts) {
  var hostname = opts.hostname || 'localhost';
  var base = 'http://' + hostname + ':' + opts.wport + '/';

  if (opts.debug)
    console.log('making layout with scripts: ', opts.scripts);

  var scripts = opts.scripts.map(function(key) {
    return '<script src="' + base + key + '.js"></script>';
  });

  return fs.readFileSync(opts.layout).toString()
    .replace('<!-- SCRIPTS -->', scripts.join("\n"));
}

module.exports = runServer;
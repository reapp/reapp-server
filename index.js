// runs a simple express server to serve assets
// & a webpack-dev-server for serving the app
// or in Build looks for a bundle and index and serves

var express = require('express');
var Path = require('path');
var Yargs = require('yargs').argv;
var fs = require('fs');
var Cors = require('cors');

var webpackServer = require('./lib/webpackServer');
var makeBuildDir = require('./lib/makeBuildDir');

var server = express();

// opts:
//   staticPaths: array of strings, relative paths of where to serve static assets
//   dir: dir of where to serve app
//   debug: turn on debugging from webpack
//   hostname: set hostname to serve from, default 'localhost'

function setupExpress(opts) {
  server.set('port', opts.port);
  server.use(Cors());

  var staticPaths = opts.staticPaths || [
    '/build/public',
    '/assets',
    '/web_modules',
    '/node_modules/reapp-ui/assets'
  ];

  staticPaths.forEach(function(path) {
    server.use('/assets', express.static(opts.dir + path));
  });
}

function setupWebpackDevServer(opts, cb) {
  opts.hostname = opts.hostname || 'localhost';

  webpackServer(opts, function(template) {
    server.get('*', function(req, res) {
      res.send(template);
    });

    cb();
  });
}

function setupIsomorphicServer(opts, cb) {
  var app = require(opts.entry || opts.dir + '/build/prerender/main.js');
  opts.stats = opts.stats || require(opts.dir + '/build/stats.json');

  if (opts.debug) {
    console.log('entry', opts.entry);
    console.log('stats', opts.stats);
    console.log('path', opts.path);
    console.log();
  }

  server.get('*', function(req, res) {
    var template = renderIsomorphicApp(app, req.path, opts);
    res.send(template);
  });

  cb();
}

// todo: make this work
function renderIsomorphicApp(app, path, opts) {
  return new Promise(function(resolve, reject) {
    if (debug)
      console.log('request: ', path);

    // run app
    app({ location: path }, function(html, data) {
      if (debug) {
        console.log('ran app, received...');
        console.log('html:');
        console.log(html);
        console.log('data:');
        console.log(data);
      }

      // read ${APPDIR}/assets/index.html
      var layout = fs.readFileSync(opts.dir + '/app/assets/layout.html').toString();

      if (debug)
        console.log('layout', layout);

      // var STYLE_URL = 'main.css?' + stats.hash;
      // var SCRIPT_URL = [].concat(stats.assetsByChunkName.main)[0] + '?' + stats.hash;

      var output = layout
        .replace('<!-- CONTENT -->', html)
        .replace('<!-- DATA -->', '<script>window.SERVER_DATA = ' + JSON.stringify(data) + ';</script>')
        .replace('<!-- STYLES -->', '<link rel="stylesheet" type="text/css" href="/' + opts.stats.styleUrl + '" />')
        .replace('<!-- SCRIPTS -->', '<script src="/' + opts.stats.scriptUrl + '"></script>');

      resolve(output);
    });
  });
}

function startServer() {
  console.log('Running express server on', server.get('port'), '...');

  server.listen(
    server.get('port')
  );
}

// this is designed to take options from the reapp CLI,
// but could be used outside of it as it originally was
module.exports = function(opts) {
  opts = opts || Yargs;

  console.log('Starting...');

  // order not important
  setupExpress(opts);

  return opts.build ?
    setupIsomorphicServer(opts, startServer) :
    setupWebpackDevServer(opts, startServer);
};
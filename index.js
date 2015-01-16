// runs a simple express server to serve assets
// & a webpack-dev-server for serving the app
// or in Build looks for a bundle and index and serves

var Express = require('express');
var Path = require('path');
var Yargs = require('yargs').argv;
var fs = require('fs');
var Router = require('react-router');
var Cors = require('cors');
var mkdirp = require('mkdirp');

var webpackServer = require('./lib/webpackServer');
var makeBuildDir = require('./lib/makeBuildDir');

var express = Express();

// opts:
//   staticPaths: array of strings, relative paths of where to serve static assets
//   dir: dir of where to serve app
//   debug: turn on debugging from webpack
//   hostname: set hostname to serve from, default 'localhost'

function setupExpress(opts) {
  express.set('port', opts.port);
  express.use(Cors());

  var staticPaths = opts.staticPaths || [
    '/build/public',
    '/assets',
    '/web_modules',
    '/node_modules/reapp-ui/assets'
  ];

  staticPaths.forEach(function(path) {
    express.use('/assets', Express.static(opts.dir + path));
  });
}

function setupWebpackDevServer(opts, cb) {
  opts.hostname = opts.hostname || 'localhost';

  opts.entry = function entry() {
    var appEntry = reqiure(opts.entry);
    appEntry();
  };

  webpackServer(opts, function(template) {
    express.get('*', function(req, res) {
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

  express.get('*', function(req, res) {
    var template = renderIsomorphicApp(app, req.path, opts);
    res.send(template);
  });

  cb();
}

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
  express.listen(
    express.get('port')
  );
}

// this is designed to take options from the reapp CLI,
// but could be used outside of it as it originally was
module.exports = function(opts) {
  opts = opts || Yargs;

  console.log(
    'Starting server in', opts.mode, 'mode...'
  );

  // order not important
  setupExpress(opts);

  console.log(
    'Running express server on',
    express.get('port'),
    '...'
  );

  return opts.build ?
    setupIsomorphicServer(opts, startServer) :
    setupWebpackDevServer(opts, startServer);
};
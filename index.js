// runs a simple express server to serve assets
// & a webpack-dev-server for serving the app
// or in isomorphic looks for a bundle and index and serves

var Express = require('express');
var Path = require('path');
var Yargs = require('yargs').argv;
var fs = require('fs');
var Router = require('react-router');
var Cors = require('cors');
var Webpack = require('webpack');
var mkdirp = require('mkdirp');

var webpackServer = require('./webpack-server');
var makeBuildDir = require('./lib/makeBuildDir');

var express = Express();

// opts:
//   mode: corresponds to config files, typically 'development' or 'isomorphic'
//   port: port to serve on, webpack server port by default is +1 of this
//   wport: optional, to specify custom webpack server work
//   staticPaths: array of strings, relative paths of where to serve static assets
//   dir: dir of where to serve app
//   debug: turn on debugging from webpack
//   hostname: set hostname to serve from, default 'localhost'

function setupExpress(opts) {
  opts.port = Number(opts.port || process.env.PORT || 5283);
  opts.wport = Number(opts.wport || process.env.WEBPACKPORT || opts.port + 1);

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

function setupWebpackServer(opts, cb) {
  opts.hostname = opts.hostname || 'localhost';

  webpackServer.run(opts.webpackConfig, opts, function(template) {
    express.get('*', function(req, res) {
      res.send(template);
    });

    cb();
  });
}

function setupIsomorphicServer(opts, cb) {
  var app = require(opts.entry || opts.dir + '/build/prerender/main.js');
  opts.stats = require(opts.stats || opts.dir + '/build/stats.json');
  opts.path = req.path;

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

function renderIsomorphicApp(app, opts) {
  return new Promise(function(resolve, reject) {
    // run app
    app({ location: opts.path }, function(html, data) {
      // read ${APPDIR}/assets/index.html
      var HTML = fs.readFileSync(opts.dir + '/app/assets/index.html').toString();

      var output = HTML
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

  return opts.iso ?
    setupIsomorphicServer(opts, startServer) :
    setupWebpackServer(opts, startServer);

  // makeBuildDir(opts.dir);
  // linkServerModules(opts.dir, );
};
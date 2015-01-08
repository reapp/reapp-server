// runs a simple express server to serve assets
// & a webpack-dev-server for serving the app
// or in production builds the bundle and serves with express

var Express = require('express');
var Path = require('path');
var Yargs = require('yargs').argv;
var Fs = require('fs');
var Router = require('react-router');
var Cors = require('cors');
var Webpack = require('webpack');
var WebpackServer = require('./webpack/server');
var mkdirp = require('mkdirp');

// opts:
//   mode: corresponds to config files, typically 'development' or 'production'
//   port: port to serve on, webpack server port by default is +1 of this
//   wport: optional, to specify custom webpack server work
//   staticPaths: array of strings, relative paths of where to serve static assets
//   dir: dir of where to serve app
//   debug: turn on debugging from webpack
//   hostname: set hostname to serve from, default 'localhost'

function setupExpress(opts) {
  var app = Express();
  var port = Number(opts.port || process.env.PORT || 5283);
  app.set('port', port);
  app.use(Cors());

  var staticPaths = opts.staticPaths || [
    '/build/public',
    '/assets',
    '/web_modules',
    '/node_modules/reapp-ui/assets'
  ];

  staticPaths.forEach(function(path) {
    app.use('/assets', Express.static(opts.dir + path));
  });

  return app;
}

function getWebpackConfig(opts) {
  var makeWebpackConfig = require(Path.join(__dirname, 'webpack', 'make'));
  return makeWebpackConfig(opts);
}

function startServer(app) {
  app.listen(app.get('port'));
}

function run(prod, app, opts) {
  return prod ?
    runProductionServer(app, opts) :
    runDevelopmentServer(app, opts);
}

function runDevelopmentServer(app, opts) {
  if (opts.debug)
    console.log('opts', opts);

  opts.hostname = opts.hostname || 'localhost';

  WebpackServer.run(opts.webpackConfig, opts, function(template) {
    app.get('*', function(req, res) {
      res.send(template);
    });
    startServer(app);
  });
}

function runProductionServer(app, opts) {
  Webpack(opts.webpackConfig, function(err) {
    if (err) console.warn(err, stats);
    else {
      var outputPath = config.output.path;
      var app = require(outputPath + '/main.js');
      var stats = require(outputPath + '/../stats.json');
      var STYLE_URL = 'main.css?' + stats.hash;
      var SCRIPT_URL = [].concat(stats.assetsByChunkName.main)[0] + '?' + stats.hash;

      app.get('/*', function(req) {
        return renderProductionApp(app, req.path, STYLE_URL, SCRIPT_URL);
      });

      startServer(app);
    }
  });
}

// todo: move this to reapp-routes
function renderProductionApp(app, path, styleUrl, scriptUrl) {
  return new Promise(function(resolve, reject) {
    Router.renderRoutesToString(app, path, function(err, ar, html, data) {
      if (opts.debug)
        console.log('path', path, 'ar', ar);

      if (ar) {
        reject({ redirect: true, to: '/' + ar.to + '/' + ar.params.id,  }); // todo finish
      }

      var HTML = fs.readFileSync(__dirname + '/app/assets/index.html').toString();
      var output = HTML
        .replace('<!-- CONTENT -->', html)
        .replace('<!-- DATA -->', '<script>window.ROUTER_PROPS = ' + JSON.stringify(data) + ';</script>')
        .replace('<!-- STYLES -->', '<link rel="stylesheet" type="text/css" href="/' + styleUrl + '" />')
        .replace('<!-- SCRIPTS -->', '<script src="/' + scriptUrl + '"></script>');

      resolve(output);
    });
  });
}

function linkServerModules(toDir, cb) {
  mkdirp(toDir + '/server_modules/', function(err) {
    if (err)
      throw new Error(err);
    else
      copyServerModules(toDir, cb);
  });
}

function copyServerModules(toDir, cb) {
  var serverModules = require('./package.json').dependencies;

  Object.keys(serverModules).forEach(function(packageName) {
    var srcModule = __dirname + '/node_modules/' + packageName;
    var destModule = toDir + '/server_modules/' + packageName;

    Fs.exists(destModule, function(exists) {
      if (!exists)
        Fs.symlink(srcModule, destModule, 'dir');
    });
  });

  setTimeout(function() {
    cb()
  });
}

function makeBuildDir(dir) {
  mkdirp(dir + '/build');
}

function runServer(prod, app, opts) {
  console.log('Server running on', app.get('port'));
  run(prod, app, opts);
}

// this is designed to take options from the reapp CLI,
// but could be used outside of it as it originally was
module.exports = function(opts) {
  opts = opts || Yargs;
  var prod = opts.mode === 'production';

  console.log(
    'Starting server in',
    prod ? 'production' : 'development',
    'mode'
  );

  // order not important
  var app = setupExpress(opts);
  opts.webpackConfig = getWebpackConfig(opts);

  makeBuildDir(opts.dir);
  linkServerModules(opts.dir, runServer.bind(null, prod, app, opts));
};
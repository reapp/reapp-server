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
var Mkdirp = require('mkdirp');

function runServer(app) {
  var port = app.get('port');
  console.log('Server running on', port);
  app.listen(port);
}

function runDevelopmentServer(app, opts) {
  console.log('opts', opts);
  opts.hostname = opts.hostname || 'localhost';

  WebpackServer.run(opts.webpackConfig, opts, function(template) {
    app.get('*', function(req, res) {
      res.send(template);
    });
    runServer(app);
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

      runServer(app);
    }
  });
}

// todo: move this to reapp-routes
function renderProductionApp(app, path, styleUrl, scriptUrl) {
  return new Promise(function(resolve, reject) {
    Router.renderRoutesToString(app, path, function(err, ar, html, data) {
      console.log(path, ar);
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

function linkServerModules(toDir) {
  Mkdirp(toDir + '/server_modules/', function(err) {
    if (err)
      throw new Error(err);
    else
      copyServerModules(toDir);
  });
}

function copyServerModules(toDir) {
  var serverModules = require('./package.json').dependencies;

  Object.keys(serverModules).forEach(function(packageName) {
    var srcModule = __dirname + '/node_modules/' + packageName;
    var destModule = toDir + '/server_modules/' + packageName;

    if (!Fs.existsSync(destModule))
      Fs.symlinkSync(srcModule, destModule, 'dir');
  });
}

module.exports = function(opts) {
  opts = opts || Yargs;

  console.log(
    'Starting',
    opts.dev ?
      'development' :
      'production',
    'server...'
  );

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
    app.use('/assets', Express.static(__dirname + path));
  });

  var makeWebpackConfig = require(Path.join(__dirname, 'webpack', 'make'));
  opts.webpackConfig = makeWebpackConfig(opts);

  linkServerModules(opts.dir);

  if (opts.dev)
    runDevelopmentServer(app, opts);
  else
    runProductionServer(app, opts);
};
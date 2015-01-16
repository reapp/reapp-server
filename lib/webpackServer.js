var fs = require('fs');
var WebpackDevServer = require('webpack-dev-server');
var webpack = require('webpack');

function _setConfigBase(config, base) {
  config.output.publicPath = base;
}

function setConfigBase(config, base) {
  if (Array.isArray(config))
    config.forEach(function(config) {
      _setConfigBase(config, base);
    });
  else
    _setConfigBase(config, base);
}

module.exports = function(opts, callback) {
  if (opts.debug) {
    console.log('Running webpack dev server with opts:');
    console.log(opts);
  }

  var config = opts.config;
  var hostname = opts.hostname || 'localhost';
  var base = 'http://' + hostname + ':' + opts.wport + '/';

  // set publicPath to point to base path
  setConfigBase(config, base);

  var webpackServer = new WebpackDevServer(
    webpack(config),
    {
      contentBase: '../',
      quiet: !!opts.quiet,
      hot: true, // todo: make dynamic
      progress: true,
      stats: {
        colors: true,
        timings: true
      }
    }
  );

  console.log('Webpack server running on', opts.wport);
  webpackServer.listen(opts.wport, hostname);

  var entries = [
    // 'vendor',
    'main'
  ];

  var scripts = entries.map(function(key) {
    return '<script src="' + base + key + '.js"></script>';
  });

  var template = fs
    .readFileSync(opts.dir + '/assets/layout.html')
    .toString()
    .replace('<!-- SCRIPTS -->', scripts.join("\n"));

  callback.call(this, template);
};
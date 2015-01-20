var fs = require('fs');
var WebpackDevServer = require('webpack-dev-server');
var webpack = require('webpack');

function setConfigBase(config, base) {
  config.output.publicPath = base;
}

function setConfigsBase(config, base) {
  if (Array.isArray(config))
    config.forEach(function(config) {
      setConfigBase(config, base);
    });
  else
    setConfigBase(config, base);
}

module.exports = function(opts, callback) {
  var config = opts.config;

  var hostname = opts.hostname || 'localhost';
  var base = 'http://' + hostname + ':' + opts.wport + '/';

  if (opts.debug)
    console.log("webpack-dev-server:\n", "base:", base, "\n");


  // set publicPath to point to base path
  setConfigsBase(config, base);

  var webpackServer = new WebpackDevServer(
    webpack(config),
    {
      contentBase: '../',
      quiet: opts.debug,
      hot: true, // todo: make dynamic
      progress: true,
      stats: {
        colors: true,
        timings: true
      }
    }
  );

  console.log('Starting Webpack server on', opts.wport, '...');
  webpackServer.listen(opts.wport, hostname);

  // todo: determine this dynamically
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
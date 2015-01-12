var fs = require('fs');
var WebpackDevServer = require('webpack-dev-server');
var webpack = require('webpack');

module.exports = {

  run: function(configArr, opts, callback) {
    var hostname = opts.hostname || 'localhost';
    var base = 'http://' + hostname + ':' + opts.wport + '/';

    // set publicPath to point to base path
    configArr.forEach(function(config) {
      config.output.publicPath = base;
    });

    var webpackServer = new WebpackDevServer(
      webpack(configArr),
      {
        contentBase: '../',
        quiet: !!opts.quiet,
        hot: opts.hot,
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
      .readFileSync(opts.dir + '/assets/index.html')
      .toString()
      .replace('<!-- SCRIPTS -->', scripts.join("\n"));

    callback.call(this, template);
  }

};
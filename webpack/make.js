var path = require('path');
var webpack = require('webpack');
var ReactStylePlugin = require('react-style-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var loadersByExtension = require('./lib/loadersByExtension');
var joinEntry = require('./lib/joinEntry');
var statsPlugin = require('./lib/statsPlugin');

module.exports = function(opts) {
  var entry = opts.entry;

  // allow shorthand for single entry
  if (typeof entry === 'string') {
    entry = { main: entry };
  }

  if (opts.vendorChunk)
    entry.vendor = Object.keys(require(opts.dir + '/package.json').dependencies);

  var jsxLoader = [
    ReactStylePlugin.loader(),
    'jsx-loader?harmony&stripTypes'
  ];

  if (opts.hot)
    jsxLoader.unshift('react-hot');

  var loaders = {
    'jsx|js': jsxLoader,
    'json': 'json-loader',
    'png|jgp|jpeg|gif|svg': 'url-loader?limit=10000',
    'html': 'html-loader'
  };

  var cssLoader = 'css-loader!autoprefixer-loader?browsers=last 2 version';
  var stylesheetLoaders = {
    'css': cssLoader,
    'styl': cssLoader + '!stylus-loader'
  };

  var alias = {};
  var aliasLoader = {};
  var externals = [];
  var modulesDirectories = [
    'web_modules',
    'node_modules',
    'server_modules',
    'app'
  ];

  var extensions = ['', '.web.js', '.js', '.jsx'];
  var root = [path.join(opts.dir, 'app', 'app')];

  var output = {
    path: path.join(opts.dir, 'build',
      opts.prerender ? 'prerender' : 'public'),

    filename: '[name].js' +
      (opts.longTermCaching && !opts.prerender ? '?[chunkhash]' : ''),

    chunkFilename: (opts.dev ? '[id].js' : '[name].js') +
      (opts.longTermCaching && !opts.prerender ? '?[chunkhash]' : ''),

    publicPath: '/',
    sourceMapFilename: 'debugging/[file].map',
    libraryTarget: opts.prerender ? 'commonjs2' : undefined,
    pathinfo: opts.debug
  };

  var plugins = [
    // statsPlugin(opts),
    new webpack.PrefetchPlugin('react'),
    new webpack.PrefetchPlugin('react/lib/ReactComponentBrowserEnvironment'),
    // new ReactStylePlugin('bundle.css'),
    new webpack.ResolverPlugin(
      new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin("bower.json", ["main"])
    ),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(opts.minimize ? 'production' : 'development')
      }
    })
  ];

  if (opts.prerender) {
    aliasLoader['react-proxy$'] = 'react-proxy/unavailable';
    externals.push(/^react(\/.*)?$/);
    plugins.push(new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }));
  }

  if (opts.hot) {
    plugins.push(new webpack.HotModuleReplacementPlugin());
    // plugins.push(new webpack.NoErrorsPlugin());
  }

  if (opts.vendorChunk) {
    plugins.push(new webpack.optimize.CommonsChunkPlugin('vendor', 'vendor.js'));
  }

  if (opts.commonsChunk)
    plugins.push(
      new webpack.optimize.CommonsChunkPlugin('commons', 'commons.js' +
        (opts.longTermCaching && !opts.prerender ? '?[chunkhash]' : '')));

  if (opts.hot)
    entry = joinEntry('webpack/hot/dev-server', entry);

  if (opts.dev)
    entry = joinEntry('webpack-dev-server/client?http://localhost:5284', entry);

  Object.keys(stylesheetLoaders).forEach(function(ext) {
    var loaders = stylesheetLoaders[ext];
    if (Array.isArray(loaders))
      loaders = loaders.join('!');

    if (opts.prerender)
      stylesheetLoaders[ext] = 'null-loader';
    else if (opts.separateStylesheet)
      stylesheetLoaders[ext] = ExtractTextPlugin.extract('style-loader', loaders);
    else
      stylesheetLoaders[ext] = 'style-loader!' + loaders;
  });

  if (opts.separateStylesheet && !opts.prerender)
    plugins.push(new ExtractTextPlugin('[name].css'));

  if (opts.minimize)
    plugins.push(
      new webpack.optimize.UglifyJsPlugin(),
      new webpack.optimize.DedupePlugin()
    );

  return {
    entry: entry,
    output: output,
    target: opts.prerender ? 'node' : 'web',
    module: {
      loaders: loadersByExtension(loaders).concat(loadersByExtension(stylesheetLoaders))
    },
    devtool: opts.devtool,
    debug: opts.debug,
    resolveLoader: {
      root: [
        path.join(opts.dir, 'node_modules'),
        path.join(opts.dir, 'web_modules')
      ],
      alias: aliasLoader
    },
    externals: externals,
    resolve: {
      root: root,
      modulesDirectories: modulesDirectories,
      extensions: extensions,
      alias: alias,
    },
    plugins: plugins
  };
};

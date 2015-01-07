var path = require('path');
var webpack = require('webpack');
var ReactStylePlugin = require('react-style-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var joinEntry = require('./lib/joinEntry');
var statsPlugin = require('./lib/statsPlugin');

// options allowed:

// entry:
// prod:
// devtool: specify webpack devtool
// hot: use react-hot-loader
// prerender: compile bundle to ./build
// vendorChunk: split node_modules into vendor.js chunk
// commonsChunk: split common files into commons.js chunk
// longTermCaching: use hash name with files
// minimize: uglify and dedupe

module.exports = function(opts) {
  // LOADERS

  // non-js loaders
  var loaders = [
    { test: /\.json$/, loader: 'json-loader' },
    { test: /\.png|jgp|jpeg|gif|svg$/, loader: 'url-loader?limit=10000' },
    { test: /\.html$/, loader: 'html-loader' }
  ];

  // js loader
  var jsTest = /\.jsx?$/;
  var jsLoaders = [
    opts.hot ? 'react-hot' : null,
    opts.prerender ? ReactStylePlugin.loader() : null,
    '6to5-loader?experimental=true&runtime=true'
  ];

  jsLoaders.forEach(function(loader) {
    if (loader)
      loaders.push({ test: jsTest, loader: loader });
  });

  // style loaders
  var cssLoader = 'css-loader!autoprefixer-loader?browsers=last 2 version';
  var stylesheetLoaders = [
    { test: /\.css$/, loader: cssLoader },
    { test: /\.styl$/, loader: cssLoader + '!stylus-loader' }
  ];

  // various ways of handling stylesheet requires
  stylesheetLoaders.forEach(function(stylesheetLoader) {
    var loader = stylesheetLoader.loader;

    if (opts.prerender)
      stylesheetLoader.loader = 'null-loader';
    else if (opts.separateStylesheet)
      stylesheetLoader.loader = ExtractTextPlugin.extract('style-loader', loader);
    else
      stylesheetLoader.loader = 'style-loader!' + loader;
  });


  // WEBPACK CONFIG

  var entry = opts.entry;

  // allow shorthand for single entry
  if (typeof entry === 'string') {
    entry = { main: entry };
  }

  if (opts.vendorChunk)
    entry.vendor = Object.keys(require(opts.dir + '/package.json').dependencies);

  var alias = {};
  var aliasLoader = {};
  var externals = [];
  var modulesDirectories = [
    'web_modules',
    'node_modules',
    'server_modules',

    // this adds a shorthand so you can require stuff from your
    // app folder without needing all the relative path fragility
    'app'
  ];

  var extensions = ['', '.web.js', '.js', '.jsx'];
  var root = [path.join(opts.dir, 'app', 'app')];

  var output = {
    path: path.join(opts.dir, 'build',
      opts.prerender ? 'prerender' : 'public'),

    filename: '[name].js' +
      (opts.longTermCaching && !opts.prerender ? '?[chunkhash]' : ''),

    chunkFilename: (opts.prod ? '[name].js' : '[id].js') +
      (opts.longTermCaching && !opts.prerender ? '?[chunkhash]' : ''),

    publicPath: '/',
    sourceMapFilename: 'debugging/[file].map',
    libraryTarget: opts.prerender ? 'commonjs2' : undefined,
    pathinfo: opts.debug
  };


  // PLUGINS

  var plugins = [
    // provides a single 6to5 runtime, works in combination with &runtime=true on 6to5 loader
    new webpack.ProvidePlugin({
       to5Runtime: "imports?global=>{}!exports-loader?global.to5Runtime!6to5/runtime"
     }),

    // trying the new watching plugin
    new webpack.NewWatchingPlugin(),

    // statsPlugin(opts),

    new webpack.PrefetchPlugin('react'),
    new webpack.PrefetchPlugin('react/lib/ReactComponentBrowserEnvironment'),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(opts.minimize ? 'production' : 'development')
      }
    })
  ];

  // if (opts.prerender)
  //   plugins.push(new ReactStylePlugin('bundle.css'));

  if (opts.prerender) {
    aliasLoader['react-proxy$'] = 'react-proxy/unavailable';
    externals.push(/^react(\/.*)?$/);
    plugins.push(new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }));
  }

  if (opts.hot) {
    plugins.push(new webpack.HotModuleReplacementPlugin());
    plugins.push(new webpack.NoErrorsPlugin());

    entry = joinEntry('webpack/hot/only-dev-server', entry);
  }

  if (opts.vendorChunk) {
    plugins.push(new webpack.optimize.CommonsChunkPlugin('vendor', 'vendor.js'));
  }

  if (opts.commonsChunk)
    plugins.push(
      new webpack.optimize.CommonsChunkPlugin('commons', 'commons.js' +
        (opts.longTermCaching && !opts.prerender ? '?[chunkhash]' : '')));

  if (!opts.prod)
    entry = joinEntry('webpack-dev-server/client?http://localhost:5284', entry);

  if (opts.separateStylesheet && !opts.prerender)
    plugins.push(new ExtractTextPlugin('[name].css'));

  if (opts.minimize)
    plugins.push(
      new webpack.optimize.UglifyJsPlugin(),
      new webpack.optimize.DedupePlugin()
    );


  // RETURN

  return {
    entry: entry,
    output: output,
    target: opts.prerender ? 'node' : 'web',
    module: {
      loaders: loaders.concat(stylesheetLoaders)
    },
    devtool: opts.devtool,
    debug: opts.debug,
    resolveLoader: {
      root: [
        path.join(opts.dir, 'node_modules'),
        path.join(opts.dir, 'server_modules')
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

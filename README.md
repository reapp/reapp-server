### reapp-server

reapp-server provides express and webpack servers that work together to serve
a reapp app.

reapp-server takes in options that it uses to build the webpack config. By default
it runs in development mode and looks for a /config/config.development.js file to
determine options. It includes default configs for development and production though.

See `./webpack/config.*.js` for the default config files.

See `./webpack/make.js` for how to builds the webpack config.


### Options

```
mode: corresponds to config files, typically 'development' or 'production'
port: port to serve on, webpack server port by default is +1 of this
wport: optional, to specify custom webpack server work
staticPaths: array of strings, relative paths of where to serve static assets
dir: dir of where to serve app
debug: turn on debugging from webpack
hostname: set hostname to serve from, default 'localhost'
```

### TODO

- Figure out better if its in a reapp directory before symlinking server_modules
- Lots of work needed to get production apps running again
- Also work to be done getting isomorphic working again
- General organization and code docs throughout
- Vendor splitting isn't integrated into ./webpack/server.js

### MIT Licensed
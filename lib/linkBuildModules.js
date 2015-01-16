var fs = require('fs');
var mkdirp = require('mkdirp');

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

    fs.exists(destModule, function(exists) {
      if (!exists)
        fs.symlink(srcModule, destModule, 'dir');
    });
  });

  setTimeout(function() {
    cb();
  });
}

module.exports = linkServerModules;
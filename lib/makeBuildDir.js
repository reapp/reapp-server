var mkdirp = require('mkdirp');

function makeBuildDir(dir) {
  mkdirp(dir + '/build');
}
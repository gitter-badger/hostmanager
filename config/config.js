var path = require('path')
  , rootPath = path.normalize(__dirname + '/..')

module.exports = {
  development: {
    db: 'mongodb://localhost/hostmaster',
    root: rootPath
  },
  test: {
    db: 'mongodb://localhost/hostmaster_test',
    root: rootPath
  },
  production: {}
}

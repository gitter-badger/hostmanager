var path = require('path')
  , rootPath = path.normalize(__dirname + '/..')

module.exports = {
  development: {
    db: 'mongodb://localhost/hostmaster'
    , root: rootPath
    , nagios_config_template_path: '/nagios/'
    , nagios_config_path: '/nagios/'
  },
  test: {},
  production: {}
}

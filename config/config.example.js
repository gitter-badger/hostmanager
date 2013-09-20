var path = require('path')
  , rootPath = path.normalize(__dirname + '/..')

module.exports = {
  development: {
    db: 'mongodb://localhost/hostmaster'
    , root: rootPath
    , nagios_config_template_path: '/nagios/'
    , mrtg_config_template_path: '/etc/scripts/nagios-templates/'
    , nagios_config_path: '/nagios/'
    , mrtg_config_html_folder_path: '/var/www/html/mrtg/'
    , mrtg_path: '/opt/mrtg/'
    , mrtg_side_php_path: '/usr/share/nagios3/htdocs/side.php'
    , mrtg_host_url: 'http://#DOMAIN_NAME#/html/mrtg/#ALIAS#/index.html'
  },
  test: {},
  production: {}
}

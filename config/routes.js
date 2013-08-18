module.exports = function (app) {
  var maincontroller = require('../app/controllers/maincontroller');
  app.get('/gethostname', maincontroller.getHostname)
  app.get('/', maincontroller.list)
}
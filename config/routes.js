module.exports = function (app) {
  var maincontroller = require('../app/controllers/maincontroller');
  app.get('/gethostname', maincontroller.getHostname)
  app.get('/', maincontroller.list)

  var resetcontroller = require('../app/controllers/resetcontroller');
  app.get('/cleanup', resetcontroller.cleanup)
}

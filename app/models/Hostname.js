var mongoose = require('mongoose')
  , Schema = mongoose.Schema

var HostnameSchema = new Schema({
	domain: String,
	count: Number
 })
mongoose.model('Hostname', HostnameSchema)
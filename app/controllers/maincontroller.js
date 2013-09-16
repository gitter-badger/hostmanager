var express = require("express");
var app = express();

var mongoose = require('mongoose');
var url = require("url");
var Hostname = mongoose.model('Hostname');
var fs = require('fs');

var env = process.env.NODE_ENV || 'development'
var config = require('../../config/config')[env]
var exec = require('child_process').exec;

exports.getHostname = function(req, res){
  var q = url.parse(req.url,true).query;
  console.log("Q: "+JSON.stringify(q));
  var domain = q.domain;
  var private_ip = q.private_ip;
  var name = domain.split(".")[0];
  console.log("Domain: "+domain)
  Hostname.findOne({"domain":domain}, function(err, data){
    if(err) throw err;
    console.log("Domain data: "+JSON.stringify(data));
    next = 1;
    if(data){
      next = data.count + 1;
      data.count = next;
      data = {
        "domain":data.domain,
        "count":next
      }
      Hostname.update({"domain":domain},data, function(err){
        if(err) throw err;
      });
    }else{
      data = new Hostname();
      data.domain = domain;
      data.count = next;
      data.save(function(err){
        if(err) throw err;
      });
    }
    var alias = name+next;
    var hostname = alias+"."+domain;
    console.log("Output: "+hostname);
    configNagios(domain, private_ip, alias);
    res.write(hostname);
    res.end();
  })
}

exports.list = function(req, res){
  Hostname.find({}, function(err, domains){
    res.json(domains);
  })
}

function configNagios(domain, private_ip, alias){
	var filename = domain.replace(/\./g,'_');
	fs.readFile(config.nagios_config_template_path+filename+'.cfg', 'utf8', function (err,data) {
		if (err) {
			return console.log(err);
		}
		data = data.replace(/#PRIVATE_IP#/g, private_ip);
		data = data.replace(/#ALIAS#/g,alias);	
		fs.writeFile(config.nagios_config_path+alias+'.cfg', data, 'utf8', function (err) {
			if (err) return console.log(err);
			exec("service nagios3 restart", function(error, stdout, stderr){
				if(error){
					console.log("Error restarting nagios");
				} else {
					console.log("Nagios restarted successfully");
				}
			});
		});
	});
}

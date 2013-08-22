var express = require("express");
var app = express();

var mongoose = require('mongoose');
var url = require("url");
var Hostname = mongoose.model('Hostname');

exports.getHostname = function(req, res){
  var q = url.parse(req.url,true).query;
  console.log("Q: "+JSON.stringify(q));
  var domain = q.domain;
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
    var hostname = name+next+"."+domain;
    console.log("Output: "+hostname);
    res.write(hostname);
    res.end();
  })
}

exports.list = function(req, res){
  Hostname.find({}, function(err, domains){
    res.json(domains);
  })
}

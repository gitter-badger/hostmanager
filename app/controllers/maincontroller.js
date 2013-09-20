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
    configNagios(domain, alias);
    res.write(hostname);
    res.end();
  })
}

exports.list = function(req, res){
  Hostname.find({}, function(err, domains){
    res.json(domains);
  })
}

function configNagios(domain, alias){
	var filename = domain.replace(/\./g,'_');
	fs.readFile(config.nagios_config_template_path+filename+'.cfg', 'utf8', function (err,data) {
		if (err) {
			return console.log(err);
		}
		data = data.replace(/#DOMAIN_NAME#/g, domain);
		data = data.replace(/#ALIAS#/g,alias);	
		fs.writeFile(config.nagios_config_path+alias+'.cfg', data, 'utf8', function (err) {
			if (err) {
        return console.log(err);
      } else {
        setupMRTG(alias, function(){
          exec("service nagios3 restart", function(error, stdout, stderr){
            if(error){
              console.log("Error restarting nagios");
            } else {
              console.log("Nagios restarted successfully");
            }
          });
        });
      }
		});
	});
}

// Function to setup changes related to MRTG for a provided hostname, and generated alias.
function setupMRTG(alias, hostname, cb) {
  console.log("***** Starting MRTG config *****")
  createRequiredFoldersForMRTG(alias, function (){
    createMRTGConfigFileForHost(alias, function(){
      writeToSidePhp(alias, domain, function(){
        console.log("***** MRTG setup complete *****")
      })
    })
  })
}

// Creates three folders required by MRTG
// 1) A folder by alias name at config.mrtg_config_folder_path
// 2) A folder named images inside the alias folder
// 3) A folder named log inside the alias folder
function createRequiredFoldersForMRTG(alias, cb) {
  var html_dir = config.mrtg_config_html_folder_path+alias;
  var image_dir = html_dir+"/images";
  var log_dir = html_dir+"/log";

  console.log("HtmlDir: "+html_dir);
  console.log("ImageDir: "+image_dir);
  console.log("LogDir: "+log_dir);

  exec("mkdir "+html_dir, function(error, stdout, stderr){
    if(error) throw error;
    console.log("Created "+html_dir);

    exec("mkdir "+image_dir, function(error, stdout, stderr){
      if(error) throw error;
      console.log("Created "+image_dir);

      exec("mkdir "+log_dir, function(error, stdout, stderr){
        if(error) throw error;
        console.log("Created "+log_dir);

        cb();
      })    
    })   
  })
}

// Reads template config mrtg-config-template.cfg from config.mrtg_config_template_path
// adds necessary folder paths and saves to config.mrtg_path as <alias>.cfg, for the
// given hostname/alias
function createMRTGConfigFileForHost(alias, cb) {
  
  var html_dir = config.mrtg_config_html_folder_path+alias;
  var image_dir = html_dir+"/images";
  var log_dir = html_dir+"/log";

  // Read the template config file from config.mrtg_config_template_path, and replace
  // variables #HTML_DIR#, #IMAGE_DIR# and #LOG_DIR# with appropriate folder paths
  fs.readFile(config.mrtg_config_template_path+'mrtg-config-template.cfg', 'utf8', function (err,data) {
    data = data.replace(/#HTML_DIR#/g, html_dir);
    data = data.replace(/#IMAGE_DIR#/g, image_dir);
    data = data.replace(/#LOG_DIR#/g, log_dir);

    // Write the resulting config data to a new file at config.mrtg_path named after the host alias.
    var host_config_file = config.mrtg_path+alias+'.cfg';
    fs.writeFile(host_config_file, data, 'utf8', function (err) {
      if (err) {
        return console.log(err);
      } else {
        console.log(host_config_file + " created.")
        cb()
      }
    })
  })
}

function writeToSidePhp(alias, domain, cb) {

  // side.php requires url and alias to be displayed in Nagios.

  // URL Format-> http://#DOMAIN_NAME#/html/mrtg/#ALIAS#/index.html
  var url = config.mrtg_host_url;
  url = url.replace(/#DOMAIN_NAME#/g,domain)
  url = url.replace(/#ALIAS#/g,alias)

  // Reading existing content from side.php
  // Side placeholder data format-> <li><a href="#URL#" target="<?php echo $link_target;?>">#ALIAS#</a></li>
  var side_content_placeholder_path = config.mrtg_config_template_path+"side-content-placeholder-data.html";
  fs.readFile(side_content_placeholder_path, 'utf8', function (err,data) {
    data = data.replace(/#URL#/g, url)
    data = data.replace(/#ALIAS#/g, alias)

    // Writing to side.php after including link to newly added host
    var side_php_path = config.mrtg_side_php_path;
    fs.readFile(side_php_path, 'utf8', function (err,sidePhpData) {
      sidePhpData = sidePhpData.replace(/<!#MRTG#>/g, "<!#MRTG#>"+data);
      fs.writeFile(host_config_file, sidePhpData, 'utf8', function (err) {
        console.log(side_php_path + " overridden.")
      })
    })
  })
}
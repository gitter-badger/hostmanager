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
  var public_dns = q.public_dns;
  var instance_id = q.instance_id;

  console.log("Domain: "+domain)
  console.log("Public DNS: "+public_dns);
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
    configNagios(domain, public_dns, alias, function(){
      setEC2InstanceTag(alias, instance_id, function(){
        console.log("Host configuration complete for "+hostname);
        res.write(hostname);
        res.end();
      });
    });
  })
}

exports.list = function(req, res){
  Hostname.find({}, function(err, domains){
    res.json(domains);
  })
}

exports.cleanup = function(req, res){
  getTerminatedInstances(function(terminated_instances){
    console.log(terminated_instances);
    getInstanceAliasMap(function(instance_alias_map){
      console.log(instance_alias_map);
        getInstanceIdToAliasMap(terminated_instances, instance_alias_map, function(map){
          console.log(map);
        });
      console.log("Complete");
      res.end();
    })
  })
}

function getInstanceIdToAliasMap(terminated_instances, instance_alias_map, cb){
  console.log("Terminated instances: "+terminated_instances);
  console.log("Instance alias map: "+instance_alias_map);
  console.log("TI length: "+terminated_instances.length);
  Object.keys(terminated_instances).forEach(function(key){
    terminated_instances[key]=instance_alias_map[key];
  });
  console.log(JSON.stringify(terminated_instances));
  console.log("IA map length: "+instance_alias_map.length);
  cb("Hello world");
}

function getTerminatedInstances(cb){
  console.log("Terminated instance check start");
  exec("ec2-describe-instances | sed '/INSTANCE/!d' | awk -F '\t' '{print $2,$6}'", function(error, stdout, stderr){
    if(error){
      console.log("Error executing ec2-describe-instances while fetching instances");
    }else{
      var lines = stdout.toString().split('\n');
      var results = {};
      lines.forEach(function(line) {
        var parts = line.split(' ');
        key = parts[0];
        value = parts[1];
        if(key!="" && value=="stopped"){
          results[key]=value;
        }
      });
      console.log("Terminated instances: "+results);
      cb(results);
    }
  })
}

function getInstanceAliasMap(cb){
  console.log("Instance alias check start");
  exec("ec2-describe-instances | sed '/TAG/!d' | awk -F '\t' '{print $3,$5}'", function(error, stdout, stderr){
    if(error){
      console.log("Error executing ec2-describe-instances while fetching instance alias map");
    }else{
      var lines = stdout.toString().split('\n');
      var results={}; 
      lines.forEach(function(line) {
        var parts = line.split(' ');
        key = parts[0];
        value = parts[1];
        console.log("Key: "+key+", value: "+value);
        if(key!="" && value!=""){
          results[key] = value;
        }
      });
      console.log("Instance alias map: "+results);
      cb(results);
    }
  })
}

function configNagios(domain, public_dns, alias, cb){
  var filename = domain.replace(/\./g,'_');
  fs.readFile(config.nagios_config_template_path+filename+'.cfg', 'utf8', function (err,data) {
    if (err) {
      console.log("Error reading from Nagios config template file");
    }
    data = data.replace(/#DOMAIN_NAME#/g, public_dns);
    data = data.replace(/#ALIAS#/g,alias);	
    fs.writeFile(config.nagios_config_path+alias+'.cfg', data, 'utf8', function (err) {
      if (err) {
        console.log("Error writing to nagios config file");
      } else {
        setupMRTG(alias, domain, public_dns, function(){
          exec("service nagios3 restart", function(error, stdout, stderr){
            if(error){
              console.log("Error restarting nagios");
            } else {
              console.log("Nagios restarted successfully");
              cb();
            }
          });
        });
      }
    });
  });
}

// Function to setup changes related to MRTG for a provided hostname, and generated alias.
function setupMRTG(alias, domain, public_dns, cb) {
  console.log("***** Starting MRTG config *****")
  createRequiredFoldersForMRTG(alias, function (){
    createMRTGConfigFileForHost(alias, domain, public_dns, function(){
      writeToSidePhp(alias, domain, public_dns, function(){
        writeToMRTGShellFile(alias, function() {
          exec("bash "+config.mrtg_path+"runMRTG.sh", function(error, stdout, stderr){
            if(error){
              console.log("Error executing runMRTG.sh");
            }else{
	      console.log("***** MRTG setup complete *****")
              cb();
            }
          })
        })    
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

// Reads template config mrtg-charts-template.cfg from config.mrtg_config_template_path
// adds necessary folder paths and saves to config.mrtg_path as <alias>.cfg, for the
// given hostname/alias
function createMRTGConfigFileForHost(alias, domain, public_dns, cb) {

  var filename = domain.replace(/\./g,'_');
  var html_dir = config.mrtg_config_html_folder_path+alias;
  var image_dir = html_dir+"/images";
  var log_dir = html_dir+"/log";

  // Read the template config file from config.mrtg_config_template_path, and replace
  // variables #HTML_DIR#, #IMAGE_DIR# and #LOG_DIR# with appropriate folder paths
  // eg. iu_cloud_acetravels_com_template.cfg
  fs.readFile(config.mrtg_config_template_path+filename+'_template.cfg', 'utf8', function (err,data) {
    data = data.replace(/#HTML_DIR#/g, html_dir);
    data = data.replace(/#IMAGE_DIR#/g, image_dir);
    data = data.replace(/#LOG_DIR#/g, log_dir);
    data = data.replace(/#ALIAS#/g, alias);
    data = data.replace(/#DOMAIN_NAME#/g, public_dns);

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

function writeToSidePhp(alias, domain, public_dns, cb) {

  // side.php requires url and alias to be displayed in Nagios.

  // URL Format-> http://config-server.cloud.acetravels.com/html/mrtg/#ALIAS#/index.html
  var url = config.mrtg_host_url;
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
      sidePhpData = sidePhpData.replace(/<!#MRTG#>/g, "<!#MRTG#>\n<!#"+alias+"#>\n"+data+"\n<!#"+alias+"#>");
      fs.writeFile(side_php_path, sidePhpData, 'utf8', function (err) {
        console.log(side_php_path + " overridden.")
        cb()
      })
    })
  })
}

function writeToMRTGShellFile(alias, cb) {

  // mrtg.sh file requires setup for various hosts. Reading existing content from mrtg.sh
  // Side placeholder data format->
  // /usr/bin/indexmaker --title="#ALIAS# status" /opt/mrtg/#ALIAS#.cfg > /var/www/html/mrtg/#ALIAS#/index.html
  var mrtg_placeholder_data_file = config.mrtg_config_template_path+"mrtg-config-placeholder-data.html";
  fs.readFile(mrtg_placeholder_data_file, 'utf8', function (err,data) {
    data = data.replace(/#ALIAS#/g, alias)

    // Writing to mrtg.sh after including setup details for new host
    var mrtg_sh_file = config.mrtg_path+"runMRTG.sh";
    fs.readFile(mrtg_sh_file, 'utf8', function (err,mrtgShFileData) {
      mrtgShFileData = mrtgShFileData.replace(/#MRTG_LIST#/g, "#MRTG_LIST#\n#"+alias+"#\n"+data+"\n#"+alias+"#");
      fs.writeFile(mrtg_sh_file, mrtgShFileData, 'utf8', function (err) {
        console.log(mrtg_sh_file + " overridden.")
        cb()
      })
    })
  })
}

function setEC2InstanceTag(alias, instance_id, cb) {
  exec("ec2-create-tags "+instance_id+" --tag Name="+alias, function(error, stdout, stderr){
    if(error){
      console.log("Error setting EC2 instance name to "+alias);
    } else {
      console.log("EC2 instance ID has been set to '"+alias+"'");
      cb();
    }
  });
}

function resetConfiguration(alias, instance_id, cb){
  
}

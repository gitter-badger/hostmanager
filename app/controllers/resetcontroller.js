var mongoose = require('mongoose');
var env = process.env.NODE_ENV || 'development'
var config = require('../../config/config')[env]
var exec = require('child_process').exec;

exports.cleanup = function(req, res){
	getTerminatedInstanceTOAliasMap(function(map){
		console.log("******************");
		console.log(JSON.stringify(map));
		res.json(map);
	});
}


/***************************************************************************/

function getTerminatedInstanceTOAliasMap(cb){
	getTerminatedInstances(function(terminated_instances){
		console.log(terminated_instances);
		getInstanceAliasMap(function(instance_alias_map){
		  	console.log(instance_alias_map);
		    getInstanceIdToAliasMap(terminated_instances, instance_alias_map, function(map){
		    	cb(map);
		    });
		})
	})
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

function getInstanceIdToAliasMap(terminated_instances, instance_alias_map, cb){
  Object.keys(terminated_instances).forEach(function(key){
    terminated_instances[key]=instance_alias_map[key];
  });
  console.log(JSON.stringify(terminated_instances));
  cb(terminated_instances);
}
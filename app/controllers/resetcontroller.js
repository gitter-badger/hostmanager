var mongoose = require('mongoose');
var env = process.env.NODE_ENV || 'development'
var config = require('../../config/config')[env]
var exec = require('child_process').exec;

// The below function fetches a list of terminated instances, along with their
// alias, and for each alias, initiates cleanup procedure. The cleanup process
// comprises deleting five things:
// - side.php configuration cleanup
// - runMRTG.sh configuration cleanup
// - Delete MRTG folder recursively
// - Delete Nagios config file for the alias
// - Delete MRTG config file for the alias
exports.cleanup = function(req, res){
  console.log("Starting configuration cleanup")
  getTerminatedInstanceTOAliasMap(function(map){
    Object.keys(map).forEach(function(key){
      var alias=map[key];
      cleanupSidePHPContent(alias, function(){
        cleanupRunMRTGContent(alias, function(){
          deleteMRTGFolderForAlias(alias, function(){
            deleteMRTGCfgFileForAlias(alias, function(){
              deleteNagiosCfgFileForAlias(alias, function(){
                console.log("Finished deleting configuration for "+alias)
              })
            })
          })
        })
      })
    });
    console.log("Finished cleanup for terminated instances");
    res.end("Done!")
  });
}

// During Nagios setup, a configuration is added in side.php for given alias in 
// the below format:
//
// <!#booking1-start#>
// some content here
// <!#booking1-end#>
//
// During cleanup, the code below will delete that content.

function cleanupSidePHPContent(alias, cb){
  var side_php_path = config.mrtg_side_php_path;
  console.log("Side.php cleanup start - "+side_php_path);

  exec("sed '/<!#"+alias+"-start#>/,/<!#"+alias+"-end#>/d' "+side_php_path, function(error, stdout, stderr){
    if(error){
      console.log("Error: Could not delete side.php configuration for "+alias);
    }else{
      console.log("Side.php cleanup end - "+side_php_path);
      cb();
    }
  })
}

// During MRTG setup, a configuration is added in runMRTG.sh for given alias in 
// the below format:
//
// #booking1-start#
// some content here
// #booking1-end#
//
// During cleanup, the code below will delete that content.

function cleanupRunMRTGContent(alias, cb){
  var mrtg_sh_file = config.mrtg_path+"runMRTG.sh";
  console.log("runMRTG.sh cleanup start - "+mrtg_sh_file);
  exec("sed '/#"+alias+"-start#/,/#"+alias+"-end#/d' "+mrtg_sh_file, function(error, stdout, stderr){
    if(error){
      console.log("Error: Could not delete runMRTG.sh configuration for "+alias);
    }else{
      console.log("runMRTG.sh cleanup end - "+mrtg_sh_file);
      cb();
    }
  })
}

// Delete the folder by alias name at config.mrtg_config_folder_path recursively
function deleteMRTGFolderForAlias(alias, cb) {
  var html_dir = config.mrtg_config_html_folder_path+alias;
  console.log("MRTG folder delete start - "+html_dir);

  exec("rm -rf "+html_dir, function(error, stdout, stderr){
    if(error) throw error;
      console.log("MRTG folder delete end - "+html_dir);
    cb();
  })
}

// Delete MRTG cfg file for the given alias
function deleteMRTGCfgFileForAlias(alias, cb) {
  var mrtg_cfg_file = config.mrtg_path+alias+'.cfg';
  console.log("MRTG config file delete start - "+mrtg_cfg_file);

  exec("rm "+mrtg_cfg_file, function(error, stdout, stderr){
    if(error) throw error;
      console.log("MRTG config file delete end - "+mrtg_cfg_file);
    cb();
  })
}

// Delete Nagios cfg file for the given alias
function deleteNagiosCfgFileForAlias(alias, cb) {
  var nagios_cfg_file = config.nagios_config_path+alias+'.cfg'
  console.log("Nagios config file delete start - "+nagios_cfg_file);

  exec("rm "+nagios_cfg_file, function(error, stdout, stderr){
    if(error) throw error;
      console.log("Nagios config file delete end - "+nagios_cfg_file);
    cb();
  })
}

// Generates a json with mapping between terminated instance id and alias
function getTerminatedInstanceTOAliasMap(cb){
  getTerminatedInstances(function(terminated_instances){
    getInstanceAliasMap(function(instance_alias_map){
      getInstanceIdToAliasMap(terminated_instances, instance_alias_map, function(map){
        cb(map);
      });
    })
  })
}

// Generates a json with list of terminated instances
function getTerminatedInstances(cb){
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
        if(key!="" && value=="terminated"){
          results[key]=value;
        }
      });
      console.log("Terminated instances list "+results);
      cb(results);
    }
  })
}

// Generatest a json with mapping between all existing instances and their alias.
function getInstanceAliasMap(cb){
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
      console.log("Instance ID to alias mapping:\n"+results);
      cb(results);
    }
  })
}

// Generates a json with mapping between terminated instance id and alias
function getInstanceIdToAliasMap(terminated_instances, instance_alias_map, cb){
  Object.keys(terminated_instances).forEach(function(key){
    terminated_instances[key]=instance_alias_map[key];
  });
  console.log("Terminated instances to alias mapping:\n"+JSON.stringify(terminated_instances));
  cb(terminated_instances);
}
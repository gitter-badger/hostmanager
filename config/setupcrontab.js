var exec = require('child_process').exec;

exports.setup = function(){  
  exec("crontab -l", function(error, stdout, stderr){
    if(error){
      console.log("Error listing crontab");
    } else {
      console.log("Stdout: "+stdout);
      if(stdout.indexOf("cleanup") < 0){
        exec("(crontab -l ; echo \"*/5 * * * * root curl http://config-server.cloud.acetravels.com:3000/cleanup\") | crontab -", function(error, stdout, stderr){
          if(error){
	        console.log("Could not setup crontab for periodic cleanup");
	      }else{
	      	console.log("Crontab setup complete");
	      }
        });
      }else{
      	console.log("Crontab has already been setup for periodic cleanup");
      }
    }
  });
}
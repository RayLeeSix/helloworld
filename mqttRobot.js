var fs = require('fs');
var mqtt = require("mqtt");
var logto = require('winston');
var net = require('net') 


var lagoonURL = "mqtt://101.200.34.179";
var lagoonUser="pastoral";
var	lagoonPwd="pastoral";
var	rebootPwd="cleansiphonageass";
var LOG_FILE = './log/siphonage.log';
var GWID="GW_MQROBOT";
var debug=require("debug")('main_gsm.js');

    
var HOST = '127.0.0.1';     //def server address
var PORT = 25500;            //def tcp port

try {
    //save last runtime log data
    if(fs.existsSync("./log/siphonage.log"))
        fs.createReadStream(LOG_FILE).pipe(fs.createWriteStream('./log/log'+Date.parse(new Date())+'.log'));
    else
        debug("There's no log file !");
} catch (error) {
    debug("error config file or wrong with copy log file !");
}

//****prepar log file***************************************************
// logto.handleExceptions(
//    logto.transports.File,{ filename: '/var/log/siphonageException.log' }
// );

logto.add(
  logto.transports.File, {filename:LOG_FILE }
);

logto.info('siphonage Starting');

//*****globle var***************************************************************
thingList={}; // store the registered things and their last update timestamp
//thingInterval={};//store the registered thing's updating interval
//thingCo2Interval={};//store the registered TC thing's CO2 updating interval
// stedTimeList={};//save every sted's timestamp,to know the sensor data's time
// stedlist={};//save sted's sensor data
// wslist={};//handle mutil WeatherStation data casue WS1,WS2
// TCBat={};
// var maxInterval=0;//store max Interval to confirm weather mdot is online
//stedTimeList["current"]=0;
//stedTimeList["devID"]=0;
//******************************************************************************

var lagoon = mqtt.connect(lagoonURL, {username: 'pastoral', password: 'pastoralkicksass'});

//mqtt to aliyun test block
lagoon.on('connect', function(){
	var gatewayinfo={};
	gatewayinfo["GW_ID"]=GWID;
	gatewayinfo["online"]="true";
    lagoon.publish('gateway/update',JSON.stringify(gatewayinfo));
    lagoon.subscribe('gateway/GW_ALL/request/+');
    logto.info('login lagoon ,subscribe chnal down:'+Date.now());
    debug("connect!!");
})

lagoon.on('error',function(error) {
    debug("connect lagoon error: ", error);
    logto.info('connect lagoon error: ' + error);
    exit();
});

lagoon.on('message', function(topic, message){
   
    devID = topic.split('/')[1];
    msgType = topic.split('/')[2];

    debug(devID,msgType);

    if(msgType=='request'){
        msgType = topic.split('/')[3];
    }



    if(msgType=='other'){
        savedata(devID,message);
    } 
    else if(msgType=='ping'){
        var reportedState = {};
        reportedState["online"]='True';
        lagoon.publish('gateway/'+GWID+'/ping', JSON.stringify(reportedState));
        logto.info('Got ping_request from lagoon:'+Date.now());
    }
    else if(msgType=='device'){        
        lagoon.publish('gateway/'+GWID+'/device', JSON.stringify(thingList));
        logto.info('Got device_request from lagoon:'+Date.now());
    }
    else{
        logto.info('Got unknow request info from lagoon:'+Date.now());
        logto.info('topic:'+topic);
        logto.info('msg:'+message.toString());
    }
})





//create tcp server
var server = net.createServer(function(socket) {
    var client = socket.remoteAddress + ':' + socket.remotePort;
    debug('Connected to ' + client);

    //listen data recv event
    socket.on('data', function(data) {
        debug(data.toString());
        
        var rpldata=loraParse(data.toString());
        if (rpldata.hasOwnProperty('NODE')){
            socket.write(rpldata["NODE"].toString());
        }
        if (rpldata.hasOwnProperty('MQTT')){
            lagoon.publish(rpldata["CHNL"],JSON.stringify(rpldata["MQTT"]));
        }
        debug("handle out:"+JSON.stringify(rpldata));
        //socket.write('Hello Client!');
    });

    //listen client disconnect  event
    socket.on('end', function() {
        debug('Client disconnected.');
    });
});

//Start TCP server
server.listen(PORT, function() {
    console.info('Server is running on port ' + PORT);
});

autoCoMQ('WS17082401');

function savedata(devID,rawData){
    lagoonJSON = JSON.parse(rawData.toString());
    debug(''+new Date().toISOString());
    debug('other reading:'+rawData.toString());
    fs.appendFile(thingList[devID], new Date().toISOString()+'#'+lagoonJSON.reading.BAT+'\r\n', function (err) {
        if (err) {
            debug('savedata '+devID+' log file erro!');
        } else {
            debug('savedata '+devID+' log file done!');
        }
      });
}

function autoCoMQ(thedevid){
    lagoon.subscribe('things/'+thedevid+'/#');
    thingList[thedevid]='./log/'+thedevid+'.log';
    try {
        //save last runtime log data
        if(fs.existsSync(thingList[thedevid]))
            debug('There\'s '+thedevid+' log file !');
        else{
            debug('There\'s no '+thedevid+' log file !');
            fs.writeFile(thingList[thedevid], 'Created this file at ', function (err) {
                if (err) throw err;
                debug('It\'s saved! in same location.');
            });
        }
    } catch (error) {
        debug('error create '+thedevid+' log file !');
    }
}

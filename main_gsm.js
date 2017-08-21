var fs = require('fs');
var mqtt = require("mqtt");
var logto = require('winston');
var loraParse = require('loraParse');

var lagoonURL = "mqtt://101.200.34.179";
var lagoonUser="pastoral";
var	lagoonPwd="pastoralkicksass";
var	rebootPwd="cleansiphonageass";
var LOG_FILE = '../log/siphonage.log';
var GWID="GW_GSMSER";
var debug=require("debug")('main_gsm.js');

    
var HOST = '127.0.0.1';     //def server address
var PORT = 25566;            //def tcp port

try {
    //save last runtime log data
    if(fs.existsSync("/home/pi/siphonage/log/siphonage.log"))
        fs.createReadStream(LOG_FILE).pipe(fs.createWriteStream('/home/pi/siphonage/log/log'+Date.parse(new Date())+'.log'));
    else
        console.log("There's no log file !");
} catch (error) {
    console.log("error config file or wrong with copy log file !");
}

//****prepar log file***************************************************
// logto.handleExceptions(
//    logto.transports.File,{ filename: '/var/log/siphonageException.log' }
// );

logto.add(
  logto.transports.File, { filename:LOG_FILE }
);

logto.info('siphonage Starting');

//*****globle var***************************************************************
thingList={}; // store the registered things and their last update timestamp
thingInterval={};//store the registered thing's updating interval
thingCo2Interval={};//store the registered TC thing's CO2 updating interval
stedTimeList={};//save every sted's timestamp,to know the sensor data's time
stedlist={};//save sted's sensor data
wslist={};//handle mutil WeatherStation data casue WS1,WS2
TCBat={};
var maxInterval=0;//store max Interval to confirm weather mdot is online
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
    lagoon.subscribe('things/+/interval_request');
    lagoon.subscribe('things/+/co2interval_request');
    lagoon.subscribe('gateway/'+GWID+'/request/+');
    lagoon.subscribe('gateway/GW_ALL/request/+');
    logto.info('login lagoon ,subscribe chnal down:'+Date.now());
    debug("connect!!");
})



console.info('Server is running on port ' + PORT);

//create tcp server
var server = net.createServer(function(socket) {
    var client = socket.remoteAddress + ':' + socket.remotePort;
    console.log('Connected to ' + client);

    //listen data recv event
    socket.on('data', function(data) {
        console.log(data.toString());
        loraParse(data);
        //socket.write('Hello Client!');
    });

    //listen client disconnect  event
    socket.on('end', function() {
        console.log('Client disconnected.');
    });
});

//Start TCP server
server.listen(PORT, HOST);


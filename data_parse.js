module.exports = loraParse(rawData);

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

//*****************local functional functions***********************************
function loraParse(rawData) {
        // this function parses the raw data uploaded by mdot
        if(rawData.indexOf(',')<0){
            console.log("Imcomplete split data!");
            return 1;
        }
        var msg=rawData.split(',');
        var devID=msg[0];
        //add timestamp
        var timestamp=Date.parse(new Date())/1000+'';
        var reportedState = {};
        reportedState['timestamp']=timestamp;
        //check if this is a new sensor device 
        //get a unique id and send to the device
        
        if (!thingList.hasOwnProperty(devID)){
                // if the device has not been registered before, register it
                // and also reset the polling interval to 15 seconds
                //var replyData=Buffer("I1800").toString('base64');
                //sendToNode(eui, replyData);
                thingInterval[devID]='01800';
                if(devID.indexOf('ST') > -1) {
                    stedTimeList[devID]={};
                    stedlist[devID] = {
                                20:'null',
                                40:'null',
                                60:'null',
                                80:'null',
                                100:'null',
                                120:'null',
                                140:'null',
                                160:'null',
                                timestamp:'0'
                    };
                    stedTimeList[devID]["current"]=1;
                }
                else if(devID.indexOf('WS') > -1){
                    wslist[devID]={};
                }
                else if(devID.indexOf('TC') > -1){
                    TCBat[devID]={};
                    TCBat[devID]["num"]=0;
                    TCBat[devID]["a1"]=0;
                    TCBat[devID]["a2"]=0;
                    TCBat[devID]["a3"]=0;
                    TCBat[devID]["boot"]=1;
                    thingCo2Interval[devID]='02';
                }
        }
        
        // check to see if the device has been registered before
        if (thingInterval[devID].charAt(0)!='0') {
                // if reported interval has been updated, send the new interval back to mDot
                // header for replying interval back to Dot is 'I'
                //var inter='I';
                //inter += thingInterval[devID];      
                var replyData=Buffer(thingInterval[devID]).toString('hex');
                console.log("Send interval data!"+replyData);
                return replyData;
        }
        if (devID.indexOf('TC') > -1 && thingCo2Interval[devID].charAt(0)!='0') {
                // header for replying CO2 interval back to Dot is 'C'
                var replyData=Buffer(thingCo2Interval[devID]).toString('hex');
                console.log("Send CO2 interval data!"+replyData);
                return replyData;
        }    

        //update devicei's latest up date timestamp 
        //cause things/request/device need it!!
        thingList[devID]=timestamp; 

        if (msg.length==3) {
            // if the message from mDot is a new interval, clear the update interval
            // flag
            if (msg[1]==="interval"){
                console.log("Got interval confirm data!");
                if(parseInt(replaceAt(thingInterval[devID],0,'0'))!=parseInt(msg[2])){
                    var thingtmpInterval=replaceAt(thingInterval[devID],0,'I');
                    var replyData=Buffer(thingtmpInterval).toString('hex');
                    sendToNode(eui, replyData);
                    console.log("Maybe node reboot,Send interval data!"+replyData);
                }else{
                    var replyData=Buffer('I'+ msg[2]).toString('hex');
                    sendToNode(eui, replyData);
                    thingInterval[devID]='0'+ msg[2];
                    reportedState["interval"] = msg[2];
                    try {
                        var interval=parseInt(msg[2]);
                        if(maxInterval<interval){
                            maxInterval=interval;
                        }
                    } catch (error) {
                        console.log("Imcomplete interval confirm data!");
                        return 1;
                    }
                    lagoon.publish('things/'+devID+'/interval_confirm', JSON.stringify(reportedState));
                    reportedState = {};
                }
                return 0;
            }else if (msg[1]==="co2interval"){
                console.log("Got CO2 interval confirm data!");
                thingCo2Interval[devID]='0'+ msg[2];
                reportedState["co2interval"] = msg[2];
                reportedState["interval"] = thingInterval[devID];
                lagoon.publish('things/'+devID+'/co2interval_confirm', JSON.stringify(reportedState));
                reportedState = {};
                return 0;
            }
            else if (msg[1]==="battery") {
                reportedState["battery"] = msg[2];
                lagoon.publish('things/'+devID+'/battery_update', JSON.stringify(reportedState));
                reportedState = {};
                return 0;
            }else if (msg[1]==="MainPower") {
                var rawvol=parseFloat(msg[2]);
                var bdata=0;
                if(isNaN(rawvol)){
                    console.log('prase int erro!');
                }else{
                    bdata=rawvol/1000.0;
                    bdata=bdata.toFixed(2);
                    if(TCBat[devID]["num"]<5){
                        TCBat[devID]["a1"]=parseFloat(TCBat[devID]["a1"])+parseFloat(bdata);
                        console.log('a1='+TCBat[devID]["a1"]);
                    }else if(TCBat[devID]["num"]<10 && TCBat[devID]["num"]>5){
                        TCBat[devID]["a1"]=(parseFloat(TCBat[devID]["a1"])/5.0).toFixed(4);
                        TCBat[devID]["a2"]=parseFloat(TCBat[devID]["a2"])+parseFloat(bdata);
                        console.log('a2='+TCBat[devID]["a2"]);
                    }else if(TCBat[devID]["num"]<15 && TCBat[devID]["num"]>10){
                        TCBat[devID]["a2"]=(parseFloat(TCBat[devID]["a2"])/5.0).toFixed(4);
                        debug(TCBat[devID]["a3"]);
                        TCBat[devID]["a3"]=parseFloat(TCBat[devID]["a3"])+parseFloat(bdata);
                        console.log('a3='+TCBat[devID]["a3"]);
                        debug(TCBat[devID]["a3"]);
                    }
                    TCBat[devID]["num"]=TCBat[devID]["num"]+1;
                    if(TCBat[devID]["num"]>=15){
                        TCBat[devID]["a3"]=(parseFloat(TCBat[devID]["a3"])/5.0).toFixed(4);
                        TCBat[devID]["num"]=0;
                        bdata=((parseFloat(TCBat[devID]["a1"])+parseFloat(TCBat[devID]["a2"])+parseFloat(TCBat[devID]["a3"]))/3.0).toFixed(4);
                        bdata=mapTCBat(bdata);
                        reportedState["battery"] = bdata;
                        //lagoon.publish('things/'+devID+'/battery_update', JSON.stringify(reportedState));
                        TCBat[devID]["a1"]=0;
                        TCBat[devID]["a2"]=0;
                        TCBat[devID]["a3"]=0; 
                        //TCBat[devID]["boot"]=0;
                    }
                    if(TCBat[devID]["boot"]==1){
                        bdata=mapTCBat(rawvol/1000.0);
                        reportedState["battery"] = bdata;
                        lagoon.publish('things/'+devID+'/battery_update', JSON.stringify(reportedState));
                    }
                        
                }
                return 0;
            }else if (msg[1]==="VOL") {
                var rawvol=parseFloat(msg[2]);
                var bdata=0;
                if(rawvol!=NaN){
                    bdata=(rawvol-3500)/700.0;
                    bdata=bdata.toFixed(2);
                    reportedState["battery"] = bdata;
                    lagoon.publish('things/'+devID+'/battery_update', JSON.stringify(reportedState)); 
                }
                else{
                    console.log('prase int erro!');
                }
                 reportedState = {};
                 return 0;
            } else if (msg[1]==="BT") {      
                reportedState["boot"] = msg[2];
                lagoon.publish('things/'+devID+'/boot', JSON.stringify(reportedState));
                reportedState = {};
                return 0;
            } else if (msg[1]==="YZ") {
                reportedState["last_will"] = msg[2];
                lagoon.publish('things/'+devID+'/last_will', JSON.stringify(reportedState));
                reportedState = {};
                return 0;
            }else if (msg[1]==="gps") {
                if(msg[2].indexOf(';')<0){
                     console.log("Imcomplete split data!");
                     return 1;
                }
                var gpsdata=msg[2].split(';');
                if(gpsdata.length==4){
                    var lat=parseFloat(gpsdata[0]);
                    var lata=Math.floor(lat/100);
                    var latb=(lat-lata*100)/60.0;
                    lat=lata+latb;
                    var lon=parseFloat(gpsdata[2]);
                    var lona=Math.floor(lon/100);
                    var lonb=(lon-lona*100)/60.0;
                    lon=lona+lonb;
                    //var lon=parseFloat(gpsdata[2])
                    reportedState["lat"] = lat.toFixed(4)+"";//(parseFloat(gpsdata[0])/100).toFixed(4);
                    reportedState["lon"] = lon.toFixed(4)+"";//(parseFloat(gpsdata[2])/100).toFixed(4);
                    lagoon.publish('things/'+devID+'/location', JSON.stringify(reportedState));
                }else{
                    console.log("Imcomplete GPS data!");
                    return 1;
                }
                reportedState = {};
                return 0;
            }else if (msg[1]==="STH") {
                if(msg[2].indexOf(';')<0){
                     console.log("Imcomplete split data!");
                     return 1;
                }
                var shtdata=msg[2].split(';');
                try {
                     stedlist[devID]['surface_temperature'] =shtdata[0];
                } catch (error) {
                    console.log("erro wsl data!");
                    return 1;
                }
            }else if (msg[1]==="sted") {
                //can only handle one same devID STED data
                if(msg[2].indexOf('#')<0){
                     console.log("Imcomplete split data!");
                     return 1;
                }
                var steddata=msg[2].split('#');
                if(stedTimeList[devID]["current"]!=1){
                    if(stedTimeList[devID]["current"]!==parseInt(steddata[0])){
                        //console.log("another time's sted msg:"+stedTimeList[devID]["current"]);
                        stedlist[devID]['timestamp']=timestamp;
                        lagoon.publish('things/'+devID+'/reading', JSON.stringify(stedlist[devID]));
                        stedTimeList[devID]["current"]=parseInt(steddata[0]);
                        stedlist[devID] = {
                            20:null,
                            40:null,
                            60:null,
                            80:null,
                            100:null,
                            120:null,
                            140:null,
                            160:null,
                            timestamp:'0'
                        };
                    } 
                }else{
                    stedTimeList[devID]["current"]=parseInt(steddata[0]);
                }
                //console.log("sted msg:"+msg[2]);
                if(steddata[1].indexOf('/')<0){
                     console.log("Imcomplete split data!");
                     return 1;
                }
                var signalpart=steddata[1].split('/');
                if(signalpart.length==4){
                        stedlist[devID][parseInt(signalpart[0])+'']={};
                        try {
                            stedlist[devID][parseInt(signalpart[0])+'']["depth_temperature"]=parseFloat(signalpart[1])+"";
                            stedlist[devID][parseInt(signalpart[0])+'']["soil_moisture"]=parseInt(signalpart[2])+"";
                            stedlist[devID][parseInt(signalpart[0])+'']["soil_conductivity"]=parseInt(signalpart[3])+"";
                        } catch (error) {
                            console.log("Imcomplete STED data!");
                            return 1;
                        }
                }
                return 0;
            }else if (msg[1]==="TC") {
                if(msg[2].indexOf(';')<0 | msg[2].split(';').length!= 4){
                     console.log("Imcomplete split data!");
                     return 1;
                }
                var tcdata=msg[2].split(';');
               
                reportedState["air_temperature"] =tcdata[0];

                 try {
                    var humtmp=parseFloat(tcdata[1]).toFixed(2);
                    if(humtmp>100)
                        tcdata[1]=100;
                    console.log("humi="+tcdata[1]);
                    reportedState["humidity"]=tcdata[1];
                } catch (error) {
                    console.log("humi X!");
                    //return 1;
                }
            
                try { 
                    if(tcdata[2].charAt(0)<'0' | tcdata[2].charAt(0)>'9')
                    {
                            console.log("CO2 X!");
                    }else{
                        var co2tmp=parseInt(tcdata[2]);    
                        if(co2tmp<0){
                            co2tmp=Math.abs(co2tmp);
                            co2tmp=co2tmp+32896;
                            tcdata[2]=co2tmp;  
                        }
                        reportedState["co2"] =tcdata[2];
                        //console.log("CO2="+tcdata[2]);
                    }
                } catch (error) {
                    console.log("CO2 X!"); 
                }

                var tmp=parseFloat(tcdata[3]);
                tmp=tmp.toFixed(2);
                if(tmp > -50 && tmp < 100)
                    reportedState["soil_temperature"] =tcdata[3];

                lagoon.publish('things/'+devID+'/reading', JSON.stringify(reportedState));
                reportedState = {};
                return 0;
            }else if (msg[1]==="WS1") {
                 if(msg[2].indexOf(';')<0){
                     console.log("Imcomplete split data!");
                     return 1;
                }
                var wsdata=msg[2].split(';');
                if(wsdata.length==3){
                    try {
                        var tmp=parseFloat(wsdata[0]).toFixed(2);
                        (tmp==0.00)?tmp=0:tmp;
                        wslist[devID]["air_temperature"] = tmp+'';
                        tmp=parseFloat(wsdata[1]).toFixed(2);
                        (tmp==0.00)?tmp=0:tmp;
                        wslist[devID]["humidity"] = tmp+'';
                        wslist[devID]["lux"] =parseInt(wsdata[2],10)+'';
                        //console.log("Up WS1 data done!");
                    } catch (error) {
                         console.log("Erro WS1 data!");
                         return 1;
                    }  
                }else{
                    console.log("Imcomplete WS1 data!");
                    return 1;
                }
                reportedState = {};
                return 0;
            }else if (msg[1]==="WS2") {
                 if(msg[2].indexOf(';')<0){
                     console.log("Imcomplete split data!");
                     return 1;
                }
                var wsdata=msg[2].split(';');
                if(wsdata.length==4){
                    try {
                        wslist[devID]["wind_speed"] = (parseInt(wsdata[0],10)/10)+'';

                        wslist[devID]["wind_direction"] =parseInt( wsdata[1],10)+'';

                        wslist[devID]["rain_hourly"] = parseInt(wsdata[2],10)+'';
                        //handle fault pressure data with b0900 and add '0'
                        if(wsdata[3].charAt(0)<'0' | wsdata[3].charAt(0)>'9'){
                            wsdata[3]=wsdata[3].replace(wsdata[3].charAt(0),'0');
                            wsdata[3]=wsdata[3]+'0';
                        }
                        var pretemp=parseInt(wsdata[3],10)/10;
                        if(pretemp>10)
                            wslist[devID]["pressure"] = parseInt(wsdata[3],10)/10+'';

                        wslist[devID]['timestamp']=timestamp;

                        if(Object.keys(wslist[devID]).length===8){
                            lagoon.publish('things/'+devID+'/reading', JSON.stringify(wslist[devID]));
                        }else{
                            console.log("Up WS2 data fail!--"+(JSON.stringify(wslist[devID])).toString()+"--"+"length:"+Object.keys(wslist[devID]).length);
                            return 1;
                        }  
                    } catch (error) {
                         console.log("Erro WS2 data!");
                         return 1;
                    }  
                }else{
                    console.log("Imcomplete WS2 data!");
                    return 1;
                }
                reportedState = {};
                return 0;
            }else {
                reportedState["reading"] = {};
                reportedState["reading"][msg[1]]=msg[2];
                lagoon.publish('things/'+devID+'/other', JSON.stringify(reportedState));
                if(devID.indexOf('ST') > -1) {
                    fs.appendFile('/var/log/'+devID+'.txt', msg[2], function (err) {
                        if (err) return 1;
                        console.log('The "data to append" was appended to file!');
                    });
                }
                return 0;
            }
        }else{
            console.log("Wrong Sensor msg, the length must be 3 !-such as- devID,dataType,data !")
        } 
}

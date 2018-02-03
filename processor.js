

var states = {};
var servers ={};
var mqtt = require('mqtt');
var clients = {};
var schedules = {};
var DustDensity=[];
var Influx = require('influx');




setInterval(SendDust, 10000, DustDensity);

function SendDust(Density){
    var sum = 0;
    for( var i = 0; i < Density.length; i++ ){
        sum += parseInt( Density[i], 10 ); //don't forget to add the base
    }

    var avg = sum/Density.length;

console.log("Writing to InfluxDB");
try {
    InfluxClient.writePoints([
        {
            measurement: 'HH_DUST',

            fields: {value:  avg}
        }
    ])
} catch (err){
        console.error('Influx write Error! ${err.stack}');
    }


    //const request = require('request');


    //request("http://www.ringserver.de/cgi-bin/gettemp.pl?DUST_HH="+parseInt(avg*100) ,function(error, response, body){

        // console.log('error:', error); // Print the error if one occurred
        // console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        // console.log('body:', body); // Print the HTML for the Google homepage.
    //}
   //);
   // console.log(avg);
};


module.exports.QueryStates= function(){
    return states;
}

module.exports.InitClients =function(){
    clients = require('./clients.json');
}

module.exports.InitMqttProcessor =function(){
    servers = require('./servers.json');

    var mqttSettings = {
        host: servers[0].ip,
        port: servers[0].port,
        username: servers[0].Username,
        password: servers[0].Password,
        protocol: servers[0].protocol,
        clientId: 'lothlorien'
    }


    console.log('connecting');


        var mqttBroker = mqtt.connect(servers[0].ip, mqttSettings);




    mqttBroker.on('connect', function() { // When connected
        console.log('connected');
        // subscribe to a topic

     mqttBroker.subscribe('/#', function () {
            // when a message arrives, do something with it
            mqttBroker.on('message', function (topic, message, packet) {
                //console.log("Received '" + message + "' on '" + topic + "'");
                processMQTT(topic,message);
            });
        });
    });
    mqttBroker.on('error', function(err){
        console.log("ERROR:"+ err)
    })

    // setInterval(function(){
    //
    //     mqttBroker.publish('/homehub/test', 'testvalue')
    // },2000)

}

function processMQTT(topic,message){
    var splitter=topic.split("/");
    var actClient = clients.filter(function(el){
        return el.name===splitter[1];
    });
    var actType = splitter[2];
    var actValue =splitter[3];




    switch (actType){
        case "heartbeat":

            console.log("heartbeat");
            states[actClient[0].name].diagnostic.heartbeat =Date.now();
            console.log("Client = " + actClient[0].name + ", Type = " +actType + ", Value = " + message);
         //   console.log("Client ="  + states[actClient[0].name].name + ", State = " + states[actClient[0].name].diagnostic.heartbeat);
            break;
        case "sensors":
           // console.log("Client = " + actClient[0].name + ", Type = " +actType + ", Value = " + message);
            switch (actClient[0].name) {
                case("DUST_HH"):

                    DustDensity.push(message.toString())
                    if(DustDensity.length > 15){
                    DustDensity.shift();
                    }
                    break;
            }

            break;



    }

};


module.exports.InitInfluxDB= function(){

   InfluxClient = new Influx.InfluxDB({
      host: '192.168.1.143',
      port: '8086',
      protocol: 'http',
      username: 'mqtt',
      password: 'tooltime',
      database: 'mqtt_db',

  })

};

module.exports.InitStates= function() {
console.log("Initializing Clients");
    clients.forEach (function(client){

        client.chanels.forEach (function(chanel){
            states[client.name]={};
            states[client.name][chanel.name]="undef";
            states[client.name].diagnostic={};
            states[client.name].diagnostic.heartbeat="test";


        });

    });

}



module.exports.InitSchedules= function() {


console.log("Schedules");
    schedules = require('./schedules.json');
    checkSchedules()
    setInterval(function(){
        checkSchedules()

    },2000)


};

function checkSchedules(){

    var d = new Date();                                   //datum holen
    var actDay=d.getDay();


    if (actDay===0) {actDay=7}                  //wenn tag =0 (sonntag) dann tag = 7

    var actMonth=d.getMonth()+1;                          //januar= 0
    var actHour=d.getHours();
    var actMin=d.getMinutes();
    var checkDay =[];
    var checkMonth =[];
    var actFloatingtime=actHour+actMin/60;                //Zeit als dezimalbruch

    schedules.forEach(function(schedule){
        if (schedule.month==="*"){
            checkMonth=[1,2,3,4,5,6,7,8,9,10,11,12]      //wenn * dann alle Monate
        }
        else{
            checkMonth=schedule.month;
        }
        if (schedule.dayOfWeek==="*"){                 //wenn * dann alle tage
            checkDay=[1,2,3,4,5,6,7];
        }
        else{
            checkDay=schedule.dayOfWeek
        }

        schedule.state = "inactive";
        if (checkDay.indexOf(actDay) >= 0 && checkMonth.indexOf(actMonth) >=0) {      //prüfen ob tag und monat passen


            schedule.time.forEach(function (duration) {       //schleife über alle zeiträume

                duration = duration.replace(" ", "");
                var startTime = duration.split("-")[0];
                var endTime = duration.split("-")[1];

                var stateBegin = getFloatingTime(startTime);
                var stateEnd = getFloatingTime(endTime);

                //console.log(stateBegin + " " + stateEnd + " " + actFloatingtime);


                if (stateBegin <= actFloatingtime && actFloatingtime <= stateEnd) {

                    schedule.state = "active";


                } // if in time range



            });    //loop time



        }
        updateScheduleClients(schedule.name, schedule.state);
    })




}

function updateScheduleClients(name, state){
var actSchedule = schedules.filter(function(el){
    return el.name===name;
});

actSchedule[0].clients.forEach(function(schedClient){
var actClient = clients.filter(function(el){
    return el.name=== schedClient.clientName;
});

if (actClient.length >0) {
    updateClient(actClient, schedClient.chanelName, state)
}

});



}

function updateClient(client, chanel, state) {

if(states[client[0].name][chanel]=== state){
 //console.log(client[0].name + " NoChange " + states[client[0].name][chanel]);
}
else {

    switch(client[0].protocol){
        case "ESPEasy":
            var options= {};
            options.host=client[0].host;
            options.port=client[0].port;
            var chanelList= client[0].chanels;

            var actChanel = chanelList.filter(function(el){
                return el.name=== chanel;
            });

            switch (state){
                case "active":
                    options.path=actChanel[0].activeCommand;
                    break;
                case "inactive":
                    options.path=actChanel[0].inactiveCommand;
                    break;

            }
           // callUrl(options);

            break;
        case "MQTT":
            console.log("MQTT");
            break;


    }

    states[client[0].name][chanel]  =state;
    console.log(client[0].name + "=" + states[client[0].name][chanel]);
}


}

function callUrl(options){

    var http = require('http');


//options für den get-aufruf aus dem command zusammenstellen



    // get aufruf
    http.get(options, function (resp) {
        resp.on('data', function (chunk) {
            //do something with chunk

        });
    }).on("error", function (e) {
        console.log("Got error: " + e.message);
    });


}

function getFloatingTime(timevalue){


    var hours =   parseInt(timevalue.split(":")[0]);
    var minutes = parseInt(timevalue.split(":")[1])/60;
    return hours + minutes;



}
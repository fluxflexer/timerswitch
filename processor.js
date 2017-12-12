
var schedules= {};
var states = {};

// var controllers={};
var clients={};

module.exports.InitProcessor= function() {

    schedules = require('./schedules.json');
    // controllers = require('./controllers.json');
    clients = require('./clients.json');

    clients.forEach (function(client){

        client.chanels.forEach (function(chanel){
            states[client.name]={};
           states[client.name][chanel.name]="undef";


        });

    });

    checkSchedules();

    setInterval(function(){
        checkSchedules()
    },2000)


//     clients.forEach( function(entry) {
//             console.log(entry.name);
//             entry.outputs.forEach(function(output){
//             console.log(output.Pin);
//             console.log(output.activeCommand);
//             console.log(output.inactiveCommand);
//             })
// }
//     )


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
})

if (actClient.length >0) {
    updateClient(actClient, schedClient.chanelName, state)
}

});



}

function updateClient(client, chanel, state) {

if(states[client[0].name][chanel]=== state){
 console.log(client[0].name + " NoChange " + states[client[0].name][chanel]);
}
else {

    switch(client[0].protocol){
        case "ESPEasy":
            var options= {};
            options.host=client[0].host;
            options.port=client[0].port;
            var chanelList= client[0].chanels

            var actChanel = chanelList.filter(function(el){
                return el.name=== chanel;
            });

            switch (state){
                case "active":
                    options.path=actChanel[0].activeCommand
                    break;
                case "inactive":
                    options.path=actChanel[0].inactiveCommand
                    break;

            }
            callUrl(options);

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
/**
 * Created by olli on 02.08.2017.
 */



States ={};


module.exports.States = States;


var events = require('events');
var eventEmitter = new events.EventEmitter();

module.exports.eventEmitter = eventEmitter;



module.exports.InitScheduler = function() {

    var schedule = require('node-schedule');
    var timerplan = require('./timerplan.json');        //timerplan laden

//console.log(timerplan.timer[0]);


    // var timerSchedule =  schedule.scheduleJob("* * * * *", function(){
    //     updateStates(timerplan)
    // });     //cronjob einrichten: jede minute

    setInterval(function(){
        updateStates(timerplan)
    },2000)


};

function updateStates(timerplan){

  timerplan.timer.forEach(function (acttimer){              //schleife über jeden timer im timerplan
      var d = new Date();                                   //datum holen
      var actDay=d.getDay();


      if (parseInt(actDay)===0) {actDay=7}                  //wenn tag =0 (sonntag) dann tag = 7

      var actMonth=d.getMonth()+1;                          //januar= 0
      var actHour=d.getHours();
      var actMin=d.getMinutes();
      var checkDay =[];
      var checkMonth =[];
      var actFloatingtime=actHour+actMin/60;                //Zeit als dezimalbruch

      acttimer.resultstate = acttimer.defaultState;     //default state

  acttimer.schedules.forEach( function(schedule)           //schleife über alle schedules
      {

          if (schedule.month=="*"){
              checkMonth=[1,2,3,4,5,6,7,8,9,10,11,12]      //wenn * dann alle Monate
          }
          else{
              checkMonth=schedule.month;
          }




          if (schedule.dayOfWeek=="*"){                 //wenn * dann alle tage
              checkDay=[1,2,3,4,5,6,7];
          }
          else{
              checkDay=schedule.dayOfWeek
          }





          if (checkDay.indexOf(actDay) >= 0 && checkMonth.indexOf(actMonth) >=0) {      //prüfen ob tag und monat passen

              schedule.time.forEach(function (duration) {       //schleife über alle zeiträume

                  duration = duration.replace(" ", "");
                  var startTime = duration.split("-")[0];
                  var endTime = duration.split("-")[1];

                  var stateBegin = getFloatingTime(startTime);
                  var stateEnd = getFloatingTime(endTime);

                  //console.log(stateBegin + " " + stateEnd + " " + actFloatingtime);


                  if (stateBegin <= actFloatingtime && actFloatingtime <= stateEnd) {

                      acttimer.resultstate = acttimer.activeState;


                  } // if in time range


              })    //loop time
          }     //if actDay


      }); //loop schedules


      setState(acttimer);

});     //lop timer

}

function setState(timer){

    console.log(timer.client + "=" + timer.resultstate)
switch (timer.protocol){
    case "ESPEasy":
        var options= {};
        options.host=timer.host;
        options.port=timer.port;
    if (timer.resultstate===timer.activeState){


        options.path=timer.onMessage;


    }
    else{
        options.path=timer.offMessage;

    }
        console.log(options);
        callUrl(options)

    break;
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

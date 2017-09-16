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
    var timerplan = require('./timerplan.json');

//console.log(timerplan.timer[0]);


    var timerSchedule = schedule.scheduleJob("* * * * *", function(){
        updateStates(timerplan)
    });


};

function updateStates(timerplan){

  timerplan.timer.forEach(function (acttimer){
      var d = new Date();
      var actDay=d.getDay();


      if (parseInt(actDay)===0) {actDay=7}

      var actMonth=d.getMonth()+1;
      var actHour=d.getHours();
      var actMin=d.getMinutes();
      var checkDay =[];
      var checkMonth =[];
      var actFloatingtime=actHour+actMin/60;



  acttimer.schedules.forEach( function(schedule)
      {

          if (schedule.month=="*"){
              checkMonth="1,2,3,4,5,6,7,8,9,10,11,12"
          }
          else{
              checkMonth=schedule.month;
          }




          if (schedule.dayOfWeek=="*"){
              checkDay=[1,2,3,4,5,6,7];
          }
          else{
              checkDay=schedule.dayOfWeek
          }


          acttimer.resultstate = acttimer.defaultState;


          if (checkDay.indexOf(actDay) >= 0 && checkMonth.indexOf(actMonth) >=0) {

              schedule.time.forEach(function (duration) {

                  duration = duration.replace(" ", "");
                  var stateBorders = duration.split("-");
                  var startTime = stateBorders[0];
                  var endTime = stateBorders[1];

                  var stateBegin = getFloatingTime(startTime);
                  var stateEnd = getFloatingTime(endTime);

                  //console.log(stateBegin + " " + stateEnd + " " + actFloatingtime);


                  if (stateBegin <= actFloatingtime && actFloatingtime <= stateEnd) {

                      acttimer.resultstate = acttimer.activeState;


                  } // if in time range


              })    //loop time
          }     //if actDay


      }) //loop schedules

      console.log(actHour + ":" +actMin +" "+ acttimer.client + " Status= " + acttimer.resultstate);


});     //lop timer

}


function getFloatingTime(timevalue){

    var splitter= timevalue.split(":");
    var hours= parseInt(splitter[0]);
    var minutes = parseInt(splitter[1])/60;
    return hours + minutes;



}

'use strict';

import * as moment from 'moment';
import * as vscode from 'vscode';
import { getConfig } from './configuration';
import Codic from 'codic';
let rp = require('request-promise');
let fs = require("fs");

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "adzan-reminder" is now active!');
    var config = getConfig();
    var jsonObject: null;
    var today = null;
    var month = null;
    var jsonPath = "";
    var uriApi = "";
    let JSON_SPACE = 4;
    var codic = new Codic();

    vscode.commands.executeCommand('adzan.runSchedule');

    let runSchedule = vscode.commands.registerCommand('adzan.runSchedule', () => {
      runningEveryHour();
      setInterval(runningEveryHour, 1000 * 60 * 60);
    });

    let adzanSimple = vscode.commands.registerCommand('adzan.simple', () => {
        loadData();
        fs.readFile(jsonPath, handleJSONFileSimple);   
        fs.readFile(jsonPath, handleJSONFileSchedule); 
    });

    let adzanComplete = vscode.commands.registerCommand('adzan.today', () => {
        loadData();
        fs.readFile(jsonPath, handleJSONFileComplete);    
    });

    context.subscriptions.push(runSchedule, adzanSimple, adzanComplete);

    var runningEveryHour = function() {
      loadData();
      fs.readFile(jsonPath, handleJSONFileSchedule);
    };

    var loadData = function() {
      config = getConfig();
      today = moment();
      month = today.month() + 1;
      jsonPath = "/tmp/praytime-"+ config.city +"-"+ config.country +"-" + month + "-" + today.year() + ".json";
      uriApi = "http://api.aladhan.com/v1/calendarByCity?city="+ config.city +"&country="+ config.country +"&method=2&month="+month+"&year="+today.year();
    };

    var handleJSONFileSimple = function (err: any, data: any) {
        if (err) {
          console.log(err.message);
          if (err.message.includes('no such file or directory')) {
            loadApiData();
          }  
        } else {
          readScheduleNow(data);
        }     
    };

    var handleJSONFileComplete = function (err: any, data: any) {
        if (err) {
          console.log(err.message);
          if (err.message.includes('no such file or directory')) {
            loadApiData();
          }  
        } else {
          readScheduleComplete(data);
        }     
    };

    var handleJSONFileSchedule = function (err: any, data: any) {
      if (err) {
        console.log(err.message);
        if (err.message.includes('no such file or directory')) {
          loadApiData();
        }  
      } else {
        setScheduleToday(data);
      } 
    };

    var readScheduleNow = function(data: any) {
      jsonObject = JSON.parse(data);

      if (jsonObject === null) {
        loadApiData();
      } else
      {
        let prayObject = prayTimeToday(jsonObject);

        let prayToday = prayObject[0];

        let afterNow = takeTimingAfterNow(prayToday.timings);
        if (afterNow.length > 0) {
          vscode.window.showInformationMessage("Time for "+ afterNow[0][0] +" : "+ afterNow[0][1]);
        }
        let beforeNow = takeTimingBeforeNow(prayToday.timings);
        if (beforeNow.length > 0) {
          vscode.window.showInformationMessage("Time for "+ beforeNow[0][0] +" : "+ beforeNow[0][1]);
        }
        
        vscode.window.showInformationMessage("Today ("+ prayToday.date.readable +") schedule in " + config.city +"/"+ config.country +":");

      }
    };

    var readScheduleComplete = async function(data: any) {
      jsonObject = JSON.parse(data);

      if (jsonObject === null) {
        loadApiData();
      } else
      {
        let prayObject = prayTimeToday(jsonObject);

        let prayToday = prayObject[0];
        let message = "("+ prayToday.date.readable +") schedule in " + config.city +"/"+ config.country;

        let prettySchedule = JSON.stringify(Object.assign({Today: message}, prayToday.timings), null, JSON_SPACE);

        setTextDocument(prettySchedule, null);
      }
    };

    var setScheduleToday = async function(data: any) {
      jsonObject = JSON.parse(data);

      if (jsonObject === null) {
        loadApiData();
      } else
      {
        let prayObject = prayTimeToday(jsonObject);

        let prayToday = prayObject[0];
        let timingArray = Object.entries( prayToday.timings);
        var prayTime = ['Fajr', 'Dhuhr', 'Asr', "Maghrib", "Isha"];
        timingArray.forEach(async function(timing: any) {
          const adzanTime = moment.utc(timing[1], "HH:mm");

          if (!prayTime.includes(timing[0])) {
            return;
          }

          if (!config.showPraytime) {
            return;
          }

          // register task on Codic
          await codic.assign('send reminders',setScheduleMessage);
          // pass isoString or human-interval or milliseconds to the at method
          await codic.run("send reminders")
                     .use({timing:timing})
                     .at(adzanTime.toISOString()) 
                     .setName("adzanReminderActivity"+timing[0])
                     .save();

          await codic.start();
        });
      }
    };

    const setScheduleMessage = (activity: { attrs: { data: { timing: any; }; }; }) => {
      let timing = activity.attrs.data.timing;
      let adzanTime = moment(timing[1], "HH:mm");
      let nowday = moment.utc();
      
      if (adzanTime.isBetween(nowday.clone().subtract(5, 'minutes'), nowday.clone().add(5, 'minutes'))) {
        vscode.window.showInformationMessage(
          `🕌🚶 ${timing[0]} : ${adzanTime.format('LT')} now! 🕌🚶`);
      }
    };

    var setTextDocument = function setContent( content: string, options: { language: any; } | null ) {
      options = options || {
          language: 'text'
      };
  
      return vscode.workspace.openTextDocument( {
              language: options.language
          } )
          .then( doc => vscode.window.showTextDocument( doc ) )
          .then( editor => {
              let editBuilder = (textEdit: { insert: (arg0: vscode.Position, arg1: string) => void; }) => {
                  textEdit.insert( new vscode.Position( 0, 0 ), String( content ) );
              };
  
              return editor.edit( editBuilder, {
                      undoStopBefore: true,
                      undoStopAfter: false
                  } )
                  .then( () => editor );
          } );
    };

    var takeTimingAfterNow = function(prayTimings: any) {
      let timingArray = Object.entries(prayTimings);

      return timingArray.filter(function(timing: any) {
        return moment(timing[1], "HH:mm").isAfter(moment());
      }).
      sort(function (a: any, b: any) {
        return moment(a[1], "HH:mm").isAfter(moment(b[1], "HH:mm")) ? 1 : 0;
      });
    };

    var takeTimingBeforeNow = function(prayTimings: any) {
      let timingArray = Object.entries(prayTimings);

      return timingArray.filter(function(timing: any) {
        return moment(timing[1], "HH:mm").isBefore(moment());
      }).
      sort(function (a: any, b: any) {
        return moment(a[1], "HH:mm").isBefore(moment(b[1], "HH:mm")) ? 1 : 0;
      });
    };  

    var prayTimeToday = function(dataArray: any) {
      return dataArray.filter(function(item: any) { 
        return moment(item.date.gregorian.date, item.date.gregorian.format).isSame(moment().startOf('day'));
      });
    };

    var loadApiData = function() {
      var options = {
        uri: uriApi,
        json: true // Automatically parses the JSON string in the response
      };

      rp(options)
      .then(function (response: any) {
          jsonObject = response.data;
          let jsonResponse = JSON.stringify(response.data);
          fs.writeFile(jsonPath, jsonResponse, function(err: any) {
            if(err) {
                return console.log(err.message);
            } else {
              readScheduleNow(jsonResponse);
            }
            
        }); 
      })
      .catch(function (err: any) {
          // The server responded with a status codes other than 2xx.
          // Check reason.statusCode
          console.log(err.message);
      });
    };


}

export function deactivate() {
}
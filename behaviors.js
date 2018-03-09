var sys = require('sys'),
    child_process = require('child_process'),
    vm = require('vm'),
    http = require('http'),
    querystring = require('querystring'),
    Persistence = require('./persistence/persistence'),
    request = require('request'),
    xml2jsParser = require('xml2js').parseString;

function msToString(ms) {
    var str = "";
    if (ms > 3600000) {
        var hours = Math.floor(ms/3600000);
        str += hours + " hours, ";
        ms = ms - (hours*3600000);
    }
    if (ms > 60000) {
        var minutes = Math.floor(ms/60000);
        str += minutes + " minutes, ";
        ms = ms - (minutes*60000);
    }
    str += Math.floor(ms/1000) + " seconds";
    return str;
}

function addBehaviors(bot, properties) {

    var persistence = new Persistence(properties);

    var userEval = 1;
    
    // Rate to mix in yahoo answers with stored responses
    // 0.75 = 75% Yahoo answers, 25% stored responses
    var mix = 0.5;

    bot.addMessageListener("logger", function(nick, message) {
        // Check to see if this is from a nick we shouldn't log
        if (properties.logger.ignoreNicks.filter(function (x) { return nick.indexOf(x) > -1; }).length > 0) {
            return true;
        }
        if (! (/^!/).test(message)) {
            persistence.saveMessage(nick, message);
        }
        return true;
    });

    var yahooAnswer = function(message) {
        var url = 'http://answers.yahoo.com/AnswersService/V1/questionSearch?appid=' + properties.yahooId +
            "&query=" + querystring.escape(message) + "&type=resolved&output=json";
        sys.log("Calling " + url);
        request(url, function(error, response, body) {
            try {
                var yahooResponse = JSON.parse(body);
                if (yahooResponse.all.count > 0) {
                    var bestAnswer = yahooResponse.all.questions[0].ChosenAnswer;
                    bestAnswer = bestAnswer.substring(0, 400);
                    bot.say(bestAnswer);
                } else {
                    persistence.getRandom(bot);
                }
            } catch (err) {
                sys.log(err);
                persistence.getRandom(bot);
            }
        });
    };

    bot.addMessageListener("listen for name", function (nick, message) {
        var re = new RegExp(properties.bot.nick);
        if (re.test(message)) {
            if (Math.random() < mix && properties.yahooId) {
                sys.log("mix = " + mix + ", serving from yahoo answers");
                yahooAnswer(message.replace(re, ''));
            } else {
                sys.log("mix = " + mix + ", serving from mysql");
                persistence.getRandom(bot);
            }
            return false;
        } else {
            return true;
        }
    });

    bot.addCommandListener("!do [nick]", /!do ([0-9A-Za-z_\-]*)/, "random quote", function(doNick) {
        persistence.getQuote(doNick, bot);
    });

    bot.addCommandListener("!msg [#]", /!msg ([0-9]*)/, "message recall", function(id) {
        persistence.getMessage(id, bot);
    });

    bot.addCommandListener("!about [regex pattern]", /!about (.*)/, "random message with phrase", function(pattern) {
        persistence.matchMessage(pattern, bot);
    });

    bot.addCommandListener("!uds", /!uds/, "random message about uds", function() {
        persistence.matchMessage('uds', bot);
    });

    bot.addCommandListener("!aevans", /!aevans/, "so, message from aevans", function() {
        persistence.matchMessageForNick('aevans', '^so(\\s|,)', bot);
    });

    bot.addCommandListener("!leaders [start index]", /!leaders\s*(\d*)/, "top users by message count", function(index) {
        persistence.leaders(index, bot);
    });

    bot.addCommandListener("!playback start end", /!playback (\d+ \d+)/, "playback a series of messages", function(range) {
        var match = range.match(/(\d+) (\d+)/);
        if (match) {
            var start = match[1];
            var end = match[2];
            if (end - start >= 10) {
                bot.say("playback limited to 10 messages");
            } else if (start >= end) {
                bot.say("start must be less than end");
            } else {
                for (var i = start; i <= end; i++) {
                    persistence.getMessage(i, bot);
                }
            }
        }
    });

    bot.addCommandListener("!stats nick", /!stats (.*)/, "stats about a user", function(nick) {
        persistence.userStats(nick, bot);
    });

    bot.addCommandListener("!alarm <time> -m <message>", /!alarm (.* -m .*)/, "set an alarm, valid time examples: 5s, 5m, 5h, 10:00, 14:30, 2:30pm", function(timeString, nick) {
        var matchInterval = timeString.match(/(\d+)([h|m|s]) -m (.*)/);
        var matchTime = timeString.match(/(\d{1,2}):(\d{2})(am|pm){0,1} -m (.*)/);
        if (matchInterval) {
            var timeNumber = matchInterval[1];
            var timeUnit = matchInterval[2];
            var sleepTime = timeNumber;
            if (timeUnit === 'h') {
                sleepTime = sleepTime * 60 * 60 * 1000;
            } else if (timeUnit === 'm') {
                sleepTime = sleepTime  * 60 * 1000;
            } else if (timeUnit === 's') {
                sleepTime = sleepTime * 1000;
            }
            if (sleepTime < 2147483647) {
                bot.say("Alarm will go off in " + msToString(sleepTime));
                setTimeout(function() {
                    bot.say(nick + ': ' + matchInterval[3]);
                }, sleepTime);
            } else {
                bot.say("Delay exceeds maximum timeout, see: http://stackoverflow.com/questions/3468607/why-does-settimeout-break-for-large-millisecond-delay-values");
            }
        } else if (matchTime) {
            var hour = parseInt(matchTime[1]);
            var minute = matchTime[2];
            if (matchTime[3] === 'pm' && hour != 12) {
                hour = hour + 12;
            } else if (matchTime[3] === 'am' && hour === 12) {
                hour = 0;
            }
            var now = new Date();
            var sleepTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0) - now;
            if (sleepTime < 0) {
                sleepTime += 86400000;
            }
            bot.say("Alarm will go off in " + msToString(sleepTime));
            setTimeout(function() {
                bot.say(nick + ': ' + matchTime[4]);
            }, sleepTime);
        } else {
            bot.say("Unknown time format!");
        }
    });

    bot.addCommandListener("!uname", /!uname/, "information about host", function() {
        child_process.exec('uname -a', function(error, stdout, stderr) {
            bot.say(stdout);
        });
    });

    bot.addCommandListener("!version", /!version/, "report node version", function() {
        bot.say("Node version = " + process.version);
    });

    bot.addCommandListener("!help <cmd>", /!help(.*)/, "command help", function(cmd) {
        if (cmd) {
            bot.helpCommand(cmd);
        } else {
            bot.listCommands();
        }
    });

    bot.addCommandListener("!quote [symbol]", /!quote (.*)/, "get a stock quote", function(symbol) {
        var url = 'https://api.iextrading.com/1.0/stock/' + symbol + '/batch?types=quote';
        request(url, function(error, response, body) {
          if (error) { console.log(error); }
          var result = JSON.parse(body);
          if (! error && result.quote && result.quote.latestPrice) {
              var mktCap = result.quote.marketCap;
              var mktCapString = "";
              if (mktCap > 1000000000) {
                  mktCapString = "$" + ((mktCap/1000000000).toFixed(2)) + "B";
              } else if (mktCap > 1000000) {
                  mktCapString = "$" + ((mktCap/1000000).toFixed(2)) + "M";
              }
              var changePrefix = (result.quote.change > 0) ? '+' : '';
              bot.say(result.quote.companyName + ' ... ' +
                  '$' + String(result.quote.latestPrice) + ' ' +
                  changePrefix + String(result.quote.change) + ' ' +
                  changePrefix + String((result.quote.changePercent * 100).toFixed(2)) + '% ' +
                  mktCapString);
          } else {
              bot.say("Unable to get a quote for " + symbol);
          }
        });
    });

    bot.addMessageListener("toggle", function(nick, message) {
        var check = message.match(/!toggle (.*)/);
        if (check) {
            var name = check[1];
            var result = bot.toggleMessageListener(name);
            if (result) {
                bot.say("Message listener " + name + " is active");
            } else {
                bot.say("Message listener " + name + " is inactive");
            }
            return false;
        }
        return true;
    });

    bot.addMessageListener("eval", function(nick, message) {
        var check = message.match(/!add (.*)/);
        if (check) {
            var msg = check[1];
            var mlName = "user eval " + userEval++;
            bot.addMessageListener(mlName, function(nick, message) {
                var sandbox = { output: null, nick: nick, message: message };
                vm.runInNewContext(msg, sandbox);
                if (sandbox.output) {
                    bot.say(sandbox.output);
                    return false;
                }
                return true;
            });
            bot.say("Added message listener: " + mlName);
            return false;
        }
        return true;
    });

    bot.addCommandListener("!define [phrase]", /!define (.*)/, "urban definition of a word or phrase", function(msg) {
        var data = "";
        var request = require('request');
        request("http://api.urbandictionary.com/v0/define?term=" + querystring.escape(msg), function (error, response, body) {
          if (!error && response.statusCode == 200) {
            var urbanresult = JSON.parse(body);
            bot.say(urbanresult.list[0].definition);
          }
        })
    });

    bot.addCommandListener("!example [phrase]", /!example (.*)/, "Use of urban definition of a word or phrase in a sentence", function(msg) {
        var data = "";
        var request = require('request');
        request("http://api.urbandictionary.com/v0/define?term=" + querystring.escape(msg), function (error, response, body) {
          if (!error && response.statusCode == 200) {
            var urbanresult = JSON.parse(body);
            bot.say(urbanresult.list[0].example);
          }
        })
    });

    bot.addCommandListener("!showerthought", /!showerthought/, "Return a reddit shower thought", function(msg) {
        var data = "";
        var request = require('request');
        request("http://www.reddit.com/r/showerthoughts/.json", function (error, response, body) {
          if (!error && response.statusCode == 200) {
            //console.log(body) // Print the results
            var showerthought = JSON.parse(body);
            // There are many returned in the json.  Get a count
            var showercount=showerthought.data.children.length
            var randomthought=Math.floor((Math.random() * showercount) + 1);
            console.log("Found " + showercount + " shower thoughts.  Randomly returning number " + randomthought);
            bot.say(showerthought.data.children[randomthought].data.title);
          }
        })
    });

    bot.addCommandListener("!firstworldproblems", /!firstworldproblems/, "Return a reddit first world problem", function(msg) {
        var data = "";
        var request = require('request');
        request("http://www.reddit.com/r/firstworldproblems/.json", function (error, response, body) {
          if (!error && response.statusCode == 200) {
            //console.log(body) // Print the results
            var firstworldproblem = JSON.parse(body);
            // There are many returned in the json.  Get a count
            var problemcount=firstworldproblem.data.children.length
            var randomproblem=Math.floor((Math.random() * problemcount) + 1);
            console.log("Found " + problemcount + " shower thoughts.  Randomly returning number " + randomproblem);
            bot.say(firstworldproblem.data.children[randomproblem].data.title);
          }
        })
    });

}

module.exports = addBehaviors;

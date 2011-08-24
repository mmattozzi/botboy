var sys = require('sys'), 
    child_process = require('child_process'),
    Script = process.binding('evals').Script,
    http = require('http'),
    querystring = require('querystring'),
    Persistence = require('./persistence/persistence');

function addBehaviors(bot, properties) {
    
    var persistence = new Persistence(properties);
    
    var userEval = 1;
    var yahooClient = http.createClient(80, 'answers.yahooapis.com');
    var urbanClient = http.createClient(80, 'www.urbandictionary.com');
    
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
        var url = '/AnswersService/V1/questionSearch?appid=' + properties.yahooId + 
            "&query=" + querystring.escape(message) + "&type=resolved&output=json";
        sys.log("Calling " + url);
        var request = yahooClient.request('GET', url, { host: 'answers.yahoo.com' });
        request.end();
        var data = '';
        request.on('response', function(response) {
            response.setEncoding('utf8');
            response.on('data', function(chunk) {
                data += chunk;
            });
            response.on('end', function() {
                try {
                    var yahooResponse = JSON.parse(data);
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

    bot.addMessageListener("adjust mix", function (nick, message) {
        var test = message.match(/!mix ([0-9]*\.[0-9]+)/);
        if (test) {
            mix = test[1];
            bot.say("Set mix to " + mix + " rate of yahoo answers.");
            return false;
        }
        return true;
    });

    bot.addMessageListener("quoter", function (nick, message) {
        var check = message.match(/!do ([0-9A-Za-z_\-]*)/);
        if (check) {
            var doNick = check[1];
            persistence.getQuote(doNick, bot);
            return false;
        } else {
            return true;
        }
    });

    bot.addMessageListener("message recall", function (nick, message) {
        var check = message.match(/!msg ([0-9]*)/);
        if (check) {
            var id = check[1];
            persistence.getMessage(id, bot);
            return false;
        } else {
            return true;
        }
    });

    bot.addMessageListener("uds", function (nick, message) {
        var check = message.match(/!uds/);
        if (check) {
            persistence.matchMessage('uds', bot);
            return false;
        } else {
            return true;
        }
    });

    bot.addMessageListener("aevans", function (nick, message) {
        var check = message.match(/!aevans/);
        if (check) {
            persistence.matchMessageForNick('aevans', '^so(\\s|,)', bot);
            return false;
        } else {
            return true;
        }
    });

    bot.addMessageListener("uname", function (nick, message) {
        if (message === "!uname") {
            child_process.exec('uname -a', function(error, stdout, stderr) {
                bot.say(stdout);
            });
            return false;
        }
        return true;
    });
    
    bot.addMessageListener("stocks", function (nick, message) {
        var check = message.match(/!quote (.*)/);
        if (check[1]) {
            var url = '/d/quotes.csv?s=' + check[1] + '&f=b3c6k2';
            var options = {
                host: 'download.finance.yahoo.com',
                port: 80,
                path: url
            };
            var req = http.get(options, function(response) {
                var data = "";
                response.setEncoding("utf8");
                response.on("data", function(chunk) {
                    data += chunk;
                });
                response.on("end", function() {
                    var cols = data.replace(/"/g, '').split(/,/);
                    bot.say(check[1] + ' ' + cols[0] + ' ' + cols[1] + ' ' + cols[2].substr(6));
                });
            });
            return false;
        };
        return true;
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
                Script.runInNewContext(msg, sandbox);
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
        
    bot.addMessageListener("urban dictionary", function(nick, message) {
        var check = message.match(/!define (.*)/);
        if (check) {
            var msg = check[1];
            var data = "";
            var request = urbanClient.request('GET', '/define.php?term=' + querystring.escape(msg), 
                { host: 'www.urbandictionary.com' } );
            request.end();
            request.on('response', function(response) {
                response.setEncoding('utf8');
                response.on('data', function(chunk) {
                    data += chunk;
                });
                response.on('end', function() {
                    bot.udData = data;
                    data.replace(/\r/g, '');
                    var lines = data.split(/\n/);
                    for (var i in lines) {
                        var defn = lines[i].match(/<div class="definition">(.*?)<\/div>/);
                        if (defn) {
                            var resp = defn[1];
                            resp = resp.replace(/<[^>]*>/g, '');
                            resp = resp.replace(/&quot;/g, '"');
                            bot.say(resp);
                            break;
                        }
                    }
                });
            });
            
            return false;
        }
        return true;
    });
}

module.exports = addBehaviors;

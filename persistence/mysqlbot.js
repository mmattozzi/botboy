var MySQLClient = require('./MysqlWrapper'),
    sys = require('sys');

function MysqlBot() {
    
    this.mysql = null;
    this.respond = true;
    var self = this;
    
    this.init = function(properties, respond) {
        this.mysql = new MySQLClient(properties.mysql);
        this.mysql.connect();
        sys.log("Using mysql for persistence");
        this.respond = respond;
        
        return this;
    };
    
    this.saveMessage = function(nick, message) {
        if (this.mysql) {
            this.mysql.query("INSERT INTO messages (nick, message) VALUES (?, ?)", [nick, message], function() { });
        }
    };
    
    this.getRandom = function(bot) {
        if (this.mysql && this.respond) {
            this.mysql.query("select * from messages where length(message) > 20 order by rand() limit 1", function(results, fields) {
                if (results.length > 0) {
                    bot.say(results[0].message);
                }
            });
        }
    };
    
    this.getQuote = function(nick, bot) {
        if (this.mysql && this.respond) {
            this.mysql.query("select * from messages where nick like '" + nick + "' order by rand() limit 1", function(results, fields) {
                if (results.length > 0) {
                    bot.say('#' + results[0].id + " " + results[0].message);
                }
            });
        }
    };
    
    this.getMessage = function(msgId, bot) {
        if (this.mysql && this.respond) {
            this.mysql.query("select * from messages where id = " + msgId, function(results, fields) {
                if (results.length > 0) {
                    bot.say('#' + results[0].id + " " + results[0].nick + ": " + results[0].message);
                }
            });
        }
    };
    
    this.matchMessage = function(str, bot) {
        if (this.mysql && this.respond) {
            var mysql_ = this.mysql;
            this.mysql.query("select * from messages where message regexp '" + str + "' order by rand() limit 1", function(results, fields) {
                if (results.length > 0) {
                    var randResults = results;
                    mysql_.query("select count(*) cnt from messages where message regexp '" + str + "'", function(results, fields) {
                        bot.say('#' + randResults[0].id + " " + randResults[0].message + " [" + results[0].cnt + " match]");
                    });
                }
            });
        }
    };
    
    this.matchMessageForNick = function(nick, str, bot) {
        if (this.mysql && this.respond) {
            this.mysql.query("select * from messages where nick like '" + nick + "' and message regexp '" + str + "' order by rand() limit 1", function(results, fields) {
                if (results.length > 0) {
                    bot.say('#' + results[0].id + " " + results[0].message);
                }
            });
        }
    };
    
    this.leaders = function(index, bot) {
        if (this.mysql && this.respond) {
            if (! index) {
                index = 0;
            }
            this.mysql.query("select nick, count(*) cnt from messages group by nick order by count(*) desc limit " + index + ",10", function(results, fields) {
                if (results.length > 0) {
                    var response = "";
                    results.forEach(function(row) {
                        response += row.nick + ": " + row.cnt + ", ";
                    });
                    response = response.slice(0, -2);
                    bot.say(response);
                }
            });
        }
    };
}

module.exports = MysqlBot;

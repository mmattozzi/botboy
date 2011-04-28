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
            this.mysql.query("INSERT INTO messages (nick, message) VALUES (?, ?)", [nick, message]);
        }
    };
    
    this.getRandom = function(bot) {
        if (this.mysql && this.respond) {
            this.mysql.query("select * from messages where length(message) > 20 order by rand() limit 1", function(err, results, fields) {
                if (err) {
                    sys.log("Error: " + err);
                }
                if (results.length > 0) {
                    bot.say(results[0].message);
                }
            });
        }
    };
    
    this.getQuote = function(nick, bot) {
        if (this.mysql && this.respond) {
            this.mysql.query("select * from messages where nick like '" + nick + "' order by rand() limit 1", function(err, results, fields) {
                if (err) {
                    sys.log("Error: " + err);
                }
                if (results.length > 0) {
                    bot.say('#' + results[0].id + " " + results[0].message);
                }
            });
        }
    };
    
    this.getMessage = function(msgId, bot) {
        if (this.mysql && this.respond) {
            this.mysql.query("select * from messages where id = " + msgId, function(err, results, fields) {
                if (err) {
                    sys.log("Error: " + err);
                }
                if (results.length > 0) {
                    bot.say('#' + results[0].id + " " + results[0].nick + ": " + results[0].message);
                }
            });
        }
    };
    
    this.matchMessage = function(str, bot) {
        if (this.mysql && this.respond) {
            this.mysql.query("select * from messages where message regexp '" + str + "' order by rand() limit 1", function(err, results, fields) {
                if (err) {
                    sys.log("Error: " + err);
                }
                if (results.length > 0) {
                    bot.say('#' + results[0].id + " " + results[0].message);
                }
            });
        }
    };
    
    this.matchMessageForNick = function(nick, str, bot) {
        if (this.mysql && this.respond) {
            this.mysql.query("select * from messages where nick like '" + nick + "' and message regexp '" + str + "' order by rand() limit 1", function(err, results, fields) {
                if (err) {
                    sys.log("Error: " + err);
                }
                if (results.length > 0) {
                    bot.say('#' + results[0].id + " " + results[0].message);
                }
            });
        }
    };
}

module.exports = MysqlBot;

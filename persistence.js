var MySQLClient = require('./MysqlWrapper'),
    sys = require('sys'),
    mongodb = require('mongodb');

function Persistence(properties) {
    this.mysql = null;
    this.mongoIrc = null;
    this.mongoSeq = null;
    var self = this;
    
    if (properties.mysql) {
        console.log("Using mysql for persistence");
        this.mysql = new MySQLClient(properties.mysql);
        this.mysql.connect();
    }
    
    if (properties.mongodb) {
        console.log("Using mongodb for persistence");
        var server = new mongodb.Server(properties.mongodb.host, properties.mongodb.port, {});
        new mongodb.Db(properties.mongodb.database, server, {}).open(function (error, client) {
            if (error) {
                throw error;
            }
            self.mongoIrc = new mongodb.Collection(client, 'messages');
            self.mongoSeq = new mongodb.Collection(client, 'seq');
        });
    }
    
    this.isActive = function() {
        return (this.mysql !== null || this.mongoIrc !== null);
    };
    
    this.saveMessage = function(nick, message) {
        if (this.mysql) {
            this.mysql.query("INSERT INTO messages (nick, message) VALUES (?, ?)", [nick, message]);
        }
        
        if (this.mongoIrc) {
            // Use findAndModify to emulate auto increment behavior for msgId
            this.mongoSeq.findAndModify({ '_id': 'msgId' }, [], { '$inc': { 'seq': 1 }}, { 'upsert': true, 'new': true }, function (err, obj) {
                var msgId = obj.seq;
                self.mongoIrc.insert({ 'msgId': msgId, 'nick': nick, 'message': message, date: new Date(), 'length': message.length }, function (err, options) {
                    if (err) {
                        console.warn(err.message);
                    }
                });
            });
        }
    };
    
    this.getRandom = function(bot) {
        if (this.mysql) {
            this.mysql.query("select * from messages where length(message) > 20 order by rand() limit 1", function(err, results, fields) {
                if (err) {
                    sys.log("Error: " + err);
                }
                if (results.length > 0) {
                    bot.say(results[0].message);
                }
            });
        } else if (this.mongoIrc) {
            this.mongoIrc.count({'length': { '$gte': 20 } }, function(err, count) {
                self.mongoIrc.find({'length': { '$gte': 20 }}, { limit: -1, skip: Math.floor(Math.random() * count)}).toArray(function(err, docs) {
                    if (docs.length > 0) {
                        bot.say(docs[0].message);
                    }
                });
            });
        }
    };
    
    this.getQuote = function(nick, bot) {
        if (this.mysql) {
            this.mysql.query("select * from messages where nick like '" + nick + "' order by rand() limit 1", function(err, results, fields) {
                if (err) {
                    sys.log("Error: " + err);
                }
                if (results.length > 0) {
                    bot.say('#' + results[0].id + " " + results[0].message);
                }
            });
        } else if (this.mongoIrc) {
            this.mongoIrc.count({'nick': nick}, function(err, count) {
                self.mongoIrc.find({'nick': nick}, { limit: -1, skip: Math.floor(Math.random() * count)}).toArray(function(err, docs) {
                    if (docs.length > 0) {
                        bot.say('#' + docs[0].msgId + " " + docs[0].message);
                    }
                });
            });
        }
    };
    
    this.getMessage = function(msgId, bot) {
        if (this.mysql) {
            this.mysql.query("select * from messages where id = " + msgId, function(err, results, fields) {
                if (err) {
                    sys.log("Error: " + err);
                }
                if (results.length > 0) {
                    bot.say('#' + results[0].id + " " + results[0].nick + ": " + results[0].message);
                }
            });
        } else if (this.mongoIrc) {
            self.mongoIrc.find({'msgId': parseInt(msgId) }, {}).toArray(function(err, docs) {
                if (docs.length > 0) {
                    bot.say('#' + docs[0].msgId + " " + docs[0].nick + ": " + docs[0].message);
                }
            });
        }
    };
}

module.exports = Persistence;


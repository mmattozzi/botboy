var sys = require('sys'),
    mongodb = require('mongodb');

function MongoBot() {
    
    this.mongoIrc = null;
    this.mongoSeq = null;
    this.respond = true;
    var self = this;
    
    this.init = function(properties, respond) {
        var server = new mongodb.Server(properties.mongodb.host, properties.mongodb.port, {});
        new mongodb.Db(properties.mongodb.database, server, {}).open(function (error, client) {
            if (error) {
                throw error;
            }
            self.mongoIrc = new mongodb.Collection(client, 'messages');
            self.mongoSeq = new mongodb.Collection(client, 'seq');
            self.respond = respond;
            
            sys.log("Using mongodb for persistence");
        });
        
        return this;
    };
    
    this.saveMessage = function(nick, message) {
        if (this.mongoIrc && this.respond) {
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
        if (this.mongoIrc && this.respond) {
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
        if (this.mongoIrc && this.respond) {
            this.mongoIrc.count({'nick': nick}, function(err, count) {
                self.mongoIrc.find({'nick': nick}, { limit: -1, skip: Math.floor(Math.random() * count)}).toArray(function(err, docs) {
                    sys.log("found something");
                    if (docs.length > 0) {
                        bot.say('#' + docs[0].msgId + " " + docs[0].message);
                    }
                });
            });
        }
    };
    
    this.getMessage = function(msgId, bot) {
        if (this.mongoIrc && this.respond) {
            self.mongoIrc.find({'msgId': parseInt(msgId) }, {}).toArray(function(err, docs) {
                if (docs.length > 0) {
                    bot.say('#' + docs[0].msgId + " " + docs[0].nick + ": " + docs[0].message);
                }
            });
        }
    };
    
    this.matchMessage = function(str, bot) {
        if (this.mongoIrc && this.respond) {
            this.mongoIrc.count({ 'message': '/' + str + '/'}, function(err, count) {
                self.mongoIrc.find({ 'message': '/' + str + '/'}, { limit: -1, skip: Math.floor(Math.random() * count)}).toArray(function(err, docs) {
                    if (docs.length > 0) {
                        bot.say('#' + docs[0].msgId + " " + docs[0].message);
                    }
                });
            });
        }
    };
    
    this.matchMessageForNick = function(nick, str, bot) {
        if (this.mongoIrc && this.respond) {
            this.mongoIrc.count({'nick': nick}, function(err, count) {
                self.mongoIrc.find({ 'nick': nick, 'message': '/' + str + '/'}, { limit: -1, skip: Math.floor(Math.random() * count)}).toArray(function(err, docs) {
                    if (docs.length > 0) {
                        bot.say('#' + docs[0].msgId + " " + docs[0].message);
                    }
                });
            });
        }
    };
}

module.exports = MongoBot;

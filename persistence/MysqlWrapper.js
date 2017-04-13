var sys = require('sys'),
    mysql = require('mysql');

// Abstracts error handling and reconnects and requeries if the database connection is lost.
function MysqlWrapper(options) {
    
    this.client = null;
    this.options = options;
    var self = this;
    
    this.connect = function() {
        this.client = mysql.createPool({
            connectionLimit: 10,
            user: this.options.user,
            password: this.options.password,
            host: 'localhost',
            database: this.options.database
        });        
    };
    
    this.disconnect = function() {
        this.client.end(function(err) {
            sys.log("Error with mysql client: " + err);
            sys.log(sys.inspect(err));
        });
    };
    
    this.query = function() {
        var qry = arguments[0];
        var func = arguments[arguments.length - 1];
        var boundValues = null;
        if (arguments.length == 3) {
            boundValues = arguments[1];
        }
        sys.log("Calling mysql query: " + qry);
        try {
            var errorHandlingCallback = function(err, results, fields) {
                if (err) {
                    self.handleError(err, qry, boundValues, func);
                } else {
                    func(results, fields);
                }
            };
            if (boundValues) {
                this.client.query(qry, boundValues, errorHandlingCallback);
            } else {
                this.client.query(qry, errorHandlingCallback);
            }
        } catch (err) {
            this.handleError(err);
        }
    };
    
    this.handleError = function(err, qry, boundValues, func) {
        sys.log("Error with mysql client: " + err);
        sys.log(sys.inspect(err));
        if (err.message === "No database selected") {
            this.client.end();
            this.connect();
            
            // Retry the query
            if (boundValues != null) {
                this.query(qry, boundValues, func);
            } else {
                this.query(qry, func);
            }
        }
    };
    
}

module.exports = MysqlWrapper;

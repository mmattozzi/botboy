var sys = require('sys'),
    mysql = require('mysql');

function MysqlWrapper(options) {
    
    this.client = null;
    this.options = options;
    
    this.connect = function() {
        this.client = mysql.createClient({
            user: this.options.user,
            password: this.options.password,
            port: this.options.port
        });
        
        this.client.useDatabase(this.options.database);
    };
    
    this.disconnect = function() {
        try {
            this.client.end();
        } catch (err) {
            sys.log("Error with mysql client: " + err);
            sys.log(sys.inspect(err));
        }
    };
    
    this.query = function(qry, func) {
        try {
            this.client.query(qry, func);
        } catch (err) {
            sys.log("Error with mysql client: " + err);
            sys.log(sys.inspect(err));
            if (err.message === "No database selected") {
                this.client.end();
                this.connect();
            }
        }
    };
    
}

module.exports = MysqlWrapper;

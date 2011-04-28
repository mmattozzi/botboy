var sys = require('sys'),
    MySQLClient = require('../lib/node-mysql').Client;

function MysqlWrapper(options) {
	
	this.mysql = new MySQLClient();
	this.options = options;
	
	for (var k in this.options) {
		this.mysql[k] = this.options[k];
	}
	
	this.connect = function() {
		this.mysql.connect();
	};
	
	this.disconnect = function() {
		try {
			this.mysql.disconnect();
		} catch (err) {
			sys.log("Error with mysql client: " + err);
			sys.log(sys.inspect(err));
		}
	};
	
	this.query = function(qry, func) {
		try {
			this.mysql.query(qry, func);
		} catch (err) {
			sys.log("Error with mysql client: " + err);
			sys.log(sys.inspect(err));
			if (err.message === "No database selected") {
				this.mysql.disconnect();
				this.mysql.connect();
			}
		}
	};
	
}

module.exports = MysqlWrapper;

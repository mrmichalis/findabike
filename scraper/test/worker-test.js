var equal = require('assert').equal,
	Worker = require('../lib').Worker,
	client = require('beanstalk_client').Client;


exports.tests = {
		"worker's crawl method should be called when a crawl event is ommitted by Redis": function(finished, prefix) {	
			var worker = new Worker({
				crawl: function(email) {
					equal(email, 'foo@example.com', prefix + 'email was not received');
					finished();
				}
			});
			
			client.connect('127.0.0.1:11300', function(err, conn) {
				conn.put(0, 0, 1, JSON.stringify({email: 'foo@example.com'}), function() {
				});
			});
		}
};

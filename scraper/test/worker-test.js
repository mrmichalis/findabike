var equal = require('assert').equal,
	Worker = require('../lib').Worker,
    client = require('redis').createClient();

exports.tests = {
		"worker's crawl method should be called when a crawl event is ommitted by Redis": function(finished, prefix) {	
			var worker = new Worker({
				crawl: function(email) {
					equal(email, 'foo@example.com', prefix + 'email was not received');
					finished();
				}
			}, function() {
				client.publish(Worker.WORK_QUEUE, 'foo@example.com');
			});
		}
};
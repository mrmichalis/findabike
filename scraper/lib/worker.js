var client = require('beanstalk_client').Client,
	$ = require('jquery');

function Worker(opts) {
	$.extend(this, opts, {
		beanstalkPort: '11300',
		beanstalkHost: '127.0.0.1'
	});
	this._subscribeToEvents();
}

Worker.WORK_QUEUE = 'crawls';

Worker.prototype._subscribeToEvents = function() {
	var _this = this;

	client.connect(this.beanstalkHost + ':' + this.beanstalkPort, function(err, connection) {
		
		_this.connection = connection;
		
		_this.connection.reserve(function(err, id, jobJSON) {
			var job = JSON.parse(jobJSON);
			
			if (job.email) _this.crawl(job.email);
			
			_this._rescheduleWork(id, job);
		});
	});
};

Worker.prototype._rescheduleWork = function(id, job) {
	
	this.connection.destroy(id, function(err) {
		console.log('destroyed job ' + id)
	});
};

Worker.prototype.crawl = function(email) {
	
};

exports.Worker = Worker;

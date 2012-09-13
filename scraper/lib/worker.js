var client = require('beanstalk_client').Client,
	$ = require('jquery');

function Worker(opts) {
	$.extend(this, opts, {
		beanstalkPort: '11300',
		beanstalkHost: '127.0.0.1'
	});
	var _this = this;
	client.connect(this.beanstalkHost + ':' + this.beanstalkPort, function(err, connection) {
		_this.connection = connection;
		_this._subscribeToEvents();
	});
}

Worker.CHECK_POST_JOB = 'check_post_job';
Worker.PARSE_LISTING_JOB = 'parse_listing_job';

Worker.prototype._subscribeToEvents = function() {
	var _this = this;

	_this.connection.reserve(function(err, id, jobJSON) {
		var job = JSON.parse(jobJSON);
		
		if (job.email) _this.crawl(job);
		
		_this._rescheduleWork(id, job);
	});
};

Worker.prototype._rescheduleWork = function(id, job) {
	var _this = this;
	if (job.recurring) {
		this.connection.put(1, 3, 120, JSON.stringify(job), function() {
			_this.connection.destroy(id, function(err) {
				console.log('destroyed ' + job.type + ' job ' + id)
				_this._subscribeToEvents();
			});
		});
	} else {
		this.connection.destroy(id, function(err) {
			console.log('destroyed ' + job.type + ' job ' + id)
			_this._subscribeToEvents();
		});
	}
};

Worker.prototype.crawl = function(job) {
	// CHECK JOB DO TWO TYPES OF WORK HERE.
	/*
	conn.put(0, 0, 1, JSON.stringify({
		email: 'foo@example.com',
		type: 'yo',
		recurring: true
	}), function() {});
	*/
};

exports.Worker = Worker;

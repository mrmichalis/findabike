var redis = require('redis');

function Worker(opts, subscribeCallback) {
	if (opts.crawl) this.crawl = opts.crawl;
	this.subscribeCallback = subscribeCallback;
	this.client = redis.createClient(null, null, {detect_buffers: true});
	this._subscribeToEvents();
}

Worker.WORK_QUEUE = 'crawls';

Worker.prototype._subscribeToEvents = function() {
	var _this = this;
	
	this.client.on('message', function(channel, message) {
		_this.crawl(message);
	});
	
	this.client.on("subscribe", function (channel, count) {
		_this.subscribeCallback();
	});
	
	this.client.subscribe(Worker.WORK_QUEUE);
};

Worker.prototype.crawl = function(email) {
	
};

Worker.prototype.shutdown = function() {
	this.client.unsubscribe(Worker.WORK_QUEUE);
};

exports.Worker = Worker;
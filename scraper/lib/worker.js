var client = require('beanstalk_client').Client,
	$ = require('jquery'),
	Crawler = require('./crawler').Crawler,
	redis = require('redis').createClient();

function Worker(opts) {
	$.extend(this, opts, {
		beanstalkPort: '11300',
		beanstalkHost: '127.0.0.1',
		crawler: new Crawler()
	});
	
	var _this = this;
	
	client.connect(this.beanstalkHost + ':' + this.beanstalkPort, function(err, defaultConnection) {
		_this.defaultConnection = defaultConnection;
		_this._subscribeToEvents();
		console.log('reading work queue.');
	});
	
	client.connect(this.beanstalkHost + ':' + this.beanstalkPort, function(err, emailConnection) {
		_this.emailConnection = emailConnection;
		_this.emailConnection.use('emails', function() {
			console.log('using email queue.');
		});
	});

}

Worker.CRAWL_FREQUENCY = 900;// Crawl every 15 minutes.
Worker.MAX_POSTS_CACHED = 10;

// get the current UNIX timestamp (millis since epoch)
Worker.prototype.unixTime = function() {
  return Math.round((new Date()).getTime() / 1000);
}

Worker.prototype._subscribeToEvents = function() {
	var _this = this;

	console.log('waiting for crawl.');
	_this.defaultConnection.reserve(function(err, id, jobJSON) {
		var job = JSON.parse(jobJSON);
		
		if (job.type) {
			console.log('received crawl job.');
			_this[job.type](id, job);
		} else {
			throw 'job type not found'
		}
		
		_this._rescheduleWork(id, job);
	});
};

Worker.prototype._rescheduleWork = function(id, job) {
	var _this = this;
	if (job.type) {
		// 900 seconds, or every 15 minutes, we'll check for more bikes.
		this.defaultConnection.release(id, 0, Worker.CRAWL_FREQUENCY, function() {
			console.log('job id=' + id + ' released.');
			_this._subscribeToEvents();
		});
	} else {
		this.defaultConnection.destroy(id, function(err) {
			console.log('destroyed ' + job.type + ' job ' + id)
			_this._subscribeToEvents();
		});
	}
};

Worker.prototype.crawlPageJob = function(id, job) {
	var _this = this;
	this.crawler._crawl_list(job.url, function(err, listing) {
		_this._getNewWork(id, job.email, listing, function(urls) {
			var dataForUser = {};
			console.log('start to crawl urls')

			_this._crawlUrls(job.email, urls, dataForUser, function() {
				console.log('crawled final page');
			});
		});
	})
};

Worker.prototype._getNewWork = function(id, email, listing, callback) {
	var _this = this;
	
	redis.get(email, function(err, userInfoJSON) {
		
		console.log('starting to crawl user: ' + userInfoJSON);
		
		var userInfo = JSON.parse(userInfoJSON),
			terminate = false,
			urls = [],
			postIds = [];
		
		if (userInfo.work_id !== id.toString()) {
			_this._deleteJob(id);
			return;
		}
		if (userInfo.state === 'inactive') return;
			
		if (!userInfo.post_ids.length) userInfo.post_ids = [-1];
		
		userInfo.post_ids.forEach(function(postId) {
			if (terminate) return;
			
			urls = [];
			postIds = [];
			
			for (var i = 0, listingLink; (listingLink = listing.things[i]) != null; i++) {
				if (listingLink.id === postId || urls.length >= Worker.MAX_POSTS_CACHED) {
					terminate = true;
					break;
				} else if (listingLink.url) {
					urls.push(listingLink.url)
					postIds.push(listingLink.id)
				}
			}
		});
		
		_this._updateUserInfo(email, userInfo, postIds)
		if (urls.length) callback(urls);
	});
};

Worker.prototype._deleteJob = function(id) {
	this.defaultConnection.destroy(id, function(err) {
		console.log('destroyed ' + id)
	});
};

Worker.prototype._updateUserInfo = function(email, userInfo, newPostIds) {
	userInfo.last_work = this.unixTime();
	userInfo.post_ids = newPostIds.concat(userInfo.post_ids);
	if (userInfo.post_ids.length > Worker.MAX_POSTS_CACHED) {
		userInfo.post_ids.pop();
	}
	redis.set(email, JSON.stringify(userInfo))
}

Worker.prototype._crawlUrls = function(email, urls, dataForUser, callback) {

	if (urls.length === 0) {
		callback();
		return;
	}
	
	var url = urls.pop(),
		_this = this;
	
	// Actulaly crawl the variable url
	this.crawler._crawl_post(url, function(err, output) {
		
		if (err) console.log(err)
		
		output.email = email;
		
		_this.emailConnection.put(0, 0, 1, JSON.stringify(output), function() {
			console.log(output)
		});
		
		_this._crawlUrls(email, urls, dataForUser, callback);
	});
};

exports.Worker = Worker;

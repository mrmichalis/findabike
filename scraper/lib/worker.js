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
	});
	
	client.connect(this.beanstalkHost + ':' + this.beanstalkPort, function(err, emailConnection) {
		_this.emailConnection = emailConnection;
		_this.emailConnection.use('emails', function() {
			console.log('email connection initialized');
		});
	});

}

// get the current UNIX timestamp (millis since epoch)
Worker.prototype.unixTime = function() {
  return Math.round((new Date()).getTime() / 1000);
}

Worker.prototype._subscribeToEvents = function() {
	var _this = this;

	console.log('waiting for crawl message.');
	_this.defaultConnection.reserve(function(err, id, jobJSON) {
		var job = JSON.parse(jobJSON);
		
		if (job.type) {
			_this[job.type](job);
		} else {
			throw 'job type not found'
		}
		
		_this._rescheduleWork(id, job);
	});
};

Worker.prototype._rescheduleWork = function(id, job) {
	var _this = this;
	if (job.recurring) {
		// Look for work every 15 minutes.
		this.defaultConnection.put(1, 900, 120, JSON.stringify(job), function() {
			console.log('rescheduling ' + job.type + ' job id=' + id);
			_this.defaultConnection.destroy(id, function(err) {
				console.log('destroyed ' + job.type + ' job id=' + id)
				_this._subscribeToEvents();
			});
		});
	} else {
		this.defaultConnection.destroy(id, function(err) {
			console.log('destroyed ' + job.type + ' job ' + id)
			_this._subscribeToEvents();
		});
	}
};

Worker.prototype.crawlPageJob = function(job) {
	var _this = this;
	this.crawler._crawl_list(job.url, function(err, listing) {
		_this._getNewWork(job.email, listing, function(urls) {
			var dataForUser = {};
			console.log('start to crawl urls')

			_this._crawlUrls(job.email, urls, dataForUser, function() {
				console.log('crawled final page');
			});
		});
	})
};

Worker.prototype._getNewWork = function(email, listing, callback) {
	var _this = this;
	
	redis.get(email, function(err, userInfoJSON) {
		
		console.log('starting to crawl user: ' + userInfoJSON);
		
		var userInfo = JSON.parse(userInfoJSON),
			terminate = false,
			urls = [],
			postIds = [];
			
		if (!userInfo.post_ids.length) userInfo.post_ids = [-1];
		
		userInfo.post_ids.forEach(function(postId) {
			if (terminate) return;
			
			urls = [];
			postIds = [];
			
			for (var i = 0, listingLink; (listingLink = listing.things[i]) != null; i++) {
				if (listingLink.id === postId || urls.length >= 10) {
					terminate = true;
					break;
				} else if (listingLink.url) {
					urls.push(listingLink.url)
				}
				
				if (listingLink.id) {
					postIds.push(listingLink.id)
				}
			}
		});
		
		_this._updateUserInfo(email, userInfo, postIds)
		if (urls.length) callback(urls);
	});
};

Worker.prototype._updateUserInfo = function(email, userInfo, newPostIds) {
	userInfo.last_work = this.unixTime();
	userInfo.post_ids = newPostIds.concat(userInfo.post_ids);
	if (userInfo.post_ids.length > 20) {
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

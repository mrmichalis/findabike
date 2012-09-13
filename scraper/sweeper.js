var client = require('beanstalk_client').Client,
  redis = require('redis'),
  redisCli = redis.createClient(),
  _ = require('underscore')._,
  $ = require('jquery');

// get the current UNIX timestamp (millis since epoch)
function gettimeofday() {
  return Math.round((new Date()).getTime() / 1000);
}

// print a JSON logline
function log() {
  console.log(JSON.stringify(arguments));
}

// given an email and user data object, return a job descriptor
function getJob(email, data) {
  return { email: email,
           url: data.url,
           type: 'crawlPageJob'
         };
}

function Sweeper(opts) {
	$.extend(this, opts, {
		beanstalkPort: '11300',
		beanstalkHost: 'localhost'
	});
}

// initialize the Sweeper
Sweeper.prototype.init = function(callback) {
	var _this = this;
  console.log('about to connect', this);
	client.connect(this.beanstalkHost + ':' + this.beanstalkPort, function(err, connection) {
    if (err) throw err;
		_this.connection = connection;
    console.log('done connecting', _this);
    callback(err, connection);
	});
}

// clear everything in the beanstalk
Sweeper.prototype._clearBeanstalk = function() {
	var _this = this;

  var cb = function(err, id) {

    if (err) return; // tube is clear

    // parse out the job and destroy it
    _this.connection.reserve(function(err, id, jobJSON) {
		  var job = JSON.parse(jobJSON);
		  _this.connection.destroy(id, function(err) {
			  console.log('destroyed ' + job.type + ' job ' + id)
        // look for more work to destroy
	      _this.connection.peek_ready(cb);
		  });
    });
	};

	_this.connection.peek_ready(cb);
}

// schedule work for the given user email / data
Sweeper.prototype._schedule = function(email, callback) {
  var _this = this;

  // pull data from redis
  redisCli.get(email, function(err, data) {

    // pass errors up
    if (err) throw err;

    // check that data was set for user
    if (! data) {
      console.log('ERROR: redis has no data for user ' + email);
      return;
    }

    // calculate time since last work
    var obj = JSON.parse(data);
    var last_work = obj['last_work'];
    var curr_time = gettimeofday();
    var tdiff = curr_time - last_work;

    // if it exceeds 15 minutes, reschedule it
    if (tdiff > 1000 * 60 * 15) {
      // build the job description
      var job = getJob(email, obj);
      // log out the fact that we are scheduling a job
      console.log('SCHEDULE', job);
      // actually schedule client in beanstalk
	    _this.connection.put(0, 0, 1, JSON.stringify(job), function(err, id) {
        callback(err, id);
	    });
    }

  });

}

// look for new users ("stale accounts"),
// which are detected by old nix timestamp
Sweeper.prototype._scanStaleAccounts = function() {
  var _this = this;

  // for each user (keyed by email)
  redisCli.keys('*', function(err, emails) {

    // <horrible>
    //
    // TODO: such a hack, asyncronously queuing multiple requests
    //       does not work for some reason, so we must do it this
    //       way for now instead of using _.each like normal people
    var i = 0;
    var cb = function() {
      if (i >= emails.length) return;
      _this._schedule(emails[i], function(err, id) {
        console.log('done scheduling from stale account', id);
      });
    };
    cb();
    // </horrible>

  });
}

// enter loop
var sweeper = new Sweeper();
sweeper.init(function(err, conn) {

  // clear the beanstalk on startup
  sweeper._clearBeanstalk();

  // listen for new users
  var redisPubCli = redis.createClient();
  redisPubCli.on('subscribe', function (channel, count) {
    console.log('subscribed to', channel);
  });
  redisPubCli.on('message', function (channel, message) {
    var email = message;
    console.log('got a new user', email, 'on the channel', channel);
    sweeper._schedule(email, function(err, id) {
      console.log('done scheduling new user in beanstalk');
    });
  });
  redisPubCli.subscribe('new-users');

  // then periodically scan for stale accounts
  setInterval(function() {
    sweeper._scanStaleAccounts();
  }, 5000);

});

var client = require('beanstalk_client').Client,
  redis = require("redis").createClient(),
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
           url: data.url };
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
Sweeper.prototype._schedule = function(email, data, callback) {
  var _this = this;

  // build the job description
  var job = getJob(email, data);

  // log out the fact that we are scheduling a job
  console.log('SCHEDULE', job);

  // actually schedule client in beanstalk
	this.connection.put(0, 0, 1, JSON.stringify(job), function(err, id) {
    callback(err, id);
	});
}

// look for new users ("stale accounts"),
// which are detected by old nix timestamp
Sweeper.prototype._scanStaleAccounts = function() {
  var _this = this;

  // for each user (keyed by email)
  redis.keys('*', function(err, emails) {

    // <horrible>
    //
    // TODO: such a hack, asyncronously queuing multiple requests
    //       does not work for some reason, so we must do it this
    //       way for now instead of using _.each like normal people
    var i = 0;
    var cb = function() {
      if (i >= emails.length) return;
      var email = emails[i];

      // pull data for the redis
      redis.get(email, function(err, data) {

        // calculate time since last work
        var obj = JSON.parse(data);
        var last_work = obj['last_work'];
        var curr_time = gettimeofday();
        var tdiff = curr_time - last_work;

        // if it exceeds 15 minutes, reschedule it
        if (tdiff > 1000 * 60 * 15) {
          _this._schedule(email, obj, function(err, id) {
            console.log('done scheduling');
            i += 1;
            cb();
          });
        }
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

  // then periodically scan for stale accounts
  setInterval(function() {
    sweeper._scanStaleAccounts();
  }, 1000);

});

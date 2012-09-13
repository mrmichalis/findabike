var querystring = require('querystring'),
  http = require('http'),
  client = require('beanstalk_client').Client,
  _ = require('underscore')._,
  $ = require('jquery'),
  crypto = require('crypto');

// get the auth secret
var AUTH_SECRET = process.env.AUTH_SECRET;

function Poster(opts) {
	$.extend(this, opts, {
		beanstalkPort: '11300',
		beanstalkHost: '127.0.0.1'
	});
}

// initialize the Poster
Poster.prototype.init = function(callback) {
	var _this = this;
	client.connect(this.beanstalkHost + ':' + this.beanstalkPort, function(err, connection) {
    if (err) throw err;
		_this.connection = connection;
    console.log('connection established');

    // register interest in 'email' queue and de-register in 'default'
    _this.connection.ignore('default', function() {
      console.log('ignoring "default" queue');
      _this.connection.watch('emails', function() {
        console.log('watching "emails" queue');
        callback(err, connection);
      });
    });

	});
}

function sendPost(str) {
    try {

      shasum = crypto.createHash('sha1');
      shasum.update(str + AUTH_SECRET);

      // POST the json
      var post_options = {
        host: 'localhost',
        port: '80',
        path: '/sendmail/' + shasum.digest('hex'),
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': str.length
        }
      };

      // Set up the request
      var post_req = http.request(post_options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
          console.log('Response: ' + chunk);
        });
      });

      post_req.on('error', function(err) {
        console.log(err);
      });

      // post the data
      post_req.write(str);
      post_req.end();

    } catch (e) {
      console.log(e);
    }
}

// enter loop
var poster = new Poster();
poster.init(function(err, conn) {

  var cb = function(err, id, jobJSON) {

    sendPost(jobJson);

    // destroy data
    conn.destroy(id, function(err) {
      if (err) throw err;
      console.log('destroyed', id);
      // get more data
      conn.reserve(cb);
    });

  };

  conn.reserve(cb);
});

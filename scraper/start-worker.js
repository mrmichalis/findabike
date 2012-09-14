var Worker = require('./lib').Worker,
	client = require('beanstalk_client').Client,
	redis = require('redis').createClient();

/*redis.set('bencoe@gmail.com', JSON.stringify({
		'email': 'bencoe@gmail.com',
		'state': 'active',
		'url': 'http://sfbay.craigslist.org/search/bia?query=surly&srchType=A&minAsk=&maxAsk=',
		'post_ids': [],
		'last_work': 0
}));*/
/*
client.connect('127.0.0.1:11300', function(err, connection) {
	connection.put(0, 0, 1, JSON.stringify({
		email: 'bencoe@gmail.com',
		state: 'active',
	  url: 'http://sfbay.craigslist.org/search/bia?query=surly&srchType=A&minAsk=&maxAsk=',
	  type: 'crawlPageJob'
	}), function() {});
});*/

new Worker();


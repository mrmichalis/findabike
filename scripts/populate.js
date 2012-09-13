// node populate.js
//
// Populates the default redis database (localhost)
// with some fake user data

var redis = require("redis"),
    _ = require('underscore')._;

var data = {
  'gabesilk@gmail.com': {
    'url': 'http://sfbay.craigslist.org/search/bia?query=surly&srchType=A&minAsk=&maxAsk=',
    'recent_posts': {}
  },
  'bencoe@gmail.com': {
    'url': 'http://sfbay.craigslist.org/search/bia?query=bianchi&srchType=A&minAsk=&maxAsk=',
    'recent_posts': {}
  }
};

// if you'd like to select database 3, instead of 0 (default), call
// client.select(3, function() { /* ... */ });
var client = redis.createClient();
client.on('error', function (err) {
  console.log('redis client error: ' + err);
});

_.each(data, function(udata, email) {
  client.set(email, JSON.stringify(udata), redis.print);
});

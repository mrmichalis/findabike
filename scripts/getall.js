// node getall.js <email>
//
// Get all user data for the given <email>

var redis = require("redis"),
    _ = require('underscore')._;

var data = {}

var client = redis.createClient();
client.on('error', function (err) {
  console.log('redis client error: ' + err);
});

var user = process.argv[2];

client.get(user, function(err, data) {
  console.log(data);
});

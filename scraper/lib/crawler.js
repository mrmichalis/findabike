jDistiller = require('jdistiller').jDistiller,
  _ = require('underscore')._,
  fs = require('fs');

function Crawler() {}

Crawler.RESULTS_QUEUE = 'results';

function fakeRequest(opts, callback) {
	if (opts.url.indexOf('query') !== -1) {
		return callback(null, {statusCode: 200}, fs.readFileSync('./fixtures/front-page.html').toString())
	} else {
		return callback(null, {statusCode: 200}, fs.readFileSync('./fixtures/page.html').toString())
	}
}

// Crawls a search listing and returns a list of posts
// of the form:
//
// { url: <url>,
//   title: <title>,
//   id: <id>
// }
Crawler.prototype._crawl_list = function(url, callback) {
  var _this = this;

  new jDistiller(
//    {request: fakeRequest}
  )
    .set('title', 'title')
    .set('things', 'p.row a', function(elem, prev) {
      var regex = /\/(\d*)\.html/;
      var match = regex.exec(elem.attr('href'));
      try {
        var id = match[1];
      } catch (e) {
        // This naturally occurs when parsing all the shit at
        // the top of the page

        // TODO: make the jQery selector more selective
        // console.log('while scraping', elem.attr('href'), 'exception:', e);
      }
      if (!id) return;
      return [{
        'url': elem.attr('href'),
        'title': elem.text(),
        'id': id
      }];
    })
    .distill(url, function(err, distilledPage) {
      callback(err, distilledPage);
    });
};

// Crawls an individual post and returns a single
// object of the form:
//
// {TODO}
Crawler.prototype._crawl_post = function(url, callback) {
  var _this = this;

  new jDistiller(
//    {request: fakeRequest}
  )
    .set('date', 'span.postingdate', function(elem, prev) {
      return elem.text().slice(6); // chop off the initial "Date  "
    })
    .set('title', 'title')
    .set('images', '#userbody img', function(elem, prev) {
      return [elem.attr('src')];
    })
    .set('description', '#userbody', function(elem, prev) {
      return _.reduce(elem.text().replace('\n', ' ').split(' '), function(memo, curr) {
        return memo.length + curr.length + 1 < 140 ? memo + ' ' + curr : memo;
      });
    })
    .distill(url, function(err, distilledPage) {
      distilledPage['url'] = url;
      callback(err, distilledPage);
    });
};

// TODO: remove
//
// (new Crawler())._crawl_post('http://sfbay.craigslist.org/eby/bik/3263927274.html', function(err, distilledPage) {
//   if (err) {
//     console.log(err);
//     return;
//   }
//   console.log(JSON.stringify(distilledPage));
// });
//
// (new Crawler())._crawl_list('http://sfbay.craigslist.org/bia/', function(err, distilledPage) {
//   console.log(err);
//   console.log(JSON.stringify(distilledPage));
// });

exports.Crawler = Crawler;

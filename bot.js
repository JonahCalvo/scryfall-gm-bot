var HTTPS = require('https');
var cool = require('cool-ascii-faces');
var scryfall = require("scryfall-client");

var botID = process.env.BOT_ID;

function respond() {
  var request = JSON.parse(this.req.chunks[0]),
      botRegex = /\[\[.*?]]/g;

  lookups = request.text.match(botRegex);
  if(request.text && botRegex.test(request.text)) {
    for (var index = 0; index < lookups.length; ++index){
      this.res.writeHead(200);
      postMessage(lookups[index].slice(2,-2));
      this.res.end();
    }
    
  } else {
    console.log("don' t care");
    this.res.writeHead(200);
    this.res.end();
  }
}

function postMessage(cardName) {
  var botResponse, options, body, botReq;
  // scryfall.search(cardName).then(function (list) {
  //   list.has_more; // whether or not there is an additional page of results, `true` or `false`
  //   list.total_cards; // the total number of cards returned from search
  
  //   var names = list.map(function (card) {
  //     // the list object can use any Array method
  //     botResponse = card.name;
  //   });
  // });

  // botResponse = cool();
  botResponse = cardName;
  options = {
    hostname: 'api.groupme.com',
    path: '/v3/bots/post',
    method: 'POST'
  };

  body = {
    "bot_id" : botID,
    "text" : botResponse
  };

  console.log('sending ' + botResponse + ' to ' + botID);

  botReq = HTTPS.request(options, function(res) {
      if(res.statusCode == 202) {
        //neat
      } else {
        console.log('rejecting bad status code ' + res.statusCode);
      }
  });

  botReq.on('error', function(err) {
    console.log('error posting message '  + JSON.stringify(err));
  });
  botReq.on('timeout', function(err) {
    console.log('timeout posting message '  + JSON.stringify(err));
  });
  botReq.end(JSON.stringify(body));
}


exports.respond = respond;
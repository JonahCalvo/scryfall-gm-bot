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
  var botResponse, options, body, botReq, image, imgPost;
  scryfall.getCard(cardName, "fuzzyName").then(function (card) {
    console.log(card);
    image = card.getImage();
    botResponse = card.name;

    options = {
      hostname: 'api.groupme.com',
      path: '/v3/bots/post',
      method: 'POST'
    };
    
    // imgOptions = {
    //   hostname: 'image.groupme.com',
    //   path: '/pictures',
    //   method: 'POST',
    //   headers: {
    //     'X-Access-Token': 'pDg7zVk7x08frxZvykdAHSLW6aoi964l0aXzI29o',
    //     'Content-Type': 'image/jpeg',
    //   }
    // }

    // imgPost = HTTPS.request(options, function(res) )

    body = {
      "bot_id" : botID,
      "text" : botResponse,
      "attachments" : [
        {
          "type"  : "image",
          "picture_url"   : image
        }
      ]
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


  });
  
  // botResponse = cool();
  // botResponse = cardName;
  

  

  

  
}


exports.respond = respond;
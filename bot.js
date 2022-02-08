var HTTPS = require('https');
var cool = require('cool-ascii-faces');
var scryfall = require("scryfall-client");
const fetch = require('node-fetch');

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
  var botResponse, options, body, botReq, image;
  options = {
    hostname: 'api.groupme.com',
    path: '/v3/bots/post',
    method: 'POST'
  };
  scryfall.getCard(cardName, "fuzzyName").then(function (card) {
    image = card.getImage();
    botResponse = card.name;

    fetch(image)
      .then(r => r.blob())
      .then(imageBlob => fetch("https://image.groupme.com/pictures", {
        method: 'POST',
        headers: {
          'X-Access-Token': 'pDg7zVk7x08frxZvykdAHSLW6aoi964l0aXzI29o',
          'Content-Type': 'image/jpeg',
        },
        body: imageBlob,
      }).then(response => response.json())
      .then(data => {
        body = {
          "bot_id" : botID,
          "text" : botResponse,
          "attachments" : [
            {
              "type"  : "image",
              "url"   : data.payload.url
            }
          ]
        };

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

      })
      .catch((error) => {
        console.error('Error:', error);
      })
      );
  });
}
exports.respond = respond;
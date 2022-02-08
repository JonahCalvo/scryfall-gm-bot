import HTTPS from 'https';
// var cool = require('cool-ascii-faces');
import scryfall from "scryfall-client";
import fetch from "node-fetch";

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
  scryfall.getCard(cardName, "fuzzyName").then(function (card) {
    image = card.getImage();

    fetch(image)
      .then(r => console.log(r));

    botResponse = card.name;

    options = {
      hostname: 'api.groupme.com',
      path: '/v3/bots/post',
      method: 'POST'
    };
    

    body = {
      "bot_id" : botID,
      "text" : botResponse,
      "attachments" : [
        {
          "type"  : "image",
          "url"   : image
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
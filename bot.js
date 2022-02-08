var HTTPS = require('https'); // Module for making requests that the sample code used
var scryfall = require("scryfall-client"); // Module that makes interacting with scryfall WAY simpler
const fetch = require('node-fetch'); // Module for making requests that I used when the first one scared me

var botID = process.env.BOT_ID; // Grab bot ID from enviroment variables (These are set through Heroku, where the bot runs)
var accessToken = process.env.ACCESS_TOKEN; // Likewise for groupme API access token

// respond() fires whenever a message gets sent (index.js takes care of that).
// this function fires even when the bot sent the message, so be careful for infinite loops! My first version had one lol

function respond() {
  var request = JSON.parse(this.req.chunks[0]); // request holds a JSON of the message that was sent
  var botRegex = /\[\[.*?]]/g;  // This is a regex expression that matches any text between double brackets ( [[ ]] )

  if(request.text) { // if the message has text,
    lookups = request.text.match(botRegex); // Create a list of each match in the message (multiple card lookup works!)
  // However, this will include the brackets. For example, for a message of '[[Bolt]] the [[Bird]]',
  // lookups will be an array containing '[[Bolt]]' and '[[Bird]]'
    for (var index = 0; index < lookups.length; ++index){ // for each word in the list of matches

      this.res.writeHead(200); // write a header for the response (dont worry i dont really get this either)
      postMessage(lookups[index].slice(2,-2)); // slice the first and last two characters off ("[[Bolt]]" becomes "Bolt"),
      // and pass the sliced word to the postMessage function

      this.res.end(); // end the response (also don't get this one)
    }
    
  } else { // if message didn't have text
    console.log("don' t care");
    this.res.writeHead(200);
    this.res.end();
  }
}

function postMessage(cardName) {
  var botResponse, options, body, botReq, image;



  options = { // These are options needed to send something to the GroupMe API.
    hostname: 'api.groupme.com',
    path: '/v3/bots/post',
    method: 'POST'
  };

  // The rest of this method is a series of Asynchronous function calls. Basically this means they will take some time to resolve,
  // so wait for them to return with some kind of data before you continute. I'm not super comfortable with these so this could
  // probably be done a lot cleaner. Not sure.

  // First, we pass the cardName to the Scryfall module, and do a "fuzzyName" search. I think this is what forgives typos.

  scryfall.getCard(cardName, "fuzzyName").then( function (card) { // .then() means we wait for the response, (which is stored in "card"), and continue.
    image = card.getImage(); // card.getImage() returns the scryfall URL for the image. if only we could just send this right now... (thats what my first version did)
    botResponse = card.name; // get the name as well

    fetch(image) // fetch is the 2nd module I imported. You give it a url and it returns the raw bytes stored at that URL. it is async so again we use then()
      .then(r => r.blob()) // from the response, r, we get r.blob(). I think that means the raw data of the image idrk.
      // once we have the blob, we send it to groupme's image hosting API. Rules for that were found here: https://dev.groupme.com/docs/image_service#image_service
      .then(imageBlob => fetch("https://image.groupme.com/pictures", { 
        method: 'POST', // POST requests are for submitting data/forms
        headers: {
          'X-Access-Token': accessToken, // We give our groupme accessToken (if you spam them too much it could get revoked)
          'Content-Type': 'image/jpeg', // And let them know what kind of data we are sending
        },
        body: imageBlob, // Here we pass in the raw image data
      }).then(response => response.json()) // We once again wait for a response from the Groupme Image API
      .then(data => { // The response contains the image URL hosted from GroupMe's servers. We can now construct our bot message
        body = {
          "bot_id" : botID,
          "text" : botResponse,
          "attachments" : [
            {
              "type"  : "image",
              "url"   : data.payload.url // This is where hosted image URL is stored within the response
            }
          ]
        };


        // I didn't need to change the rest of this, this is just the procedure for sending the request we have built
        // The "options" and "body" we created will be sent with some nice error handling.
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
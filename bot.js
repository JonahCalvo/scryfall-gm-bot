// var HTTPS = require('https'); // Module for making requests that the sample code used
// var scryfall = require("scryfall-client"); // Module that makes interacting with scryfall WAY simpler
// const fetch = require('node-fetch'); // Module for making requests that I used when the first one scared me
import * as HTTPS from 'https';
import scryfall from 'scryfall-client'
import fetch from 'node-fetch';
import Authenticator from 'openai-token'

import {ChatGPTUnofficialProxyAPI} from 'chatgpt';

let botID = process.env.BOT_ID; // Grab bot ID from enviroment variables (These are set through Heroku, where the bot runs)
let accessToken = process.env.ACCESS_TOKEN; // Likewise for groupme API access token
let gptID = process.env.GPT_TOKEN;

// respond() fires whenever a message gets sent (index.js takes care of that).
// this function fires even when the bot sent the message, so be careful for infinite loops! My first version had one lol

export function respond() {
    let request = JSON.parse(this.req.chunks[0]); // request holds a JSON of the message that was sent
    let botRegex = /\[\[.*?]]/g;  // This is a regex expression that matches any text between double brackets ( [[ ]] )

    console.log(request)

    if (request.text && request.sender_type !== "bot") { // if the message has text,
        let lookups = request.text.match(botRegex); // Create a list of each match in the message (multiple card lookup works!)
        // However, this will include the brackets. For example, for a message of '[[Bolt]] the [[Bird]]',
        // lookups will be an array containing '[[Bolt]]' and '[[Bird]]'
        let words = request.text.split(" ");
        if ((words.length > 1) && words[0] === "!flavor") {
            let lastword = words.slice(-1)[0];
            if (lastword.charAt(0) === "(" && lastword.slice(-1) === ")") {
                let card = request.text.substring(request.text.indexOf(" ") + 1, request.text.lastIndexOf(" "));
                card = card.replace(/\W/g, '')
                this.res.writeHead(200);
                postFlavor(card, lastword.slice(1, -1));
                this.res.end();
            } else {
                this.res.writeHead(200);
                let card = request.text.substr(request.text.indexOf(" ") + 1)
                card = card.replace(/\W/g, '')
                postFlavor(card);
                this.res.end();
            }
        } else if ((words.length > 1) && words[0] === "!art") {
            let lastword = words.slice(-1)[0];
            if (lastword.charAt(0) === "(" && lastword.slice(-1) === ")") {
                let card = request.text.substring(request.text.indexOf(" ") + 1, request.text.lastIndexOf(" "));
                card = card.replace(/\W/g, '')
                this.res.writeHead(200);
                postArt(card, lastword.slice(1, -1));
                this.res.end();
            } else {
                this.res.writeHead(200);
                let card = request.text.substr(request.text.indexOf(" ") + 1)
                card = card.replace(/\W/g, '')
                postArt(card);
                this.res.end();
            }
        } else if ((words.length > 1) && words[0] === "!price") {
            let lastword = words.slice(-1)[0];
            if (lastword.charAt(0) === "(" && lastword.slice(-1) === ")") {
                let card = request.text.substring(request.text.indexOf(" ") + 1, request.text.lastIndexOf(" "));
                card = card.replace(/\W/g, '')
                this.res.writeHead(200);
                postPrice(card, lastword.slice(1, -1));
                this.res.end();
            } else {
                this.res.writeHead(200);
                let card = request.text.substr(request.text.indexOf(" ") + 1)
                card = card.replace(/\W/g, '')
                postPrice(card);
                this.res.end();
            }
        } else if (lookups) {
            for (let index = 0; index < lookups.length; ++index) { // for each word in the list of matches
                let insideBrackets = lookups[index].slice(2, -2);
                let words = insideBrackets.split(" ");
                let lastword = words.slice(-1)[0];
                if (lastword.charAt(0) === "(" && lastword.slice(-1) === ")") {
                    console.log(lastword);
                    let card = insideBrackets.substring(0, request.text.lastIndexOf(" "));
                    card = card.replace(/\W/g, '')
                    console.log(card);
                    this.res.writeHead(200);
                    postMessage(card, lastword.slice(1, -1));
                    this.res.end();

                } else {

                    this.res.writeHead(200); // write a header for the response (dont worry i dont really get this either)
                    let card = lookups[index].slice(2, -2);
                    card = card.replace(/\W/g, '');
                    postMessage(card); // slice the first and last two characters off ("[[Bolt]]" becomes "Bolt"),
                    // and pass the sliced word to the postMessage function

                    this.res.end(); // end the response (also don't get this one)
                }
            }
        }
    } else { // if message didn't have text
        console.log("don' t care");
        this.res.writeHead(200);
        this.res.end();
    }
}

async function postMessage(cardName, setID = "") {
    let botResponse, options, body, botReq, image;
    options = { // These are options needed to send something to the GroupMe API.
        hostname: 'api.groupme.com',
        path: '/v3/bots/post',
        method: 'POST'
    };

    // The rest of this method is a series of Asynchronous function calls. Basically this means they will take some time to resolve,
    // so wait for them to return with some kind of data before you continute. I'm not super comfortable with these so this could
    // probably be done a lot cleaner. Not sure.

    // First, we pass the cardName to the Scryfall module, and do a "fuzzyName" search. I think this is what forgives typos.
    const card = await scryfall.getCardNamed(cardName, {set: setID});

    image = card.getImage(); // card.getImage() returns the scryfall URL for the image. if only we could just send this right now... (thats what my first version did)
    botResponse = card.card_faces[0].name; // get the name as well
    if (card.card_faces.length > 1) {
        botResponse = botResponse + " //"
    }
    let groupMeURL = await getGroupMeImageFromImageURL(image, accessToken);

    body = {
        "bot_id": botID,
        "text": botResponse,
        "picture_url": groupMeURL
    };

    botReq = HTTPS.request(options, function (res) {
        if (res.statusCode === 202) {
            //neat
        } else {
            console.log('rejecting bad status code ' + res.statusCode);
        }
    });

    botReq.on('error', function (err) {
        console.log('error posting message ' + JSON.stringify(err));
    });
    botReq.on('timeout', function (err) {
        console.log('timeout posting message ' + JSON.stringify(err));
    });
    botReq.end(JSON.stringify(body));


    if (card.card_faces.length > 1) {
        console.log("Card has two sides");
        const backImage = card.card_faces[1].image_uris["normal"];
        console.log(backImage)
        let groupMeURLReverse = await getGroupMeImageFromImageURL(backImage, accessToken);

        body = {
            "bot_id": botID,
            "text": card.card_faces[1].name,
            "picture_url": groupMeURLReverse
        };

        botReq = HTTPS.request(options, function (res) {
            if (res.statusCode === 202) {
                //neat
            } else {
                console.log('rejecting bad status code ' + res.statusCode);
                console.log(res.statusMessage)
            }
        });

        botReq.on('error', function (err) {
            console.log('error posting message ' + JSON.stringify(err));
        });
        botReq.on('timeout', function (err) {
            console.log('timeout posting message ' + JSON.stringify(err));
        });
        botReq.end(JSON.stringify(body));

    }

}

async function getGroupMeImageFromImageURL(image, accessToken) {
    const response = await fetch(image);
    const imageBlob = await response.blob();
    const gmResponse = await fetch("https://image.groupme.com/pictures", {
        method: 'POST',
        headers: {
            'X-Access-Token': accessToken, // We give our groupme accessToken (if you spam them too much it could get revoked)
            'Content-Type': 'image/jpeg', // And let them know what kind of data we are sending
        },
        body: imageBlob, // Here we pass in the raw image data
    });
    const gmResponseJson = await gmResponse.json();
    return gmResponseJson.payload.url;
}


    async function postArt(cardName, setID = "") {
        let options = { // These are options needed to send something to the GroupMe API.
            hostname: 'api.groupme.com',
            path: '/v3/bots/post',
            method: 'POST'
        };

        const card = await scryfall.getCardNamed(cardName, {set: setID});
        let artCropURL;
        if (card.card_faces.length > 1 && cardName.replace(/\W/g, '').toLowerCase() === card.card_faces[1].name.replace(/\W/g, '').toLowerCase()) {
            artCropURL = card.card_faces[1].image_uris["art_crop"];
        } else {
            artCropURL = card.getImage("art_crop");
        }
        const groupMeURL = await getGroupMeImageFromImageURL(artCropURL, accessToken);

        const body = {
            "bot_id": botID,
            "picture_url": groupMeURL
        };

        let botReq = HTTPS.request(options, function (res) {
            if (res.statusCode === 202) {
                //neat
            } else {
                console.log('rejecting bad status code ' + res.statusCode);
                console.log(res.statusMessage)
            }
        });

        botReq.on('error', function (err) {
            console.log('error posting message ' + JSON.stringify(err));
        });
        botReq.on('timeout', function (err) {
            console.log('timeout posting message ' + JSON.stringify(err));
        });
        botReq.end(JSON.stringify(body));

    }

    function postFlavor(cardName, setID = "") {
        var botResponse, options, body, botReq;

        options = { // These are options needed to send something to the GroupMe API.
            hostname: 'api.groupme.com',
            path: '/v3/bots/post',
            method: 'POST'
        };


        scryfall.getCardNamed(cardName, {set: setID}).then(function (card) { // .then() means we wait for the response, (which is stored in "card"), and continue.
            botResponse = card.flavor_text; // get the flavor text

            if (card.card_faces.length > 1 && cardName.replace(/\W/g, '').toLowerCase() === card.card_faces[1].name.replace(/\W/g, '').toLowerCase()) {
                botResponse = card.card_faces[1].flavor_text;
            } else {
                botResponse = card.card_faces[0].flavor_text;
            }

            if (!botResponse) {
                return;
            }
            body = {
                "bot_id": botID,
                "text": botResponse,
            };


            // I didn't need to change the rest of this, this is just the procedure for sending the request we have built
            // The "options" and "body" we created will be sent with some nice error handling.
            botReq = HTTPS.request(options, function (res) {
                if (res.statusCode === 202) {
                    //neat
                } else {
                    console.log('rejecting bad status code ' + res.statusCode);
                }
            });

            botReq.on('error', function (err) {
                console.log('error posting message ' + JSON.stringify(err));
            });
            botReq.on('timeout', function (err) {
                console.log('timeout posting message ' + JSON.stringify(err));
            });
            botReq.end(JSON.stringify(body));
        });
    }

function postPrice(cardName, setID = "") {
    var botResponse, options, body, botReq;

    options = { // These are options needed to send something to the GroupMe API.
        hostname: 'api.groupme.com',
        path: '/v3/bots/post',
        method: 'POST'
    };


    scryfall.getCardNamed(cardName, {set: setID}).then(function (card) { // .then() means we wait for the response, (which is stored in "card"), and continue.
        botResponse = card.name + " (" + card.set_name +
            ")\nRegular:\t" + card.getPrice() + "\nFoil:\t" + card.getPrice("usd_foil");

        if (!botResponse) {
            return;
        }
        body = {
            "bot_id": botID,
            "text": botResponse,
        };


        // I didn't need to change the rest of this, this is just the procedure for sending the request we have built
        // The "options" and "body" we created will be sent with some nice error handling.
        botReq = HTTPS.request(options, function (res) {
            if (res.statusCode === 202) {
                //neat
            } else {
                console.log('rejecting bad status code ' + res.statusCode);
            }
        });

        botReq.on('error', function (err) {
            console.log('error posting message ' + JSON.stringify(err));
        });
        botReq.on('timeout', function (err) {
            console.log('timeout posting message ' + JSON.stringify(err));
        });
        botReq.end(JSON.stringify(body));
    });
}

export async function random() {
    let botResponse, options, body, botReq, image;
    const card = await scryfall.random();
    options = { // These are options needed to send something to the GroupMe API.
        hostname: 'api.groupme.com',
        path: '/v3/bots/post',
        method: 'POST'
    };
    image = card.getImage(); // card.getImage() returns the scryfall URL for the image. if only we could just send this right now... (thats what my first version did)
    botResponse = card.card_faces[0].name; // get the name as well
    if (card.card_faces.length > 1) {
        botResponse = botResponse + " //"
    }
    let groupMeURL = await getGroupMeImageFromImageURL(image, accessToken);

    body = {
        "bot_id": botID,
        "text": botResponse,
        "picture_url": groupMeURL
    };

    botReq = HTTPS.request(options, function (res) {
        if (res.statusCode === 202) {
            //neat
        } else {
            console.log('rejecting bad status code ' + res.statusCode);
        }
    });

    botReq.on('error', function (err) {
        console.log('error posting message ' + JSON.stringify(err));
    });
    botReq.on('timeout', function (err) {
        console.log('timeout posting message ' + JSON.stringify(err));
    });
    botReq.end(JSON.stringify(body));


    if (card.card_faces.length > 1) {
        console.log("Card has two sides");
        const backImage = card.card_faces[1].image_uris["normal"];
        console.log(backImage)
        let groupMeURLReverse = await getGroupMeImageFromImageURL(backImage, accessToken);

        body = {
            "bot_id": botID,
            "text": card.card_faces[1].name,
            "picture_url": groupMeURLReverse
        };

        botReq = HTTPS.request(options, function (res) {
            if (res.statusCode === 202) {
                //neat
            } else {
                console.log('rejecting bad status code ' + res.statusCode);
                console.log(res.statusMessage)
            }
        });

        botReq.on('error', function (err) {
            console.log('error posting message ' + JSON.stringify(err));
        });
        botReq.on('timeout', function (err) {
            console.log('timeout posting message ' + JSON.stringify(err));
        });
        botReq.end(JSON.stringify(body));
    }
}


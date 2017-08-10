// server.js
// where your node app starts

// init project
var express = require('express');
var http = require('http');
var request = require('request');
var bodyParser = require('body-parser');
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

/* For Facebook Validation */
app.get('/webhook', (req, res) => {
  console.log(req.query);
  if (req.query['hub.mode'] == "subscribe" && req.query['hub.verify_token'] == process.env.VERIFY_TOKEN) {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.status(403).end();
  }
});

/* Handling all messenges */
app.post('/webhook', (req, res) => {
  //console.log(req.body);
  if (req.body.object === 'page') {
    req.body.entry.forEach((entry) => {
      entry.messaging.forEach((event) => {
        if (event.message && event.message.text) {
          sendMessage(event);
        }
      });
    });
    res.status(200).end();
  }
});


// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

function sendMessage(event) {
  let sender = event.sender.id;
  let text = event.message.text;

  make_wa_call(text, function(text){
    request({
      url: 'https://graph.facebook.com/v2.6/me/messages',
      qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
      method: 'POST',
      json: {
        recipient: {id: sender},
        message: {text: text}
      }
    }, function (error, response) {
      if (error) {
          console.log('Error sending message: ', error);
      } else if (response.body.error) {
          console.log('Error: ', response.body.error);
      }
    });
  })
}


function make_wa_call(query, callback) {
  
  var wa_url = "http://api.wolframalpha.com/v2/query?format=plaintext&output=JSON&includepodid=Result&appid="+process.env.WOLFRAM_APPID+"&input="+query;
  console.log(wa_url);
  
  http.get(wa_url, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      //console.log('BODY: ' + chunk);
      res=JSON.parse(chunk)
      //console.log(res.queryresult.success);
      //console.log(res.queryresult.didyoumeans.val);
      if(res.queryresult.pods) {
        var ret = res.queryresult.pods[0].subpods[0].plaintext;
        //console.log(ret);
        callback(ret);
      } else {
        callback("Sorry, couldn't find anything");
      }
    });
    res.on('error', function (e) {
      console.log('Error: ' + e);
      callback("Error: "+e);
    });
  }).end();
  
}

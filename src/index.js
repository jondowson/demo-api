// demo-api/src/index.js

// ====================================================
// import the roadshow-demo-api module dependencies
// ====================================================
require('dotenv').config();
const express = require('express');
const pug = require('pug');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dse = require('dse-driver');
const assert = require('assert');
const os = require('os');
const request = require('request');

// ====================================================
// setup protect module to prevent death by over use
// ====================================================
const protectCfg = {
 //production: process.env.NODE_ENV === 'production', // if production is false, detailed error messages are exposed to the client
 clientRetrySecs: 2, // Client-Retry header, in seconds (0 to disable) [default 1]
 sampleInterval: 5, // sample rate, milliseconds [default 5]
 maxEventLoopDelay: 42, // maximum detected delay between event loop ticks [default 42]
 maxHeapUsedBytes: 0, // maximum heap used threshold (0 to disable) [default 0]
 maxRssBytes: 0, // maximum rss size threshold (0 to disable) [default 0]
 errorPropagationMode: false // dictate behavior: take over the response
                             // or propagate an error to the framework [default false]
}
const protect = require('overload-protection')('express', protectCfg)

// ====================================================
// define the express app
// ====================================================
// express is a popular web application framework for nodejs
const app = express();
// adding Helmet to enhance API security
app.use(helmet());
// using bodyParser to parse JSON bodies into JS objects
app.use(express.json());
// enabling CORS security for all requests
app.use(cors());
// adding morgan to enable logging of HTTP requests
app.use(morgan('combined'));
// setting the default view engine for web pages
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
// apply the protect settings
app.use(protect);

// ====================================================
// setup the db connection
// ====================================================
const seedList = process.env.DEMO_API_DSE_SEEDS.split(',');
console.log(seedList);
const client = new dse.Client({ contactPoints: seedList, localDataCenter: process.env.DEMO_API_DSE_LOCALDC });

// ====================================================
// api route: post transaction
// ====================================================
var count = 0;
app.post('/write', function(req, res) {
  var postData = req.body;
  //now = TimeUuid.now();
  const query = "insert into roadshow_demo.shop (trx_id, firstname, lastname, email, price, prod_desc) VALUES (?,?,?,?,?,?)";
  client.execute(query, [ postData.timeuuid, postData.firstname, postData.lastname, postData.email, postData.price, postData.prod_desc ], { prepare: true }, function(err, result) {
    assert.ifError(err);
    count++;
    console.log("inserted: " + count + ' ' + postData.email);
    //res.send(postData);
    res.end("END-WRITE");
  })
});

// ====================================================
// api route: get x transactions
// ====================================================
app.get('/read/:limit', function(req, res) {
  const limit = req.params.limit;
  const query = 'SELECT * FROM roadshow_demo.shop LIMIT ?';
  client.execute(query,[ limit ],{ prepare: true }, function(err, result) {
    assert.ifError(err);
    var trxList = [];
    console.log('result.length ' + result.rows.length)
    for (var i = 0; i < result.rows.length; i++) {
      var trx = {
      'trx_id':result.rows[i].trx_id,
      'firstname':result.rows[i].firstname,
      'lastname':result.rows[i].lastname,
      'email':result.rows[i].email,
      'price':result.rows[i].price,
      'prod_desc':result.rows[i].prod_desc
      };
      trxList.push(trx);
    }
    // display results to web page
    res.render('index', {"trxList": trxList});
    res.end();
  })
});

// ====================================================
// api route: get transactions for a given email
// ====================================================
app.get('/email/:email', function(req, res) {
  const query = 'SELECT * FROM roadshow_demo.shop WHERE email = ?';
  client.execute(query, [ req.params.email ], function(err, result) {
    assert.ifError(err);
    var trxList = [];
    for (var i = 0; i < result.rows.length; i++) {
      var trx = {
      'trx_id':result.rows[i].trx_id,
      'firstname':result.rows[i].firstname,
      'lastname':result.rows[i].lastname,
      'email':result.rows[i].email,
      'price':result.rows[i].price,
      'prod_desc':result.rows[i].prod_desc
      };
      trxList.push(trx);
    }
    // display results to web page
    res.render('index', {"trxList": trxList});
    res.end();
  })
});

// ====================================================
// api route: delete all transactions
// ====================================================
app.get('/deleteall/', function(req, res) {
  const query = 'TRUNCATE table roadshow_demo.shop';
  client.execute(query,function(err, result) {
    assert.ifError(err);
    res.send("END-DELETE");
    res.end();
  })
});

// ====================================================
// api route: return count
// ====================================================
app.get('/count/', function(req, res) {
  const query = 'select count(*) from roadshow_demo.shop';
  client.execute(query,function(err, result) {
    assert.ifError(err);
    res.send(result);
    res.end();
  })
});

// ====================================================
// start the server - warm up each cpu with a call
// ====================================================
app.listen(process.env.DEMO_API_WEBSERVER_PORT, () => {
  console.log('roadshow-demo-api is listening on port: ' + process.env.DEMO_API_WEBSERVER_PORT);
  console.log('warming up the ' + os.cpus().length + ' cpus');
  for (let i = 0; i < 20; i++) {
    request(process.env.DEMO_API_WEBSERVER_URL + ':' + process.env.DEMO_API_WEBSERVER_PORT + '/read/1', function (error, response, body) {
    });
  };
});
module.exports = app;

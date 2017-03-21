var express      = require('express'),
    passport     = require('passport'),
    bodyParser   = require('body-parser'),
    LdapStrategy = require('passport-ldapauth');
var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');

var url = 'mongodb://localhost:27017/myproject';

var insertDocuments = function(db, callback) {
  // Get the documents collection
  var collection = db.collection('documents');
  // Insert some documents
  collection.insertMany([
    {a : 1}, {a : 2}, {a : 3}
  ], function(err, result) {
    assert.equal(err, null);
    assert.equal(3, result.result.n);
    assert.equal(3, result.ops.length);
    console.log("Inserted 3 documents into the collection");
    callback(result);
  });
}

var findDocuments = function(db, callback) {
  // Get the documents collection
  var collection = db.collection('documents');
  // Find some documents
  collection.find({}).toArray(function(err, docs) {
    assert.equal(err, null);
    console.log("Found the following records");
    console.log(docs)
    callback(docs);
  });
}

var OPTS = {
  server: {
    url: 'ldap://localhost:389',
    bindDn: 'cn=admin,dc=example,dc=com',
    bindCredentials: 'secret',
    searchBase: 'dc=example,dc=com',
    searchFilter: '(uid={{username}})'
  }
};

var app = express();

passport.use(new LdapStrategy(OPTS));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "*");
  res.header("Access-Control-Request-Method", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(passport.initialize());

app.post('/login', passport.authenticate('ldapauth', { session: false, successRedirect: 'http://localhost:4200/file-manager', failureRedirect: 'http://localhost:4200?unathourized=true' }), function(req, res) {
  console.log("Login called");
  res.send({status: 'ok'});
});

app.get('/', function(req, res) {
  console.log("Index called");
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end('Index');
});

app.get('/test', function(req, res) {
  console.log("Test called");
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end('Works');
});

app.get('/testdb', function(req, res) {
  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log("\nConnected successfully to db server\n");

    //insertDocuments(db, function() {
      findDocuments(db, function(docs) {
        db.close();
        res.send(JSON.stringify(docs));
      });
    //});
  });
});

app.get('/info', function(req, res) {
  console.log("Info called");
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify({ result: "Info info" }));
});

app.get('/file', function(req, res) {
  var cmd = req.query.cmd;
  var target = req.query.target;

  var cwd = {
    id: 0,
    name: 'test_dir',
    mime: 'directory',
    hash: 'dir_0',
    date: '3/16/2017',
    read: 1,
    write: 1,
    rm: 1,
  };

  if (target == 'dir_3') {
    cwd = {
      id: 3,
      name: 'test_dir_number_2',
      mime: 'directory',
      hash: 'dir_3',
      phash: 'dir_0',
      date: '3/16/2017',
      read: 1,
      write: 1,
      rm: 1,
    };
  }

  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify({
    cwd: cwd,
    files: [
      {
        id: 0,
        name: 'test_dir',
        mime: 'directory',
        hash: 'dir_0',
        date: '3/16/2017',
        read: 1,
        write: 1,
        rm: 1,
      },
      {
        id: 1,
        name: 'test_file.png',
        mime: 'image/png',
        hash: 'file_1',
        phash: 'dir_0',
        date: '3/16/2017',
        read: 1,
        write: 1,
        rm: 1,
        size: 1000,
      },
      {
        id: 3,
        name: 'test_dir_number_2',
        mime: 'directory',
        hash: 'dir_3',
        phash: 'dir_0',
        date: '3/16/2017',
        read: 1,
        write: 1,
        rm: 1,
      },
      {
        id: 2,
        name: 'test_file_number_2.png',
        mime: 'image/png',
        hash: 'file_2',
        phash: 'dir_0',
        date: '3/16/2017',
        read: 1,
        write: 1,
        rm: 1,
        size: 1000,
      },
      {
        id: 4,
        name: 'test_file_number_3.png',
        mime: 'image/png',
        hash: 'file_4',
        phash: 'dir_3',
        date: '3/16/2017',
        read: 1,
        write: 1,
        rm: 1,
        size: 1000,
      }
    ],
  }));
});

console.log("\nServer started");
app.listen(8080);

var express      = require('express'),
    passport     = require('passport'),
    bodyParser   = require('body-parser'),
    LdapStrategy = require('passport-ldapauth');
var MongoClient  = require('mongodb').MongoClient,
    assert       = require('assert');
var fs           = require('fs');
var path         = require('path');
var multer       = require('multer');
var _            = require('underscore');
var im           = require('imagemagick');
var https        = require('https');
var cookieParser = require('cookie-parser');

var storage = multer.diskStorage({
  destination: 'uploads/',

  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

var upload = multer({
  storage: storage,

  fileFilter: function (req, file, cb) {
    MongoClient.connect(url, function(err, db) {
      fileExists(db, req.body.target, file.originalname, function(found) {
        db.close();

        if (found) {
          cb(new Error('File already exists'));
        } else {
          cb(null, true);
        }
      });
    });
  }
});

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

var insertFile = function(db, target, file, callback) {
  var files = db.collection('files');
  var dt = new Date();

  files.insert({
    date: (dt.getMonth() + 1) + "/" + dt.getDate() + "/" + dt.getFullYear(),
    mime: file.mimetype,
    hash: (file.mimetype == "directory" ? "dir_" : "file_") + file.originalname,
    phash: target,
    name: file.originalname,
    size: file.size,
    tmb: 'https://404notfound.tech:8080/tmb/' + file.originalname,
    read: 1, write: 1, rm: 1,
  }, function(err, result) {
    assert.equal(err, null);

    console.log("Inserted 1 file into the collection");
    console.log(result);
    callback(result);
  });
}

var fileExists = function(db, target, name, callback) {
  var collection = db.collection('files');
  var error = false;

  collection.find({ phash: target, name: name }).toArray(function(err, docs) {
    assert.equal(err, null);

    console.log("\nFound the following records");
    console.log(docs);

    if (docs.length > 0) {
      callback(true);
    } else {
      callback(false);
    }
  });
}

var findDocuments = function(db, callback) {
  // Get the documents collection
  var collection = db.collection('documents');
  // Find some documents

  collection.find({}).toArray(function(err, docs) {
    assert.equal(err, null);

    console.log("Found the following records");
    console.log(docs);
    callback(docs);
  });
}

var searchFiles = function(db, q, callback) {
  var collection = db.collection('files');

  collection.find({ name: new RegExp(q, 'g') }).toArray(function(err, docs) {
    assert.equal(err, null);

    console.log("Found the following files");
    console.log(docs);
    callback(docs);
  });
}

var openDirectory = function(db, target, userLevel, callback) {
  var collection = db.collection('files');

  collection.find({}).toArray(function(err, docs) {
    var groups = {};
    var cwd;

    //divides files based on hashes and mimes in an object
    docs.forEach(function(file) {
      if (file.mime === 'directory' && !groups[file.hash]) {
        groups[file.hash] = [];
      }

      //phash is hash of parent directory
      if (file.phash) {
        if (!groups[file.phash]) {
          groups[file.phash] = { directory: [] };
        }

        if (!groups[file.phash][file.mime]) {
          groups[file.phash][file.mime] = [];
        }

        groups[file.phash][file.mime].push(file);
      }

      if (file.hash === target) {
        cwd = file;
      }
    });

    var sortedFiles = cwd ? [cwd] : [];

    if (groups[target]) {
      Object.keys(groups[target]).forEach(function(key) {
        sortedFiles.push.apply(sortedFiles, _.sortBy(groups[target][key], 'name'));
      });
    }

    cwd.read = cwd.write = cwd.rm = 0;

    switch(userLevel) {
      case 1:
        cwd.read = 1;
        sortedFiles.forEach(function(file) {
          file.read = 1; file.write = 0; file.rm = 0;
        });
        break;
      case 2:
        cwd.read = 1; cwd.write = 1;
        sortedFiles.forEach(function(file) {
          file.read = 1; file.write = 1; file.rm = 0;
        });
        break;
      case 3:
        cwd.read = 1; cwd.write = 1; cwd.rm = 1;
        sortedFiles.forEach(function(file) {
          file.read = 1; file.write = 1; file.rm = 1;
        });
        break;
    }

    callback({
      cwd: cwd,
      files: sortedFiles
    });
  });
}

var removeFiles = function(db, targets, callback) {
  var collection = db.collection('files');

  collection.find({ hash: { $in: targets } }).toArray(function(err, docs) {
    collection.remove({ hash: { $in: targets } }).then(function(result) {
      console.log("removing files from db: " + result);
    });

    docs.forEach(function(file) {
      fs.unlink('uploads/' + file.name, function(err) {
        if (err) throw err;
        console.log(file.name + " deleted");
      });

      if (file.mime.split('/')[0] == 'image') {
        fs.unlink('uploads/tmb/' + file.name, function(err) {
          if (err) throw err;
          console.log(file.name + " deleted");
        });
      }
    });

    callback({ removed: targets });
  });
}

var renameFile = function(db, target, name, callback) {
  var collection = db.collection('files');

  collection.findOne({ hash: target }).then(function(file) {
    collection.update({ hash: target }, { $set: { name: name } }).then(function(result) {
      console.log("updating item in db: " + result);
    });

    fs.rename('uploads/' + file.name, 'uploads/' + name, function(err) {
      if (err) throw err;

      fs.stat('uploads/' + name, function(err, stats) {
        if (err) throw err;

        console.log('stats: ' + JSON.stringify(stats));
      });
    });

    fs.rename('uploads/tmb/' + file.name, 'uploads/tmb/' + name, function(err) {
      if (err) throw err;

      fs.stat('uploads/tmb/' + name, function(err, stats) {
        if (err) throw err;

        console.log('stats: ' + JSON.stringify(stats));
      });
    });
  });
}

var pasteFiles = function(db, opts, callback) {
  var collection = db.collection('files');

  collection.update({ hash: { $in: opts.targets }, phash: opts.src }, { $set: { phash: opts.dst } }).then(function(result) {
    console.log("updating item in db: " + result);

    callback(result);
  });
}

var getFile = function(db, hash, callback) {
  var collection = db.collection('files');

  collection.findOne({ hash: hash }).then(function(result) {
    console.log("retried file: " + JSON.stringify(result));
    callback(result);
  });
}

var OPTS = {
  server: {
    url: 'ldap://404notfound.tech/404ldap',
    bindDn: 'cn=admin, dc=404notfound, dc=tech',
    bindCredentials: 'n1^e#$jF#nU#N9iq',
    searchBase: 'dc=404notfound,dc=tech',
    searchFilter: '(uid={{username}})'
  }
};

var app = express();
var port = 8080;
var options = {
  key: fs.readFileSync('./key.pem', 'utf8'),
  cert: fs.readFileSync('./cert.pem', 'utf8'),
  passphrase: 'admin',
};

passport.use(new LdapStrategy(OPTS));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "*");
  res.header("Access-Control-Request-Method", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-csrf-token");
  next();
});

app.use('tmb', express.static(__dirname + '/uploads/tmb'));
app.use(bodyParser.json() );
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(function(req, res, next) {
  res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  next();
});

app.use(require('express-session')({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true },
}));

app.use(passport.initialize());
app.use(passport.session());

app.get('/', function(req, res) {
  if (req.user) {
    res.redirect('/file-manager');
  } else {
    res.sendFile('/node_server/404-teamnotfound/server/ldapauth/index.html');
  }
});

app.use(express.static(__dirname + '/ldapauth'));

passport.serializeUser(function(user, done) {
  console.log('\n\n\n' + JSON.stringify(user) + '\n\n\n');
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  console.log('\n\n\n' + JSON.stringify(user) + '\n\n\n');
  done(null, user);
});

app.post('/login', passport.authenticate('ldapauth', {
  successRedirect: '/file-manager',
  failureRedirect: '/?unathourized=true',
}));

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

app.get('/openfile/:hash', function(req, res) {
  console.log(req.params);

  MongoClient.connect(url, function(err, db) {
    getFile(db, req.params.hash, function(result) {
      var path = __dirname + "/uploads/" + result.name;
      res.sendfile(path);
    });
  });
});

var up = upload.array('upload[]');
app.post('/file', function(req, res) {
  up(req, res, function (err) {
    if (err) {
      console.log(err.message);
      return res.status(500).end(err.message);
    }

    if (req.files[0].mimetype.split('/')[0] == 'image') {
      var filePath = __dirname + "/uploads/" + req.files[0].filename;
      var thumbPath = __dirname + "/uploads/tmb/" + req.files[0].filename;

      im.resize({
        srcPath: filePath,
        dstPath: thumbPath,
        width: 200,
      }, function(err, stdout, stderr) {
        if (err) throw err;
        console.log('\nresized image to fit within 200x200px\n');
      });
    }

    MongoClient.connect(url, function(err, db) {
      insertFile(db, req.body.target, req.files[0], function() {
        db.close();
        res.send();
      });
    });
  });
});

app.get('/file', function(req, res) {
  var cmd = req.query.cmd;
  var target = req.query.target;

  console.log('\n\n\n' + JSON.stringify(req.user));

  var userLevel = req.user.dn.split('cn=all');
  if (userLevel.length == 1) {
    userLevel = req.user.dn.split('cn=write');
    if (userLevel.length == 1) {
      userLevel = req.user.dn.split('cn=read');
      if (userLevel.length == 1) {
        res.redirect('https://404notfound.tech:8080/?unathourized=true');
      } else {
        userLevel = 1;
      }
    } else {
      userLevel = 2;
    }
  } else {
    userLevel = 3;
  }

  console.log('Userlevel: ' + userLevel + '\n\n\n');

  switch(cmd) {
    case "open":
      MongoClient.connect(url, function(err, db) {
        openDirectory(db, target, userLevel, function(result) {
          console.log('cmd=open retrieved:');
          console.log(result);
          res.setHeader("Content-Type", "application/json");
          res.send(JSON.stringify(result));
        });
      });
      break;

    case "rm":
      var targets = req.query.targets;

      MongoClient.connect(url, function(err, db) {
        removeFiles(db, targets, function(result) {
          console.log('cmd=rm removed:');
          console.log(result);
          res.setHeader("Content-Type", "application/json");
          res.send(JSON.stringify(result));
        });
      });
      break;

    case "rename":
      var name = req.query.name;

      MongoClient.connect(url, function(err, db) {
        renameFile(db, target, name, function(result) {
          console.log('cmd=rename renamed:');
          console.log(result);
          res.setHeader("Content-Type", "application/json");
          res.send(JSON.stringify(result));
        });
      });
      break;

    case "paste":
      var dst = req.query.dst;
      var targets = req.query.targets;
      var src = req.query.src;

      MongoClient.connect(url, function(err, db) {
        pasteFiles(db, { dst: dst, targets: targets, src: src }, function(result) {
          console.log('cmd=rename renamed:');
          console.log(result);
          res.setHeader("Content-Type", "application/json");
          res.send(JSON.stringify(result));
        });
      });
      break;

    case "file":
      var file = __dirname + '/uploads/back_button.png';
      res.download(file, 'back_button.png');
      break;

    case "search":
      var q = req.query.q;
      MongoClient.connect(url, function(err, db) {
        searchFiles(db, q, function(result) {
          res.setHeader("Content-Type", "application/json");
          res.send(JSON.stringify({ files: result }));
        });
      });
      break;
  }
});

app.get('/tmb/:name', function(req, res) {
  console.log('/node_server/404-teamnotfound/server/uploads/tmb/' + req.params.name);
  res.sendFile('/node_server/404-teamnotfound/server/uploads/tmb/' + req.params.name);
});

app.get('/file-manager', function(req, res) {
  if (req.user) {
    res.sendFile('/node_server/404-teamnotfound/server/ldapauth/index.html');
  } else {
    res.redirect('/?unathourized=true');
  }
});

app.get('/logout', function(req, res) {
  req.logOut();
  req.session.destroy(function() {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

app.get('*', function(req, res) {
  res.sendFile('/node_server/404-teamnotfound/server/ldapauth/index.html');
});

var server = https.createServer(options, app).listen(port, function(){
  console.log("\nExpress server listening on port " + port);
});

exports = module.exports = app;

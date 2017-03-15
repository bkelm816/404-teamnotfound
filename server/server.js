var express      = require('express'),
    passport     = require('passport'),
    bodyParser   = require('body-parser'),
    LdapStrategy = require('passport-ldapauth');

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
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
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
});

app.get('/test', function(req, res) {
  console.log("Test called");
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end('Works');
});

app.get('/info', function(req, res) {
  console.log("Info called");
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify({ result: "Info info" }));
});

console.log("Server started\n");
app.listen(8080);

To run the server, use the command "nodejs server.js" while in this directory.<br>
If packages are missing, just use "npm install".
<br>
<br>
Make sure to change the following lines accordingly:<br>
<br>
*In server.js
```
var OPTS = {
  server: {
    url: 'ldap://localhost:389', //put your ldap server url here
    bindDn: 'cn=admin,dc=example,dc=com',   //admin login here
    bindCredentials: 'secret',  //admin password here
    searchBase: 'dc=example,dc=com',  //the ldap server domain
    searchFilter: '(uid={{username}})'  //leave as it is
  }
};
```

*In config/environment.js of the ember app:
```
contentSecurityPolicy: {
      'connect-src': "'self' http://192.168.56.101:8080" //put your nodejs server's host machine ip here, probably localhost:port, but since I used virtualbox, I used its ip
},
```

*In app/templates/index.hbs of the ember app:
```
<form action="http://192.168.56.101:8080/login" method="POST">  //just change the ip in this line to that of the nodejs server
  <div>
    <input name="username" placeholder="username" />
  </div>
  <div>
    <input name="password" placeholder="password" />
  </div>
  <div>
    <input type="submit" value="Login" />
  </div>
  <div>
    {{if unathourized "Login failed" ""}}
  </div>
</form>
```

var named = require('./lib/index');
var server = named.createServer();
var ttl = 300;
var rebind = {};
var app = require('express')();
var httpserver = require('http').Server(app);
var io = require('socket.io')(httpserver);
var gsocket = {};

httpserver.listen(80);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
	var randDomain = getRandomDomain(5);
	socket.emit('randomDomain', { domain: randDomain });
	gsocket[randDomain] = socket;
 	socket.on('disconnect',function(){
 		delete gsocket[randDomain];
 		console.log('disconnect');
  });
});

function getRandomDomain(len){
	return Math.random().toString(36).substr(13-len)+'.dnslog.io';
}

server.listen(53, '127.0.0.1', function() {
	console.log('DNS server started on port 53');
});

server.on('query', function(query) {
	var domain = query.name();
	console.log('DNS Query: %s', domain)
	if(domain == 'rebind.test.com'){
		if(typeof(rebind.times) == 'undefined'){
			rebind.times = 1;
			var record = new named.ARecord('127.0.0.1');
			query.addAnswer(domain, record, 0);
			server.send(query);
		}else{
			var record = new named.ARecord('8.8.8.8');
			query.addAnswer(domain, record, 0);
			server.send(query);
			rebind.times ++;
		}

	}else{
		var record = new named.ARecord('127.0.0.1');
		query.addAnswer(domain, record, ttl);
		server.send(query);
		if(domain.split('.').length > 2 ){
			var qdomainArr = domain.split('.').slice(-3);
			var qdomain = qdomainArr[0]+'.'+qdomainArr[1]+'.'+qdomainArr[2];
			console.log(qdomain);
			gsocket[qdomain].emit('dnslog',{dnslog:domain});		
		}
	}
});
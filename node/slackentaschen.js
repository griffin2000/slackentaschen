
var dgram = require('dgram');
var utf8 = require('utf8');

/*
var Bot = require('slackbots');


console.log(Bot)

// create a bot
var settings = {
    token: 'xoxb-236081692178-B2fvuFjNLhTkXkJL1VwE5Wux',
    name: 'slackentaschen'
};
var bot = new Bot(settings);
console.log(bot)

bot.on('start', function() {
	console.log("started");
    bot.postMessageToChannel('ft', 'Hello channel!');
});

bot.on('error', function(err) {
	console.log("Error:"+err);
    
});
bot.on('message', function(msg) {
	if(msg.type=="message")
	{
		console.log("Channel:"+msg.channel);
		console.log("Text:"+msg.text);
		
	}
    
});
*/

function nodeslack(ftPort,ftHost,width,height) {
	ftPort = ftPort||1337;
	ftHost = ftHost||'ft';

	width = width||45
	height = width||35
	
	var ns = {}
	
	
	var header = "P6\n"+width+" "+height+"\n255\n";
	var footer = "0\n0\n15\n";
	var bufferLen = width * height * 3 + header.length + footer.length

	var headerUTF8 = utf8.encode(header)
	var footerUTF8 = utf8.encode(footer)


	ns.width = width
	ns.height = height

	ns.message = new Buffer(bufferLen);
	for(var i=0;i<header.length;i++)
		ns.message.writeInt8(headerUTF8.charCodeAt(i),i);

	var footerOffset = ns.message.length-footer.length;
	for(var i=0;i<footer.length;i++)
		ns.message.writeInt8(footerUTF8.charCodeAt(i),footerOffset+i);

	for(var i=0;i<height;i++)
	{
		for(var j=0;j<width;j++)
		{
			var pixelOffset =  i*width+j
			var offset = pixelOffset*3 + header.length;
			ns.message.writeUInt8(0,    offset+0)
			ns.message.writeUInt8(255,  offset+1)
			ns.message.writeUInt8(0,    offset+2)
		}
	}

	ns.client = dgram.createSocket('udp4', (ev) => {
		console.log("Event:"+ev);
	});
	
	ns.client.send(ns.message, 0, ns.message.length, ftPort, ftHost, function(err, bytes) {
		if (err) throw err;
		console.log('UDP message sent to ' + ftHost +':'+ ftPort);

	});
	
	
	ns.client.on('error', (err) => {
	  console.log(`dgram error:\n${err.stack}`);
	  ns.client.close();
	});

	

	
	ns.send = function()
	{
		
		ns.client.send(ns.message, 0, ns.message.length, ftPort, ftHost, function(err, bytes) {
			if (err) 
			{
				console.log('Error' + err);
				throw err;
			}
			console.log('UDP message sent to ' + ftHost +':'+ ftPort);
		});		
	}
	
	ns.close = function()
	{
		ns.client.close()
	}
	
	ns.setPixel = function(x,y,r,g,b)
	{
		
			var pixelOffset =  y*width+x
			var offset = pixelOffset*3 + header.length;
			ns.message.writeUInt8(r,    offset+0)
			ns.message.writeUInt8(g,    offset+1)
			ns.message.writeUInt8(b,    offset+2)		
			
	}	
	
	return ns;
}



var ns = nodeslack(1337,"localhost")

console.log(ns)



ns.send();


function loopFunc(cb,fps)
{
	cb();
	setTimeout(function(){ 
		loopFunc(cb);
	}, 1000.0/fps);
}

loopFunc( () => {
	
for(var i=0;i<ns.height;i++)
{
	for(var j=0;j<ns.width;j++)
	{
		ns.setPixel(i,j,255,0,0);
	}
}
	ns.send();
});

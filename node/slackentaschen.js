
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
	
	ns.setPixel = function(x,y,pixel)
	{
		
			var pixelOffset =  y*width+x
			var offset = pixelOffset*3 + header.length;
			ns.message.writeUInt8(pixel[0],    offset+0)
			ns.message.writeUInt8(pixel[1],    offset+1)
			ns.message.writeUInt8(pixel[2],    offset+2)		
			
	}	
	ns.getPixel = function(x,y)
	{
		
			var pixelOffset =  y*width+x
			var offset = pixelOffset*3 + header.length;
			var pixel = [0,0,0];
			pixel[0] = ns.message.readUInt8(offset+0)
			pixel[1] = ns.message.readUInt8(offset+1)
			pixel[2] = ns.message.readUInt8(offset+2)
			
			return pixel;
			
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
var stModule = {}

stModule.beginFrame = (time) => {
	var v0 = 0.5*Math.sin(time*0.001)+0.5;
	var v1 = 0.5*Math.cos(time*0.001)+0.5;
	stModule.i0 = Math.floor(255*v0);
	stModule.i1 = Math.floor(255*v1);	
}

stModule.evalPixel = (x,y,pixel) => {
	pixel[0]=255;
	pixel[1]=stModule.i0;
	pixel[2]=stModule.i1;
	
	return true;
}


loopFunc( () => {
	var d = new Date();
	var n = d.getTime();
	stModule.beginFrame(n)
	for(var i=0;i<ns.height;i++)
	{
		for(var j=0;j<ns.width;j++)
		{
			var pixel = ns.getPixel(i,j);
			if(stModule.evalPixel(i,j,pixel))
				ns.setPixel(i,j,pixel);
		}
	}
	ns.send();
});

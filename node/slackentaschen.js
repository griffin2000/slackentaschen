
const dgram = require('dgram');
const utf8 = require('utf8');
const {execFile} = require('child_process');
const gifsicle = require('gifsicle');
const download = require('download-file')
const https = require('https');
const fs = require('fs');
var getPixels = require("get-pixels")

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




 
var url = "https://media.giphy.com/media/ehN2xJKYE1HGM/giphy.gif";


function loadScaledGIF(url,width,height,name,loadedCB)
{
	var name = name || "downloaded"
	var inFile = name+".gif";
	var outFile = name+"-processed.gif";
	
	var inPath = './tmp/'+inFile
	var outPath = './tmp/'+outFile;
	
	var options = {
		directory: "./tmp/",
		filename: inFile
	}
	console.log("Downloading "+url)
		
	download(url, options, function(err){
		if (err) throw err
		console.log(url+" downloaded as "+inPath)
			
		execFile(gifsicle, ['-o', outPath, inPath, '--resize','45x35' ,'--resize-method','catrom'], err => {
			if (err) throw err
			console.log('Image minified as '+outPath);
			
			
			getPixels(outPath, function(err, pixels) {
			  if(err) throw err
			  loadedCB(pixels)
			})

		});

	}); 
	
}

var stModule = undefined

loadScaledGIF(url,45,35,"downloaded", (pixels)=>{
		console.log(pixels)
		stModule = {}
		stModule.pixels = pixels;
		stModule.frame = 0;
		stModule.fps = 5;
		stModule.numFrames = stModule.pixels.shape[0] 
		stModule.beginFrame = (time) => {
				/*
				var v0 = 0.5*Math.sin(time*0.001)+0.5;
				var v1 = 0.5*Math.cos(time*0.001)+0.5;
				stModule.i0 = Math.floor(255*v0);
				stModule.i1 = Math.floor(255*v1);	
				*/
				console.log(time+" "+stModule.fps+" "+stModule.numFrames+" "+stModule.frame)
				stModule.frame = ~~(time*stModule.fps) % stModule.numFrames;
				
		}

		stModule.evalPixel = (x,y,pixel) => {
			
				
			pixel[0]=stModule.pixels.get(stModule.frame,x,y,0);
			pixel[1]=stModule.pixels.get(stModule.frame,x,y,1);
			pixel[2]=stModule.pixels.get(stModule.frame,x,y,2);

			return true;
		}
			
		
});



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



var startTime=-1;
loopFunc( () => {
	if(!stModule)
		return;
	
	var d = new Date();
	var n = d.getTime();
	if(startTime<0)
		startTime = n;
	stModule.beginFrame((n-startTime)/1000.0)
	for(var i=0;i<ns.height;i++)
	{
		for(var j=0;j<ns.width;j++)
		{
			var pixel = ns.getPixel(i,j);
			pixel.getPixel  = ns.getPixel
			pixel.getNeighbor = (x,y) => { return ns.getPixel(i+x,j+y); }
			
			if(stModule.evalPixel(i,j,pixel))
				ns.setPixel(i,j,pixel);
		}
	}
	ns.send();
});


import execjs
import urllib.request
import io
from PIL import Image, ImageSequence

def headersToDict(hdrList):
    hdrDict={}
    for (name,val) in hdrList:
        hdrDict[name]=val
    return hdrDict

postFixJS = """


    function runCommand(w,h,frameBuffer,frameIdx) {
        var newFramebuffer = []
        for(var i=0;i<w;i++)
        {
            for(var j=0;j<h;j++)
            {
                var pixelOffset = (i+j*w)*3;
                var r = frameBuffer[pixelOffset+0];
                var g = frameBuffer[pixelOffset+1];
                var b = frameBuffer[pixelOffset+2];
                newPixel = pixel(i,j,r,g,b,w,h,frameIdx);
                newFramebuffer[pixelOffset+0] = newPixel[0];
                newFramebuffer[pixelOffset+1] = newPixel[1];
                newFramebuffer[pixelOffset+2] = newPixel[2];
            }
        }
        return newFramebuffer;
    }
"""
class Command(object):

    def __init__(self, width, height):
        self.frames=[]
        self.width=width
        self.height=height
        self.frameBuffer = [0] * width * height * 3
        self.end()

    def begin(self, cmd, toks, entry):
        self.source = entry["text"] + postFixJS

        try:
            self.ctx = execjs.compile(self.source)
            if(self.ctx==None):
                return (False,"Failed to create javascript function: \n{}".format(self.source))
            self.ctx.call("runCommand",self.width,self.height,self.frameBuffer,0)
        except Exception as error:
            return (False,"Failed to create javascript function: \n{}".format(error))
        return (True,"Created javascript function\n{}".format(self.source))


    def end(self):
        self.source=""
        self.ctx=None

    def draw(self, flaschen_conn,frameIdx):
        if(frameIdx==0):
            for i in range(0,self.width):
                for j in range(0,self.height):
                    r,g,b = flaschen_conn.get(i,j)
                    self.frameBuffer[(i+j*self.width)*3+0] = r
                    self.frameBuffer[(i+j*self.width)*3+1] = g
                    self.frameBuffer[(i+j*self.width)*3+2] = b
        self.frameBuffer = self.ctx.call("runCommand",self.width,self.height,self.frameBuffer,frameIdx)
        for i in range(0,self.width):
            for j in range(0,self.height):
                r = self.frameBuffer[(i+j*self.width)*3+0]
                g = self.frameBuffer[(i+j*self.width)*3+1]
                b = self.frameBuffer[(i+j*self.width)*3+2]
                flaschen_conn.set(i,j,(int(r),int(g),int(b)))

    
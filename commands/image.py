import urllib.request
import io
from PIL import Image, ImageSequence

def headersToDict(hdrList):
    hdrDict={}
    for (name,val) in hdrList:
        hdrDict[name]=val
    return hdrDict


class Command(object):

    def __init__(self, width, height):
        self.frames=[]
        self.width=width
        self.height=height

    def begin(self, cmd, toks, entry):
        tok=cmd
        url=""
        while (len(tok)):
            tok = toks.get_token()
            if(tok!=">"):
                url += tok
         
        try:       
            with urllib.request.urlopen(url) as response:
                data = response.read()
                hdr = headersToDict(response.getheaders())
                type = hdr["Content-Type"]
                fileData = io.BytesIO(data)
                if(type=='image/gif' or type=='image/jpg' or type=='image/png'):                
                    img = Image.open(fileData)
                    imgIter = ImageSequence.Iterator(img)

                    for frame in imgIter:

                        imgResized = frame.resize((self.width,self.width), Image.ANTIALIAS) 
                        imgResizedConv = imgResized.convert("RGBA") 
                        self.frames.append(imgResizedConv.load())
                    return (True,"Loaded image {} with {} frames".format(url,len(self.frames)))
                return (False,"Could not load image of type {}".format(type))
        except urllib.error.URLError as err:
            return (False,"Could not load URL {}: {}".format(url,err))

    def end(self):
        self.frames=[]

    def draw(self, flaschen_conn,frameIdx):
        frameIdx = frameIdx%len(self.frames)
        pixels=self.frames[frameIdx]

        for i in range(0,self.width):
            for j in range(0,self.width):
                (r,g,b,a) = pixels[(i,j)]
                if(a>5):
                    flaschen_conn.set(i,j,(r,g,b))
                else:
                    flaschen_conn.set(i,j,(0,0,0))


    
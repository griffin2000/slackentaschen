import os
import json
import flaschen
import shlex
import time
import sys
from slackclient import SlackClient
import urllib.request
import io
from PIL import Image, ImageSequence

slack_token = os.environ["SLACK_API_TOKEN"]
sc = SlackClient(slack_token)

host = os.getenv("FT_HOST","ft")
port = int(os.getenv("FT_PORT","1337"))
display_width = int(os.getenv("FT_WIDTH","45"))
display_height = int(os.getenv("FT_HEIGHT","35"))

flaschen_conn = flaschen.Flaschen(host,port,display_width,display_height, layer=15)

shouldExit=False

lastTS = 0

hist = (sc.api_call(
    "channels.history",
    channel="C64EV2S2E"
))
messages=hist["messages"]
for i,entry in enumerate(messages):
    currTS = float(entry["ts"])
    if(lastTS<currTS):
        lastTS=currTS
print(lastTS)


def headersToDict(hdrList):
    hdrDict={}
    for (name,val) in hdrList:
        hdrDict[name]=val
    return hdrDict

while(not shouldExit):

    hist = (sc.api_call(
        "channels.history",
        channel="C64EV2S2E",
        oldest=lastTS+0.00001,
    ))
    messages=hist["messages"]

    if(len(messages)>0):
        print("Got {} messages (timestamp:{})".format(len(messages),lastTS))
    for i,entry in enumerate(messages):

        currTS = float(entry["ts"])
        if(lastTS<currTS):
            lastTS=currTS
            text = entry["text"]
            toks = shlex.shlex(text)
            cmd = toks.get_token()
            print(cmd)
            if(cmd=="<"):
                tok=cmd
                url=""
                print(text)
                while (len(tok)):
                    tok = toks.get_token()
                    if(tok!=">"):
                        url += tok
                
                print(url)
                with urllib.request.urlopen(url) as response:
                    data = response.read()
                    hdr = headersToDict(response.getheaders())
                    print(hdr)
                    type = hdr["Content-Type"]
                    fileData = io.BytesIO(data)
                    if(type=='image/gif' or type=='image/jpg' or type=='image/png'):                
                        print(len(data))
                        img = Image.open(fileData)
                        imgIter = ImageSequence.Iterator(img)
                        frames = []
                        for frame in imgIter:

                            imgResized = frame.resize((display_width,display_height), Image.ANTIALIAS) 
                            imgResizedConv = imgResized.convert("RGBA") 
                            frames.append(imgResizedConv)
                        if(len(frames)==1):
                            for frame in frames:
                                pixels = frame.load()
                                for i in range(0,display_width):
                                    for j in range(0,display_height):
                                        (r,g,b,a) = pixels[(i,j)]
                                        if(a>5):
                                            flaschen_conn.set(i,j,(r,g,b))
                                        else:
                                            flaschen_conn.set(i,j,(0,0,0))
                                flaschen_conn.send()
                        else:
                            for loopIdx in range(0,10):
                                for frame in frames:
                                    pixels = frame.load()
                                    for i in range(0,display_width):
                                        for j in range(0,display_height):
                                            (r,g,b,a) = pixels[(i,j)]
                                            if(a>5):
                                                flaschen_conn.set(i,j,(r,g,b))
                                            else:
                                                flaschen_conn.set(i,j,(0,0,0))
                                    flaschen_conn.send()
                                    time.sleep(0.1)
            if(cmd=="color"):
                print("{} {}".format(1,text))	
    
                r = int(toks.get_token())
                g = int(toks.get_token())
                b = int(toks.get_token())
                for i in range(0,display_width):
                    for j in range(0,display_height):
                        flaschen_conn.set(i,j,(r,g,b))

                flaschen_conn.send()

    time.sleep(0.25)

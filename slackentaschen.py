import os
import json
import flaschen
import shlex
import time
import sys
import threading
import importlib

import sys
is_py2 = sys.version[0] == '2'
if is_py2:
    import Queue as queue
else:
    import queue as queue

from slackclient import SlackClient

import commands.image

import pkgutil



class SlackThread(threading.Thread):
    def __init__(self):
        threading.Thread.__init__(self)
        self.slack_token = os.environ["SLACK_API_TOKEN"]
        self.sc = SlackClient(self.slack_token)     

        self.channelId = "C64EV2S2E"
        self.lastTS = 0
        self.cmdQueue = queue()

        hist = (self.sc.api_call(
            "channels.history",
            channel=self.channelId
        ))
        messages=hist["messages"]
        for i,entry in enumerate(messages):
            currTS = float(entry["ts"])
            if(self.lastTS<currTS):
                self.lastTS=currTS
        self.shouldExit=False

    def run(self):
        while(not self.shouldExit):
            hist = (self.sc.api_call(
                "channels.history",
                channel=self.channelId,
                oldest=self.lastTS+0.00001,
            ))
            messages=hist["messages"]

    
            for i,entry in enumerate(messages):

                currTS = float(entry["ts"])        
            
                if(self.lastTS<currTS):
                    self.lastTS=currTS
                    self.cmdQueue.put(entry)
            time.sleep(0.25)            
    def getCommands(self):
        return self.cmdQueue

host = os.getenv("FT_HOST","ft")
port = int(os.getenv("FT_PORT","1337"))
display_width = int(os.getenv("FT_WIDTH","45"))
display_height = int(os.getenv("FT_HEIGHT","35"))

flaschen_conn = flaschen.Flaschen(host,port,display_width,display_height, layer=15)

shouldExit=False
importlib.import_module("commands.color")
foo =commands.color.Command(display_width,display_height)
commandClasses = {}
for importer, modname, ispkg in pkgutil.walk_packages(path=commands.__path__,
                                                      prefix=commands.__name__+'.',
                                                      onerror=lambda x: None):
    mod = importlib.import_module(modname)
    classType = getattr(mod, "Command")
    commandClasses[modname] = classType(display_width,display_height)


slackThread = SlackThread()
slackThread.start()

imgCommand = commands.image.Command(display_width,display_height)
#jsCommand = commands.javascript.Command(display_width,display_height)

currCommand = None
commandLength = 60.0

commandFrame=0
while(not shouldExit):
    
    currTime = time.time()

    messages=[]
    while(not slackThread.getCommands().empty()):
        entry = slackThread.getCommands().get_nowait()

        cmd = ""
        text = entry["text"]
        toks = shlex.shlex(text)
        newCommand= None

        #TODO - Handle file authentication
        #if("file" in entry):
        #    fileData = entry["file"]
        #    filetype = fileData["filetype"]
        #    if(filetype=="javascript"):
        #        newCommand = jsCommand
        if(newCommand==None):
            cmd = toks.get_token()
            modName = "commands."+cmd
            if(cmd=="<"):
                newCommand = imgCommand
            elif (modName in commandClasses):
                newCommand = commandClasses[modName]

        if(newCommand):
            cmdRes,cmdMessage = newCommand.begin(cmd,toks,entry)
            print("New command {}".format(newCommand.__module__))
            print(cmdMessage)
            if(cmdRes):
                if(currCommand):
                    currCommand.end()
                currCommand = newCommand
                commandFrame = 0
                comandStartTime = currTime

    if(currCommand):
        currCommand.draw(flaschen_conn,commandFrame)
        commandFrame+=1
        flaschen_conn.send()
        if(currTime-comandStartTime>commandLength):
            currCommand.end()
            currCommand = None

    time.sleep(0.1)

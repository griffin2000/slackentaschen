




class Command(object):

    def __init__(self, width, height):
        self.frames=[]
        self.width=width
        self.height=height
        self.r = 0
        self.g = 0
        self.b = 0

    def begin(self, cmd, toks, raw_text):
        self.r = int(toks.get_token())
        self.g = int(toks.get_token())
        self.b = int(toks.get_token())
        return (True,"Color command initialized with color {}/{}/{}".format(self.r,self.g,self.b))

    def end(self):
        self.frames=[]

    def draw(self, flaschen_conn,frameIdx):
        for i in range(0,self.width):
            for j in range(0,self.width):
                flaschen_conn.set(i,j,(self.r,self.g,self.b))
        

    
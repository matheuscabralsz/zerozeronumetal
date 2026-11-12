import sys;sys.path.insert(0,'.')
from PIL import Image,ImageDraw,ImageFont
from bases import load as loadb,CHIBI,REAL
from face import load as loadf
from face3 import FACE,PAL
from versions import rim,epx,thick
head=loadf(FACE,PAL)
def build(art,neck_row,neck_x,hs=1):
    body=loadb(art);b=body.crop((0,neck_row,body.width,body.height))
    h=head if hs==1 else head
    W=max(body.width,neck_x+h.width//2+4)+4;Hh=h.height-3
    c=Image.new('RGBA',(W,Hh+b.height),(0,0,0,0))
    c.paste(b,(0,Hh),b);c.paste(h,(neck_x-h.width//2,0),h);return c
chibi=build(CHIBI,24,17)
real=build(REAL,20,17)
# versão realista com cabeça reduzida 75% (proporção adulta)
hsmall=head.resize((21,24),Image.NEAREST)
def build2(art,neck_row,neck_x,h):
    body=loadb(art);b=body.crop((0,neck_row,body.width,body.height));Hh=h.height-2
    c=Image.new('RGBA',(body.width+4,Hh+b.height),(0,0,0,0));c.paste(b,(0,Hh),b);c.paste(h,(neck_x-h.width//2,0),h);return c
real2=build2(REAL,20,17,hsmall)
V=[('A. Chibi (cabeção)',chibi),('B. Chibi + luz',rim(chibi)),('C. Realista',real2),('D. Realista HD',thick(epx(rim(real2,(255,150,190),1,.35,(80,80,180),.25))))]
TH=420;cells=[]
for n,im in V:
    s=max(1,round(TH/im.height));cells.append((n,im.resize((im.width*s,im.height*s),Image.NEAREST)))
photo=Image.open('/mnt/user-data/uploads/1b2efb5d-image.jpg').convert('RGBA');photo=photo.resize((int(photo.width*(TH+40)/photo.height),TH+40))
cw=max(b.width for _,b in cells)+40;H=TH+80
sheet=Image.new('RGBA',(photo.width+cw*4+20,H),(0,0,0,255));d=ImageDraw.Draw(sheet)
for yy in range(H):d.line([(0,yy),(sheet.width,yy)],fill=(int(40+yy/H*60),int(24+yy/H*20),int(70+yy/H*30),255))
sheet.paste(photo,(0,H-photo.height))
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',22)
for i,(n,b) in enumerate(cells):
    cx=photo.width+20+i*cw;sheet.paste(b,(cx+(cw-b.width)//2,H-20-b.height),b);d.text((cx+8,10),n,font=font,fill=(255,230,120,255))
sheet.save('rubao_novo.png');print(sheet.size)

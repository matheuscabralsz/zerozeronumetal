from PIL import Image, ImageDraw, ImageFont
import sys
sys.path.insert(0,'/home/claude/pix')
from bases import load, CHIBI, REAL, MINI
OUT=(18,12,22)
def px(im):return im.load()
def isop(a):return a[3]>0
def is_outline(c):return c[3]>0 and c[:3]==OUT
def mix(a,b,t):return tuple(int(a[i]+(b[i]-a[i])*t) for i in range(3))+(255,)
def rim(im,col=(255,90,190),side=1,amt=.55,shadow=(60,70,170),samt=.35):
    o=im.copy();P=px(im);Q=px(o);w,h=im.size
    for y in range(h):
        for x in range(w):
            c=P[x,y]
            if not isop(c) or is_outline(c):continue
            nx=x+side
            if nx<0 or nx>=w or not isop(P[nx,y]) or is_outline(P[nx,y]):Q[x,y]=mix(c,col,amt)
            px2=x-side
            if px2<0 or px2>=w or not isop(P[px2,y]) or is_outline(P[px2,y]):Q[x,y]=mix(c,shadow,samt)
    return o
def grade(im,tint,t):
    o=im.copy();Q=px(o);w,h=im.size
    for y in range(h):
        for x in range(w):
            c=Q[x,y]
            if c[3] and not is_outline(c):Q[x,y]=mix(c,tint,t*(y/h))
    return o
def selective(im):
    o=im.copy();P=px(im);Q=px(o);w,h=im.size
    for y in range(h):
        for x in range(w):
            if not is_outline(P[x,y]):continue
            nb=[P[x+dx,y+dy] for dx,dy in((1,0),(-1,0),(0,1),(0,-1)) if 0<=x+dx<w and 0<=y+dy<h and isop(P[x+dx,y+dy]) and not is_outline(P[x+dx,y+dy])]
            if nb:
                c=nb[0];Q[x,y]=(int(c[0]*.45),int(c[1]*.45),int(c[2]*.5),255)
    return o
def thick(im,col=OUT):
    w,h=im.size;o=Image.new('RGBA',(w+2,h+2),(0,0,0,0));P=px(im);Q=px(o)
    for y in range(h):
        for x in range(w):
            if isop(P[x,y]):
                for dx in(-1,0,1):
                    for dy in(-1,0,1):Q[x+1+dx,y+1+dy]=col+(255,)
    o.paste(im,(1,1),im);return o
def epx(im):
    w,h=im.size;o=Image.new('RGBA',(w*2,h*2));P=px(im);Q=px(o)
    g=lambda x,y:P[min(max(x,0),w-1),min(max(y,0),h-1)]
    for y in range(h):
        for x in range(w):
            p=P[x,y];A=g(x,y-1);B=g(x+1,y);C=g(x-1,y);D=g(x,y+1)
            o1=o2=o3=o4=p
            if C==A and C!=D and A!=B:o1=A
            if A==B and A!=C and B!=D:o2=B
            if D==C and D!=B and C!=A:o3=C
            if B==D and B!=A and D!=C:o4=D
            Q[2*x,2*y]=o1;Q[2*x+1,2*y]=o2;Q[2*x,2*y+1]=o3;Q[2*x+1,2*y+1]=o4
    return o
def saturate(im,f=1.25):
    o=im.copy();Q=px(o);w,h=im.size
    for y in range(h):
        for x in range(w):
            c=Q[x,y]
            if c[3]:
                m=sum(c[:3])/3;Q[x,y]=tuple(max(0,min(255,int(m+(c[i]-m)*f))) for i in range(3))+(255,)
    return o
ch,re,mi=load(CHIBI),load(REAL),load(MINI)
V=[
 ('Chibi clássico',ch),
 ('Chibi + luz neon',rim(ch)),
 ('Realista',re),
 ('Realista + entardecer',grade(rim(re,(255,170,90),1,.5,(90,60,150),.3),(120,60,160),.25)),
 ('Mini cabeçudo',mi),
 ('Mini contorno grosso',thick(mi)),
 ('Chibi HD sem preto',selective(rim(ch,(255,200,150),1,.35,(80,80,170),.25))),
 ('Realista HD suave',epx(rim(re,(255,120,200),1,.4,(70,80,180),.3))),
 ('Chibi HD contorno',thick(epx(ch))),
 ('Realista quadrinho',thick(thick(saturate(epx(grade(re,(255,140,80),.15)),1.35)))),
]
# folha de contato
cells=[];TH=300
for name,im in V:
    s=max(1,round(TH/im.height));big=im.resize((im.width*s,im.height*s),Image.NEAREST);cells.append((name,big))
cw=max(b.width for _,b in cells)+30;chh=TH+70
sheet=Image.new('RGBA',(cw*5,chh*2),(0,0,0,255));d=ImageDraw.Draw(sheet)
try:font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',20)
except:font=ImageFont.load_default()
for i,(name,b) in enumerate(cells):
    cx=(i%5)*cw;cy=(i//5)*chh
    for yy in range(chh):
        t=yy/chh;col=(int(40+t*60),int(24+t*20),int(70+t*30),255);d.line([(cx,cy+yy),(cx+cw-2,cy+yy)],fill=col)
    sheet.paste(b,(cx+(cw-b.width)//2,cy+40+TH-b.height),b)
    d.text((cx+10,cy+8),f'{i+1}. {name}',font=font,fill=(255,230,120,255))
sheet.save('/home/claude/pix/10versoes.png');print(sheet.size)

import sys;sys.path.insert(0,'/home/claude/pix')
import stance, instruments, stance3 as s3
from PIL import Image,ImageDraw
from face import load as loadf
import vocal
stance.MAT.update({'J':(78,80,90),'T':(78,80,90),'C':(30,30,36),'P':(34,34,40),'Y':(30,30,36),'A':(30,30,36),'Q':(230,182,150),'U':(230,182,150),'S':(230,182,150)})
PAL={'.':None,'K':(48,26,18),'H':(52,34,24),'h':(96,66,46),'d':(36,22,16),
'S':(232,184,152),'s':(204,152,122),'l':(246,212,188),'N':(196,138,110),'m':(120,70,52),
'W':(246,242,238),'E':(52,32,22),'B':(52,34,24),'b':(112,80,60),'t':(170,124,98),'M':(186,96,90),'U':(212,124,116),'G':(30,30,34)}
FACE=r"""
..........KKKKK.........
.......KKKHHHHHKK.......
.....KKHHHHhhhHHHK......
....KHHHhhHHHHHHHHKK....
...KHHHHHHHHHHHhHHHHK...
..KHHHHHHHHHHHHHHHHHHK..
..KHHHHHHHHHHHHHHHHHHHK.
.KHHHHHHHHHdHHHHHHHHHHK.
.KHHHHHHHHdSdHHHHHHHHHK.
..KHHHHHdSSSSdHHHdHHHHK.
..KHHHdSSSSSSSSSdSdHHK..
..KHHSKKKKSSSSSKKKKSHK..
..KHSSSSSSSSSSSSSSSSSK..
..KHSSSWEESSSSSWEESSSK..
.KGHSSSsKsSSSSSsKsSSSK..
..KSSSSSSSSSNSSSSSSSSK..
..KSSSSSSSSSNSSSSSSSSK..
..KtSSSSSSSNNSSSSSSStK..
..KbtSSSSSSNNNSSSSStbK..
..KbbtSSSBBBBBBBSSStbK..
..KbbbtMSSSSSSSSMStbbK..
...KbbbtSMMMMMMMStbK....
...KbbbbtSSSSSSStbbbK...
....KbbbbtbbbbbtbbbK....
.....KKbbbbbbbbbbKK.....
.......KKbbbbbbKK.......
.........KKsssKK........
..........KsssK.........
"""
S=1.25
CX,BY,KX,KY=33,59,.6,1.0
def T(x,y):return (round(CX+(x-CX)*KX),round(BY-(BY-y)*KY))
def tfP(P):
    out=[]
    for m,k,pts in P:
        if k=='ell':
            x0,y0,x1,y1=pts[0];a=T(x0,y0);b2=T(x1,y1);out.append((m,k,[(a[0],a[1],b2[0],b2[1])]))
        else:out.append((m,k,[T(x,y) for x,y in pts]))
    return out
sc=lambda pts:[(round(x*S),round(y*S)) for x,y in pts]
def body(f=0):
    b=f;P=[p for p in vocal.body(f) if p[0]!='C']
    return tfP(P)
GT=instruments.guitar((24,24,28),guard=(236,232,220),pick=(214,214,222))
def details(img,f):
    d=ImageDraw.Draw(img);b=f;q=lambda x,y:T(x*S,y*S)
    k=(26,26,30,255)
    # guitarra preta (sprite)
    instruments.strap(d,q(15,2+b),q(31,23),(26,26,30,255))
    instruments.place(img,GT,q(29,26+b*.5))
    for i in range(3):d.point(q(43.5+i*1.6,2.3+b),fill=(166,104,80,255))
    d.line([q(36,42.6),q(38.5,42.2)],fill=(220,220,226,255))
    return img
def head():return loadf(FACE,PAL)
MYMAT={'J':(234,232,228),'T':(234,232,228),'C':(234,232,228),'P':(34,34,40),'Y':(234,232,228),'A':(222,220,216),'Q':(230,182,150),'U':(230,182,150),'S':(230,182,150)}
def sprite(f):
    stance.MAT.update(MYMAT)
    bd=details(stance.render(body(f),70,64),f);hd=head()
    off=hd.height-5;c=Image.new('RGBA',(72,bd.height+off),(0,0,0,0));c.paste(bd,(0,off),bd);c.paste(hd,(22,f),hd);return c.crop(c.getbbox())

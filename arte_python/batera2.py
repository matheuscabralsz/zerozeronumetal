import sys;sys.path.insert(0,'/home/claude/pix')
import stance3 as s3, stance
from PIL import Image,ImageDraw
from face import load as loadf
PAL={'.':None,'K':(40,22,18),'C':(22,22,28),'c':(60,60,74),'R':(196,40,36),'r':(236,90,70),
'H':(30,22,18),'h':(70,52,40),'S':(226,176,144),'s':(196,142,112),'l':(244,206,180),'N':(184,126,100),'m':(110,62,48),
'W':(246,242,238),'E':(40,24,18),'B':(44,30,24),'b':(104,78,62),'M':(176,86,82),'U':(206,116,110),'t':(150,110,92)}
FACE=r"""
..........KKKKKKKKK.........
........KKCCCCCCCCCKK.......
.......KCCCCcccCCCCCCK......
......KCCCCCCCCCCCCCCCK.....
.....KCCCCCCCCCCCCCCCCCK....
....KRRRRRRRRRRRRRRRRRRRK...
....KRrrRRRRRrrRRRRRRRRRK...
...KHRRRRRRRRRRRRRRRRRRHHK..
..KHhHHHSSSSSSSSSSSSSHHhHK..
..KHHhHSSSSSSSSSSSSSSSHhHK..
.KHhHSKKKKKSSSSSSKKKKKSHHHK.
.KHHSSSSSSSSSSSSSSSSSSSSHhK.
.KhHSSSWWEESSSSSSSWEEWSSHHK.
..KHSSsKKKsSSSSSSSsKKsSSSHK.
..KHsSSSSSSSSSSNSSSSSSSSsK..
..KHhSSSSSSSSSNNSSSSSSSSsK..
..KHsSSSSSSSSNNNNSSSSSSSsK..
..KbsSSSSSBBBBBBBBBSSSSSbK..
..KbtSSSBBBBBBBBBBBBBSSStK..
..KbbSSBBBSMMMMMMSBBBSSbbK..
..KBbtSSSSSSUUUUUSSSSSSbBK..
...KBbtSSSSSSSSSSSSSSStbK...
...KBBbtSSSSSBBBSSSSStbBK...
....KBBbbtSSBBBBBSStbbBK....
.....KBBBbbbBBBBBbbbBBK.....
......KKBBBBBBBBBBBBKK......
........KKKBBBBBBKKK........
..........KsssssssK.........
"""
stance.MAT.update({'J':(26,26,32),'T':(26,26,32),'C':(40,40,50),'P':(126,156,196),'Y':(226,176,144),'A':(30,30,38),'Q':(226,176,144),'U':(226,176,144),'S':(226,176,144)})
S=1.25
sc=lambda pts:[(round(x*S),round(y*S)) for x,y in pts]
scE=lambda b:tuple(round(v*S) for v in b)
import vocal
stance.MAT.update({'J':(30,30,36),'T':(30,30,36),'C':(44,44,54),'P':(132,162,200),'Y':(226,176,144),'A':(34,34,42),'Q':(226,176,144),'U':(226,176,144),'S':(226,176,144)})
CX,BY,KX,KY=35,59,.78,.88
def T(x,y):return (round(CX+(x-CX)*KX),round(BY-(BY-y)*KY))
def tfP(P):
    out=[]
    for m,k,pts in P:
        if k=='ell':
            x0,y0,x1,y1=pts[0];a=T(x0,y0);b2=T(x1,y1);out.append((m,k,[(a[0],a[1],b2[0],b2[1])]))
        else:out.append((m,k,[T(x,y) for x,y in pts]))
    return out
def body(f=0):
    b=f;P=vocal.body(f)
    # mangas curtas: antebraço + metade do braço em pele
    P.append(('Y','poly',sc([(36,8+b),(39,7+b),(41,11+b),(38,13+b)])))
    return tfP(P)
def details(img,f):
    d=ImageDraw.Draw(img);b=f;q=lambda x,y:T(x*S,y*S)
    # estampa genérica da camiseta (caveira com baquetas)
    w=(214,214,220,255);g=(150,150,160,255)
    for (x,y) in [(22,18),(23,18),(24,18),(21,19),(22,19),(23,19),(24,19),(25,19),(21,20),(23,20),(25,20),(22,21),(23,21),(24,21),(22,22),(24,22)]:d.point(q(x,y+b),fill=w)
    d.line([q(19,23+b),q(27,17+b)],fill=g);d.line([q(19,17+b),q(27,23+b)],fill=g)
    # tatuagens nos braços
    ink=(52,62,90,255)
    for pt in [(43,10),(44,9),(42.5,12),(41,13),(44.5,11),(38,9),(39,11),(21,14.5),(22.5,13),(24,12)]:d.point(q(pt[0],pt[1]+b),fill=ink)
    # baquetas
    for (x0,y0,x1,y1) in [(45,4,52,-6),(27,8,33,-1)]:
        d.line([q(x0,y0+b),q(x1,y1+b)],fill=(60,40,24,255),width=3);d.line([q(x0,y0+b),q(x1,y1+b)],fill=(232,206,150,255),width=1)
    for i in range(3):d.point(q(43.5+i*1.6,2.3+b),fill=(166,104,80,255))
    # jeans rasgado no joelho
    for pt in [(33,33),(34,33),(33,34),(35,34),(34,35),(19,31),(20,31),(19,32)]:d.point(q(*pt),fill=(232,236,244,255))
    d.line([q(31,35),q(33,34)],fill=(80,104,140,255));d.line([q(36,42.6),q(38.5,42.2)],fill=(220,220,226,255))
    # corrente no pescoço
    for i in range(6):d.point(q(26+i*.8,1.2+abs(i-2.5)*.4+b),fill=(200,200,210,255))
    return img
def head():
    h=loadf(FACE,PAL);return h.resize((25,29),Image.NEAREST)
def sprite(f):
    bd=details(stance.render(body(f),70,64),f)
    hd=head();c=Image.new('RGBA',(72,bd.height+hd.height-8),(0,0,0,0));c.paste(bd,(0,hd.height-8),bd);c.paste(hd,(19,f),hd);return c
if __name__=='__main__':
    W,H=260,110;bg=Image.new('RGBA',(W,H))
    for y in range(H):
        for x in range(W):bg.putpixel((x,y),(40+y//3,26+y//6,70+y//4,255) if y<92 else (58,64,94,255))
    a=sprite(0);b=sprite(1)
    bg.paste(a,(10,2),a);bg.paste(b,(90,2),b)
    big=a.resize((a.width*2,a.height*2),Image.NEAREST).crop((0,0,100,110));bg.paste(big,(166,0),big)
    bg.resize((W*5,H*5),Image.NEAREST).save('/home/claude/pix/batera2.png')

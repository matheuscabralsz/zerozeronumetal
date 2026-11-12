import sys;sys.path.insert(0,'/home/claude/pix')
import stance3 as s3, stance
from PIL import Image,ImageDraw
from face import load as loadf
from face3 import PAL as FPAL
FACE=r'''
..........KKKKKKKK..........
.......KKKSSSlllSSSKKK......
......KSSSSllllllSSSSSK.....
.....KSSSSSSllllSSSSSSSK....
....KsSSSSSSSSSSSSSSSSSSK...
...KssSSSSSSSSSSSSSSSSSSSK..
...KsSSSSSSSSSSSSSSSSSSSSK..
..KssSSSSSSSSSSSSSSSSSSSSSK.
..KsSSSSSSSSSSSSSSSSSSSSSSK.
..KsSSSSSSSSSSSSSSSSSSSSSSK.
..KsSSSSSSSSSSSSSSSSKKKKSSK.
.KssSSKKKKSSSSSSSSKSSSKSSSK.
.KssSSSSSKKSSSSSSSSSSSSSSsK.
.KsSSSSSSSSSSSSSSSSSSSSSSsK.
.KsSSWWEEESSSSSSSWEEEWSSSsK.
.KsSSsKKKsSSSSSSSsKKKsSSSsK.
..KsSSSSSSSSSSNSSSSSSSmSSK..
..KsSSSSSSSSSNNSSSSSSSSSsK..
..KtSSSSSSSSNNNNSSSSSSSStK..
..KxtSSSSSBBBBBBBBSSSSStxK..
..KBxtSSSBBLLLLLLBBSSStxBK..
..KBBxSSBBSUUUUUUSBBSSxBBK..
..KBBBtSBSSSSSSSSSSBStBBBK..
...KBBBtSSSSSSBBSSSSStBBK...
...KBBBBtSSSSBBBBSSStBBBK...
....KBBBBttSSBBBBSStBBBK....
....KBBBBBBtBBBBBBtBBBBK....
.....KBBBBBBBBBBBBBBBBK.....
......KKBBBBBBBBBBBBBK......
........KKKBBBBBBBKK........
..........KKKBBBKK..........
..........KsssssssK.........
'''
stance.MAT.update({'J':(232,228,220),'T':(214,154,124),'C':(246,244,240),'P':(40,40,50),'Y':(234,178,146),'A':(226,222,214),'Q':(234,178,146),'U':(234,178,146)})
S=1.25
sc=lambda pts:[(round(x*S),round(y*S)) for x,y in pts]
scE=lambda b:tuple(round(v*S) for v in b)
def body(f=0):
    b=f
    P=s3.body(f)
    # remove braço de trás antigo (J pequeno + punho S do peito)
    P=[p for i,p in enumerate(P) if p[0]!='R' and not (i in (3,4))]
    out=[];inserted=False
    for p in P:
        out.append(p)
        if p[0]=='T' and not inserted:
            inserted=True
            out+=[('A','poly',sc([(14,4+b),(20,3+b),(22,13+b),(20,17+b),(16,16+b),(14,9+b)]))]
            out+=[('Q','poly',sc([(18,13+b),(22,10+b),(26.5,9+b),(28,12+b),(22,17.5+b),(18,17+b)]))]
            out+=[('U','ell',[scE((24.5,5+b,31.5,12+b))])]
    out+=[('Y','poly',sc([(39,9+b),(42,7+b),(46,5.5+b),(47.5,9.5+b),(42,15.5+b),(38.5,14+b)]))]
    out+=[('S','ell',[scE((41.5,.5+b,49,8+b))])]
    return out
def details(img,f):
    d=ImageDraw.Draw(img);b=f;q=lambda x,y:(round(x*S),round(y*S))
    import random;random.seed(7)
    red=(168,24,24,255);dk=(110,14,14,255)
    M=img.load()
    def onshirt(x,y):
        p=M[q(x,y)];return p[3] and p[0]>190 and p[1]>180 and p[2]>170
    for _ in range(60):
        x=random.uniform(13,37);y=random.uniform(1,25)+b
        if not onshirt(x,y):continue
        d.point(q(x,y),fill=red if random.random()<.7 else dk)
        if random.random()<.35 and onshirt(x,y+2):d.line([q(x,y),q(x,y+random.uniform(1,2.5))],fill=red)
    d.line([q(28.9,3+b),q(28.5,24)],fill=(196,192,184,255))
    for i in range(5):d.point(q(28.6,4+i*4.4+b),fill=(150,146,140,255))
    ink=(52,62,90,255)
    for pt in [(43,10),(44,9),(42.5,12),(41,13),(44.5,11),(21,14.5),(22.5,13),(24,12)]:d.point(q(pt[0],pt[1]+b),fill=ink)
    for i in range(3):d.point(q(43.5+i*1.6,2.3+b),fill=(166,104,80,255))
    for i in range(3):d.point(q(26.5+i*1.5,6.6+b),fill=(166,104,80,255))
    d.line([q(31,35),q(33,34)],fill=(24,24,30,255));d.line([q(19,33),q(20.5,31.5)],fill=(24,24,30,255))
    d.line([q(36,42.6),q(38.5,42.2)],fill=(220,220,226,255))
    return img
P=dict(FPAL);P.update({'K':(64,28,20),'l':(248,212,188),'B':(150,60,26),'b':(192,100,56),'x':(176,108,82),'t':(200,138,108)})
def head():
    h=loadf(FACE,P);px=h.load();W,Hh=h.size
    for y in range(Hh):
        for x in range(W):
            c=px[x,y]
            if c[3] and c[:3]==(234,178,146) and x<5:px[x,y]=(214,156,132,255)
    for p in [(9,6),(10,5),(11,4),(12,4),(13,5),(13,6),(12,7),(14,7),(15,6),(16,6),(17,7),(17,8),(19,7),(20,6),(21,6),(22,7),(10,7),(9,8),(11,8),(18,5),(19,4),(14,8)]:
        if px[p][3]:px[p]=(44,52,74,255)
    return h
MYMAT={'J':(232,228,220),'T':(214,154,124),'C':(246,244,240),'P':(40,40,50),'Y':(234,178,146),'A':(226,222,214),'Q':(234,178,146),'U':(234,178,146)}
def sprite(f):
    stance.MAT.update(MYMAT)
    bd=details(stance.render(body(f),70,64),f)
    hd=head();c=Image.new('RGBA',(72,bd.height+hd.height-8),(0,0,0,0));c.paste(bd,(0,hd.height-8),bd);c.paste(hd,(17,f),hd);return c
if __name__=='__main__':
    W,H=260,110;bg=Image.new('RGBA',(W,H))
    for y in range(H):
        for x in range(W):bg.putpixel((x,y),(40+y//3,26+y//6,70+y//4,255) if y<92 else (58,64,94,255))
    a=sprite(0);b=sprite(1)
    bg.paste(a,(10,2),a);bg.paste(b,(90,2),b)
    big=a.resize((a.width*2,a.height*2),Image.NEAREST).crop((0,0,100,110));bg.paste(big,(166,0),big)
    bg.resize((W*5,H*5),Image.NEAREST).save('/home/claude/pix/vocal_v2.png')

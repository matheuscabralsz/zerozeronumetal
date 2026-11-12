import sys;sys.path.insert(0,'/home/claude/pix')
import stance, stance3 as s3
from PIL import Image,ImageDraw
from face import load as loadf
import vocal
PAL={'.': None, 'T': (240, 236, 210), 'S': (238, 190, 162), 's': (206, 152, 126), 'R': (236, 150, 140), 'H': (176, 140, 70), 'h': (214, 180, 100), 'E': (70, 90, 60), 'W': (240, 236, 220), 'L': (200, 140, 120), 'N': (220, 160, 140), 'M': (190, 110, 100), 'D': (80, 30, 30), 'K': (50, 30, 22)}
FACE=r"""
.........KKKKKKKK...........
......KKHhHHhHHhHKK.........
.....KHhHHhHHhHHhHHK........
....KHHhHHhHHhHHhHHHK.......
....KHhHHHHhHHHhHHhHK.......
...KHHHSSSSSSSSSSHHHK.......
...KHSSSSSSSSSSSSSSHK.......
...KSSSSSSSSSSSSSSSSSK......
..KsSSKKKKSSSSKKKKSSSK......
..KsSSSSSSSSSSSSSSSSSK......
..KsSSWEESSSSSWEESSSSK......
..KsSSLLLSSSSSLLLSSSSK......
..KsSSSSSSSNSSSSSSSSSK......
..KssRSSSSNNSSSSSRSSsK......
..KssRRSSSNNNSSSSRRssK......
...KsSSSSSSSSSSSSSSsK.......
...KsSSSSMMMMMMSSSSsK.......
...KssSSSMDDDDMSSSssK.......
...KssSSSSMMMMSSSSssK.......
....KssSSSSSSSSSSssK........
....KsssSSSSSSSSsssK........
.....KKssssssssssKK.........
.......KKsssssssK...........
.........KsssssK............
.........KsSSsK.............
"""
S=1.25
CX,BY,KX,KY=33,59,1.05,1.0
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
    k=[p[0] for p in P].index('T')
    belly=[('J','ell',[s3.scE((16,10+b,35,27+b))])]
    P=P[:k+1]+belly+P[k+1:]
    if stance.POSE not in s3.ARMS:P.append(('Y','poly',sc([(36,8+b),(39,7+b),(41,11+b),(38,13+b)])))
    return tfP(P)
def details(img,f):
    d=ImageDraw.Draw(img);b=f;q=lambda x,y:T(x*S,y*S);M=img.load()
    J=stance.MAT['J'];sh,hi,_=stance.shade_cols(J);ok={J,sh,hi}
    for (x,y,c) in [(22,14,(196,170,90)),(28,18,(170,140,80)),(25,24,(150,120,70)),(31,12,(196,170,90)),(19,19,(170,140,80))]:
        p=q(x,y+b)
        for dx,dy in((0,0),(1,0),(0,1),(1,1),(-1,0)):
            pp=(p[0]+dx,p[1]+dy)
            if 0<=pp[0]<img.width and 0<=pp[1]<img.height and M[pp][3] and M[pp][:3] in ok:M[pp]=c+(255,)
    d.line([q(36,42.6),q(38.5,42.2)],fill=(200,190,170,255))
    return img
def _head0():return loadf(FACE,PAL)
MYMAT={'J': (228, 232, 196), 'T': (228, 232, 196), 'C': (228, 232, 196), 'V': (238, 190, 162), 'P': (40, 48, 72), 'Y': (238, 190, 162), 'A': (205, 208, 176), 'Q': (228, 232, 196), 'U': (238, 190, 162), 'S': (238, 190, 162), 'O': (30, 26, 30), 'o': (170, 160, 150), 'Z': (236, 150, 140)}
def sprite(f):
    stance.MAT.update(MYMAT)
    bd=details(stance.render(body(f),70,64),f);hd=head()
    off=hd.height-8;c=Image.new('RGBA',(72,bd.height+off),(0,0,0,0));c.paste(bd,(0,off),bd);c.paste(hd,(18,f),hd);return c.crop(c.getbbox())

def head():
    h=_head0();PADX,PADT=6,12
    c=Image.new('RGBA',(h.width+PADX*2,h.height+PADT),(0,0,0,0));c.alpha_composite(h,(PADX,PADT));d=ImageDraw.Draw(c)
    hz=0
    if hz:
        bone=(236,224,196,255) if hz<9 else (60,40,40,255);sh=(170,150,120,255) if hz<9 else (30,20,20,255);ol=(30,10,12,255)
        for side in (-1,1):
            bx=PADX+(8 if side<0 else 18);by=PADT+2
            pts=[(bx,by+2)]
            for k in range(1,hz+1):pts.append((bx+side*(k*.55),by+2-k*1.05+(k*k*.05)))
            d.line(pts,fill=ol,width=4 if hz<6 else 6);d.line(pts,fill=bone,width=2 if hz<6 else 4)
            d.point(pts[-1],fill=sh)
    if False:
        for x,y in ((PADX+1,PADT+9),(PADX+0,PADT+8),(PADX-1,PADT+7)):c.putpixel((x,y),(238, 190, 162, 255))
    if False:
        for x in (PADX+10,PADX+13):c.putpixel((x,PADT+17),(250,246,230,255))
    return c

from PIL import Image, ImageDraw
import sys;sys.path.insert(0,'/home/claude/pix')
from face import load as loadf
from face3 import FACE,PAL as FPAL
import stance
from stance import shade_cols
MAT=stance.MAT;MAT.update({'Z':(70,72,92),'C':(48,50,66),'L':(30,32,44)})
render=stance.render
S=1.25
def sc(pts):return [(round(x*S),round(y*S)) for x,y in pts]
def scE(b):return tuple(round(v*S) for v in b)
def body(f=0):
    b=f;P=[]
    P+=[('P','poly',sc([(19,26),(26,26),(22,35),(18,44),(13,44),(15,34)]))]
    P+=[('O','poly',sc([(8,42.5),(18,42.5),(19,45.5),(7,45.5)])),('o','poly',sc([(7,45.5),(19,45.5),(19,47),(7,47)]))]
    P+=[('J','poly',sc([(14,4+b),(19,4+b),(21,13+b),(25,10+b),(27,13+b),(20,18+b),(15,14+b)]))]
    P+=[('S','ell',[scE((23.5,7.5+b,30,13.5+b))])]
    P+=[('J','poly',sc([(15,1+b),(33,0+b),(36,6+b),(36.5,16+b),(33,27),(16,27),(13,17+b),(13,6+b)]))]
    P+=[('T','poly',sc([(29.5,2+b),(33.5,2+b),(32.5,26),(29,26)]))]
    P+=[('C','poly',sc([(24,-.5+b),(29.5,1.5+b),(28,6+b)])),('C','poly',sc([(33,0+b),(36,2.5+b),(34,6+b)]))]
    pass
    P+=[('L','poly',sc([(15,24.5),(33.5,24.5),(33.5,26.5),(15,26.5)]))]
    P+=[('P','poly',sc([(16,26),(33,26),(34,28),(30,28),(36,34),(37,43),(32,43),(31,36),(24,30),(17,30)]))]
    P+=[('O','poly',sc([(30,42),(40,41.5),(44.5,44.5),(30,45.5)])),('o','poly',sc([(30,45.5),(44.5,44.5),(44.5,47),(30,47)]))]
    P+=[('J','poly',sc([(30,3+b),(36,2+b),(40,12+b),(42,8+b),(46,6+b),(47.5,10+b),(42,16.5+b),(37,15.5+b),(33,11+b)]))]
    P+=[('R','poly',sc([(36.6,6.6+b),(38.6,5.6+b),(39.8,8.8+b),(37.6,9.8+b)]))]
    P+=[('S','ell',[scE((41.5,.5+b,49,8+b))])]
    return P
def details(img,f):
    d=ImageDraw.Draw(img);b=f;q=lambda x,y:(round(x*S),round(y*S))
    k=(20,22,32,255)
    # dobras da jaqueta
    for a,c in [((17,10+b),(19,15+b)),((26,18+b),(30,20+b)),((15,20+b),(19,22+b))]:d.line([q(*a),q(*c)],fill=(24,25,36,255))
    # zíper
    d.line([q(29.4,3+b),q(28.8,24)],fill=(110,112,130,255))
    # punhos: dedos
    for i in range(3):d.point(q(43.5+i*1.6,2.3+b),fill=(166,104,80,255));d.point(q(44+i*1.6,4.2+b),fill=(190,124,96,255))
    d.line([q(42.3,4.5+b),q(42.3,6.5+b)],fill=(166,104,80,255))
    for i in range(2):d.point(q(25.5+i*1.8,9.2+b),fill=(166,104,80,255))
    # punho da manga
    d.line([q(40.5,12.8+b),q(44,10+b)],fill=(70,72,92,255))
    # joelho / dobra do jeans
    d.line([q(31,35),q(33,34)],fill=(36,44,78,255));d.line([q(19,33),q(20.5,31.5)],fill=(36,44,78,255))
    d.line([q(33,30),q(35,32)],fill=(80,92,136,255))
    # cadarço / biqueira branca
    d.line([q(36,42.6),q(38.5,42.2)],fill=(220,220,226,255));d.line([q(12,43.2),q(14.5,43.2)],fill=(220,220,226,255))
    d.line([q(41.5,43.2),q(44,44.4)],fill=(230,230,236,255))
    return img
def head():
    P=dict(FPAL);P.update({'K':(52,26,24),'H':(22,20,28),'h':(84,82,104),'f':(150,120,108),'F':(118,94,88)})
    h=loadf(FACE,P);px=h.load()
    # brilho no topete e sombra fria na lateral do rosto
    for y in range(h.height):
        for x in range(h.width):
            c=px[x,y]
            if c[3]==0:continue
            if c[:3]==(234,178,146) and x<9:px[x,y]=(210,150,136,255)
    return h
def sprite(f=0):
    bd=details(render(body(f),70,64),f);hd=head()
    W,H=72,bd.height+hd.height-8
    c=Image.new('RGBA',(W,H),(0,0,0,0))
    c.paste(bd,(0,hd.height-8),bd);c.paste(hd,(17,f),hd)
    return c
if __name__=='__main__':
    a,b2=sprite(0),sprite(1)
    W,H=260,110
    bg=Image.new('RGBA',(W,H))
    for y in range(H):
        for x in range(W):bg.putpixel((x,y),(40+y//3,26+y//6,70+y//4,255) if y<92 else (58,64,94,255))
    bg.paste(a,(10,2),a);bg.paste(b2,(90,2),b2)
    big=a.resize((a.width*2,a.height*2),Image.NEAREST).crop((0,0,90,110));bg.paste(big,(170,0),big)
    bg.resize((W*5,H*5),Image.NEAREST).save('/home/claude/pix/rubao_luta2.png')

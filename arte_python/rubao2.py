"""Rubão v2 - 3 skins: jaqueta preta com detalhes vermelhos + óculos escuros,
jaqueta puffer preta + corrente + óculos escuros, e a 33 (máscara branca) redesenhada."""
import sys,types;sys.path.insert(0,'/home/claude/pix')
import stance, stance3 as s3
from PIL import Image, ImageDraw
from face import load as loadf
from face3 import FACE,PAL as FPAL
S=s3.S;sc=s3.sc
BASE=[list(r) for r in FACE.strip('\n').split('\n')]
HP={'K':(40,22,22),'H':(22,20,28),'h':(76,74,98),'f':(150,120,108),'F':(118,94,88),
    'G':(18,18,26),'g':(96,108,140),'q':(44,46,62),'O':(214,214,224),'B':(38,26,22),'b':(84,56,38)}
def _rows():return [r[:] for r in BASE]
def _set(R,pts,c):
    for x,y in pts:
        if 0<=y<len(R) and 0<=x<len(R[y]):R[y][x]=c
def _beard(R,brown=False):
    # barba mais curta: bochechas limpas, bigode + cavanhaque e linha na mandíbula
    for y in range(19,31):
        for x in range(len(R[y])):
            if R[y][x]=='B' and y<23 and 4<x<10:R[y][x]='S'
            if R[y][x]=='B' and y<23 and 18<x<22:R[y][x]='S'
    _set(R,[(13,21),(14,21)],'B')                  # soul patch
    if brown:
        for y in range(len(R)):
            for x in range(len(R[y])):
                if R[y][x]=='B':R[y][x]='b'
def _ear_ring(R):_set(R,[(2,18),(2,19)],'O')
def _glasses(R):
    for x in range(3,12):R[12][x]='K'
    for x in range(16,26):R[12][x]='K'
    for y in (13,14,15):
        R[y][3]='K';R[y][11]='K';R[y][16]='K';R[y][24]='K'
        for x in range(4,11):R[y][x]='G'
        for x in range(17,24):R[y][x]='G'
    for x in range(4,11):R[16][x]='K'
    for x in range(17,24):R[16][x]='K'
    for x in range(12,16):R[14][x]='K'
    _set(R,[(25,13)],'K')
    _set(R,[(9,13),(8,14),(7,15),(22,13),(21,14),(20,15)],'g')
    _set(R,[(4,15),(5,15),(17,15),(18,15)],'q')
def _shade(h):
    px=h.load()
    for y in range(h.height):
        for x in range(h.width):
            c=px[x,y]
            if c[3] and c[:3]==(234,178,146) and x<9:px[x,y]=(210,150,136,255)
    return h
def head_glasses(brown=False):
    def f():
        R=_rows();_beard(R,brown);_glasses(R);_ear_ring(R)
        P=dict(FPAL);P.update(HP);return _shade(loadf('\n'.join(''.join(r) for r in R),P))
    return f
def head33():
    R=_rows();_beard(R)
    SK=set('SstxNmFfl')
    for y in range(8,23):
        for x in range(len(R[y])):
            c=R[y][x]
            if c in SK:R[y][x]='M' if x>5 else 'n'
            if c in 'WE':R[y][x]='M'
            if c in 'LU':R[y][x]='M'
    # olhos em fenda inclinada + pintura de lágrimas escorrendo e risco vermelho
    _set(R,[(6,14),(7,14),(8,15),(9,15)],'K');_set(R,[(17,15),(18,15),(19,14),(20,14)],'K')
    _set(R,[(7,16),(7,17),(7,18),(8,19),(9,17),(9,18)],'r');_set(R,[(19,16),(19,17),(19,18),(18,19),(21,16),(21,17)],'r')
    _set(R,[(15,8),(14,9),(15,10),(14,11),(13,12)],'v')
    P=dict(FPAL);P.update(HP);P.update({'M':(238,236,230),'n':(192,190,186),'r':(28,22,26),'v':(200,36,40)})
    return loadf('\n'.join(''.join(r) for r in R),P)

def make(name,head_fn,mat,extra=None,tee=False):
    m=types.ModuleType(name);m.MYMAT=mat;m.head=head_fn
    def body(f=0):
        P=s3.body(f)
        if tee and stance.POSE not in s3.ARMS:
            b=f;P.append(('Y','poly',sc([(36,8+b),(39,7+b),(41,11+b),(38,13+b)])))
        if tee and stance.POSE in s3.ARMS:
            sh,el,wr=s3.ARMS[stance.POSE];b=f
            P.insert(len(P)-2,('Y','poly',sc(s3._limb([(el[0]-1,el[1]+b),(wr[0],wr[1]+b)],6,5.4))))
        return P
    def details(img,f):
        s3.details(img,f)
        if extra:extra(img,f)
        return img
    m.body=body;m.details=details;sys.modules[name]=m;return m

def q(x,y):return (round(x*S),round(y*S))
def red_details(img,f):
    d=ImageDraw.Draw(img);b=f;red=(226,40,40,255)
    # código de barras vermelho no peito
    hs=[7,6,8,5,7,6,8,6,7]
    x0,y0=q(23,9+b)
    for i,hh in enumerate(hs):
        d.line([(x0+i*2,y0),(x0+i*2,y0+hh)],fill=red)
    # rosa pequena do outro lado
    d.point(q(18.5,9.4+b),fill=red);d.point((q(18.5,9.4+b)[0]+1,q(18.5,9.4+b)[1]),fill=red)
    d.point(q(18.5,10.4+b),fill=(150,150,160,255));d.point(q(19.6,10.6+b),fill=(150,150,160,255))
def puffer_details(img,f):
    J=stance.MAT['J'];sh,hi,_=stance.shade_cols(J);jset={J,sh,hi}
    px=img.load();W,H=img.size;line=(14,14,18,255);lite=(70,72,84,255)
    for y in range(H):
        for x in range(W):
            c=px[x,y]
            if c[3] and c[:3] in jset:
                k=(y*2-x//1)%14
                if k in(0,1):px[x,y]=line
                elif k in(2,3) and c[:3]!=sh:px[x,y]=lite
    d=ImageDraw.Draw(img);b=f
    # corrente prata
    for i in range(7):
        x,y=q(27.2-i*.25,3.5+i*1.6+b);px2=(206,206,216,255) if i%2==0 else (130,130,144,255)
        d.point((x,y),fill=px2);d.point((x,y+1),fill=px2)
def tee33_details(img,f):
    d=ImageDraw.Draw(img);b=f;w=(240,240,240,255)
    for ox in (18,23.5):
        d.line([q(ox,9+b),q(ox+3.6,9+b),q(ox+1.6,12+b),q(ox+3.8,14+b),q(ox+3,17+b),q(ox,17+b)],fill=w,width=2)

BLACK={'J':(36,37,50),'P':(52,62,104),'O':(30,30,36),'o':(236,236,240),'S':(234,178,146),'T':(14,14,18),'R':(228,52,44),'Z':(70,72,92),'C':(48,50,66),'L':(30,32,44)}
make('rub_red',head_glasses(),dict(BLACK,J=(30,30,40),C=(40,40,52),T=(16,16,20)),red_details)
make('rub_puffer',head_glasses(True),dict(BLACK,J=(40,40,44),C=(40,40,44),R=(40,40,44),T=(16,16,20),Z=(150,150,160),P=(46,56,96)),puffer_details)
make('rub_33',head33,dict(BLACK,J=(22,22,26),T=(22,22,26),C=(22,22,26),R=(22,22,26),Y=(234,178,146),P=(36,40,62)),tee33_details,tee=True)

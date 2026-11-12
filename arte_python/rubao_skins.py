import sys,types;sys.path.insert(0,'/home/claude/pix')
import stance, stance3 as s3
from PIL import Image, ImageDraw
from face import load as loadf
from face3 import FACE,PAL as FPAL
S=s3.S;sc=s3.sc
ROWS=[r for r in FACE.strip('\n').split('\n')]
def grid_img(rows,extra):
    P=dict(FPAL);P.update({'K':(52,26,24),'H':(22,20,28),'h':(84,82,104),'f':(150,120,108),'F':(118,94,88)});P.update(extra)
    return loadf('\n'.join(rows),P)
SKIN=set('SstxNmFf')
def head33():
    R=[list(r) for r in ROWS]
    for y in range(9,24):
        for x in range(len(R[y])):
            c=R[y][x]
            if c in SKIN:R[y][x]='M' if x>4 else 'n'
            if c in 'LU':R[y][x]='K'
    # anel em volta do olho direito (da tela)
    for (x,y) in [(17,12),(18,12),(19,12),(20,12),(21,12),(16,13),(22,13),(16,14),(23,14),(16,15),(22,15),(17,16),(18,16),(19,16),(20,16),(21,16)]:
        if y<len(R) and x<len(R[y]):R[y][x]='K'
    return grid_img([''.join(r) for r in R],{'M':(236,234,228),'n':(196,192,186)})
def headbode():
    R=[list(r) for r in ROWS]
    for y in range(9,17):
        for x in range(len(R[y])):
            if R[y][x] in SKIN:R[y][x]='G' if x>4 else 'g'
    h=grid_img([''.join(r) for r in R],{'G':(54,46,40),'g':(36,30,28)})
    # chifres de bode curvados para tras
    c=Image.new('RGBA',(h.width+12,h.height+10),(0,0,0,0));c.alpha_composite(h,(6,10))
    d=ImageDraw.Draw(c);bone=(214,200,170,255);dk=(150,132,104,255);ol=(30,20,18,255)
    for pts in ([(13,12),(10,7),(5,5),(1,8),(1,13),(4,15)],[(26,11),(29,6),(34,5),(37,9),(36,14)]):
        d.line(pts,fill=ol,width=6,joint='curve');d.line(pts,fill=bone,width=4,joint='curve')
        for a,b in zip(pts[:-2],pts[1:-1]):
            mx,my=(a[0]+b[0])/2,(a[1]+b[1])/2;d.point((mx,my),fill=dk);d.point((b[0],b[1]+1),fill=dk)
    return c
def make(name,head_fn,mat,tee=False,hx=17):
    m=types.ModuleType(name)
    m.MYMAT=mat;m.head=head_fn
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
        if tee:
            d=ImageDraw.Draw(img);b=f;q=lambda x,y:(round(x*S),round(y*S));w=(240,240,240,255)
            for ox in (18,23.5):  # "33" estampado
                d.line([q(ox,9+b),q(ox+3.6,9+b),q(ox+1.6,12+b),q(ox+3.8,14+b),q(ox+3,17+b),q(ox,17+b)],fill=w,width=2)
        return img
    m.body=body;m.details=details;sys.modules[name]=m;return m
BLACK={'J':(36,37,50),'P':(52,62,104),'O':(30,30,36),'o':(236,236,240),'S':(234,178,146),'T':(14,14,18),'R':(228,52,44),'Z':(70,72,92),'C':(48,50,66),'L':(30,32,44)}
make('rubao_bode',headbode,dict(BLACK,J=(28,29,38),C=(40,42,56)))
make('rubao33',head33,dict(BLACK,J=(22,22,26),T=(22,22,26),C=(22,22,26),R=(22,22,26),Y=(234,178,146),P=(36,40,62)),tee=True)

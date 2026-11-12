"""Rubão v3 - rosto a partir da referência aprovada (nariz corrigido).
Skins: cara limpa + jaqueta com detalhes vermelhos; óculos escuros + jaqueta de couro;
máscara branca (original) + camiseta 33."""
import sys,types,json;sys.path.insert(0,'/home/claude/pix')
import stance, stance3 as s3
from PIL import Image, ImageDraw
S=s3.S;sc=s3.sc
REF=json.load(open('/home/claude/pix/refface.json'))
ROWS=[list(r) for r in REF['rows']]
PAL={k:tuple(v) for k,v in REF['pal'].items()}
PAL.update({'x':(150,92,74),'G':(16,16,24),'g':(100,112,146),'Q':(42,44,60),'O':(210,210,222),
            'M':(238,236,230),'W':(198,196,192),'r':(26,20,24),'v':(204,40,44)})
def _rows():return [r[:] for r in ROWS]
def _set(R,pts,c):
    for x,y in pts:
        if 0<=y<len(R) and 0<=x<len(R[y]):R[y][x]=c
def _nose(R):
    # limpa o nariz antigo (triângulo) e redesenha: ponte sutil, ponta e narinas
    for y in range(15,19):
        for x in range(11,17):
            if R[y][x] in 'o':R[y][x]='f'
    _set(R,[(14,15),(14,16)],'o')
    _set(R,[(12,17),(15,17)],'o');_set(R,[(13,17)],'e')
    _set(R,[(12,18),(15,18)],'x');_set(R,[(13,18),(14,18)],'o')
def _img(R):
    h=Image.new('RGBA',(len(R[0]),len(R)),(0,0,0,0));p=h.load()
    for y,row in enumerate(R):
        for x,c in enumerate(row):
            if c!='.':p[x,y]=PAL[c]+(255,)
    return h
def head_plain():
    R=_rows();_nose(R);return _img(R)
def head_glasses():
    R=_rows();_nose(R)
    for x in range(3,12):R[12][x]='a'
    for x in range(15,25):R[12][x]='a'
    for y in (13,14,15):
        for x in (3,11,15,23):R[y][x]='a'
        for x in range(4,11):R[y][x]='G'
        for x in range(16,23):R[y][x]='G'
    for x in range(4,11):R[16][x]='a'
    for x in range(16,23):R[16][x]='a'
    _set(R,[(12,13),(13,13),(14,13)],'a');_set(R,[(24,13),(25,13)],'a')
    _set(R,[(9,13),(8,14),(7,15),(21,13),(20,14),(19,15)],'g')
    _set(R,[(4,15),(5,15),(16,15),(17,15)],'Q')
    return _img(R)
def head_mask():
    R=_rows()
    for y in range(9,23):
        for x in range(3,24):
            c=R[y][x]
            inside=(c not in '.ab' and (c not in 'cg')) and not (y<12 and c=='b')
            if y>=19 and not (5+(y-19)<=x<=21-(y-19)):inside=False
            if inside:R[y][x]='W' if (x<6 or x>20 or y==22-(0)) else 'M'
    # furos dos olhos
    for (x0,y0) in ((6,14),(17,14)):
        _set(R,[(x0+1,y0),(x0+2,y0),(x0,y0+1),(x0+1,y0+1),(x0+2,y0+1),(x0+3,y0+1)],'r')
        _set(R,[(x0,y0),(x0+3,y0)],'W')
        _set(R,[(x0+1,y0+2),(x0+1,y0+3),(x0+2,y0+4)],'r')
    # risco vermelho na testa e boca costurada
    _set(R,[(14,10),(13,11),(14,12),(13,13)],'v')
    for x in range(11,17):R[20][x]='r'
    _set(R,[(12,19),(12,21),(14,19),(14,21),(16,19),(16,21)],'r')
    _set(R,[(13,17),(14,17)],'W')
    return _img(R)

def make(name,head_fn,mat,extra=None,tee=False):
    m=types.ModuleType(name)
    A=tuple(max(0,int(c*.82)) for c in mat['J'])
    mat=dict(mat,A=A,Q=(mat.get('Y') if tee else A),U=(234,178,146))
    m.MYMAT=mat;m.head=head_fn
    def body(f=0):
        P=s3.body(f);b=f;scE=s3.scE
        k=[p[0] for p in P].index('T')
        back=s3.back_arm(b)
        P=(back+P) if stance.POSE in s3.WSW else P[:k+1]+back+P[k+1:]
        if tee and stance.POSE not in s3.ARMS:
            b=f;P.append(('Y','poly',sc([(36,8+b),(39,7+b),(41,11+b),(38,13+b)])))
        if tee and stance.POSE in s3.ARMS:
            sh,el,wr=s3.ARMS[stance.POSE];b=f
            P.insert(len(P)-2,('Y','poly',sc(s3._limb([(el[0]-1,el[1]+b),(wr[0],wr[1]+b)],6,5.4))))
        return P
    def details(img,f):
        # detalhes da jaqueta só em cima da jaqueta (não sobre o braço de trás); camiseta não tem zíper
        base=img.copy();s3.details(img,f)
        J=stance.MAT['J'];sh,hi,_=stance.shade_cols(J);ok={J,sh,hi,stance.MAT['T']}
        bp=base.load();ip=img.load()
        for y in range(img.height):
            for x in range(img.width):
                if ip[x,y]!=bp[x,y]:
                    c=bp[x,y][:3];new=ip[x,y][:3]
                    on_arm=bp[x,y][3] and c not in ok and y<img.height*.5 and x<img.width*.62 and x>img.width*.2
                    if on_arm or (tee and new==(110,112,130)):ip[x,y]=bp[x,y]
        if extra:extra(img,f)
        return img
    m.body=body;m.details=details;sys.modules[name]=m;return m
def q(x,y):return (round(x*S),round(y*S))
def _masked(img,draw_fn,mats=('J','T')):
    ok=set()
    for m in mats:
        c=stance.MAT[m];sh,hi,_=stance.shade_cols(c);ok|={c,sh,hi}
    ok|={(24,25,36),(20,22,32)}
    lay=Image.new('RGBA',img.size,(0,0,0,0));draw_fn(ImageDraw.Draw(lay))
    lp=lay.load();px=img.load()
    for y in range(img.height):
        for x in range(img.width):
            if lp[x,y][3] and px[x,y][3] and px[x,y][:3] in ok:px[x,y]=lp[x,y]
def red_details(img,f):
    _masked(img,lambda d:_red(d,f))
def _red(d,f):
    b=f;red=(226,40,40,255)
    hs=[6,5,7,4,6,5,7,5];x0,y0=q(18.5,16.5+b)
    for i,hh in enumerate(hs):d.line([(x0+i*2,y0),(x0+i*2,y0+hh)],fill=red)
    p=q(31,17+b);d.point(p,fill=red);d.point((p[0]+1,p[1]),fill=red);d.point((p[0],p[1]+1),fill=red)
    d.point(q(31,18.3+b),fill=(150,150,160,255));d.point(q(32.1,18.5+b),fill=(150,150,160,255))
def leather_details(img,f):
    J=stance.MAT['J'];sh,hi,_=stance.shade_cols(J);jset={J,sh,hi}
    px=img.load();W,H=img.size
    lay=Image.new('RGBA',img.size,(0,0,0,0));d=ImageDraw.Draw(lay);b=f
    gloss=(118,118,132,255);dark=(10,10,12,255);silver=(200,200,214,255)
    # golas (lapelas) com borda clara
    for poly in ([(23,2.5),(28.8,2.5),(26.6,11)],[(30,2.5),(34.5,3.5),(31,10)]):
        pts=[q(x,y+b) for x,y in poly];d.polygon(pts,fill=dark);d.line(pts[:2],fill=gloss)
    # zíper diagonal de jaqueta de motoqueiro
    d.line([q(32.5,6+b),q(28.4,24)],fill=silver)
    # brilhos do couro
    for a,c in [((17.5,6+b),(17,11+b)),((19,13+b),(18.6,17+b)),((33,12+b),(32.4,16+b)),((40,9+b),(43,7+b))]:d.line([q(*a),q(*c)],fill=gloss)
    # botões de pressão
    for x,y in [(24,4),(34,5),(17,20)]:d.point(q(x,y+b),fill=silver)
    lp=lay.load()
    for y in range(H):
        for x in range(W):
            if lp[x,y][3] and px[x,y][3] and px[x,y][:3] in jset:px[x,y]=lp[x,y]
def tee33_details(img,f):
    def dr(d):
        b=f;w=(240,240,240,255)
        for ox in (19,24):
            d.line([q(ox,16.5+b),q(ox+3.2,16.5+b),q(ox+1.4,19+b),q(ox+3.4,20.6+b),q(ox+2.6,23+b),q(ox,23+b)],fill=w,width=2)
    _masked(img,dr)
BLACK={'J':(36,37,50),'P':(52,62,104),'O':(30,30,36),'o':(236,236,240),'S':(234,178,146),'T':(14,14,18),'R':(228,52,44),'Z':(70,72,92),'C':(48,50,66),'L':(30,32,44)}
make('rub_red',head_plain,dict(BLACK,J=(30,30,40),C=(40,40,52),T=(16,16,20)),red_details)
make('rub_leather',head_glasses,dict(BLACK,J=(34,32,34),C=(26,24,26),R=(34,32,34),T=(16,16,20),Z=(170,170,184),P=(40,44,70)),leather_details)
make('rub_33',head_mask,dict(BLACK,J=(22,22,26),T=(22,22,26),C=(22,22,26),R=(22,22,26),Y=(234,178,146),P=(36,40,62)),tee33_details,tee=True)

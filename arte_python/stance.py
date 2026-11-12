from PIL import Image, ImageDraw
import sys;sys.path.insert(0,'/home/claude/pix')
from face import load as loadf
from face3 import FACE,PAL as FPAL
# materiais: cor base
POSE='idle';UPPER=None;SHIN=None
MAT={'J':(36,37,50),'P':(52,62,104),'O':(30,30,36),'o':(236,236,240),'S':(234,178,146),'T':(14,14,18),'R':(228,52,44)}
def shade_cols(c):
    sh=(int(c[0]*.62+20),int(c[1]*.6+16),int(c[2]*.7+40))
    if min(c)>195:sh=(int(c[0]*.8),int(c[1]*.8),int(c[2]*.82+10))
    hi=(min(255,int(c[0]*1.18+18)),min(255,int(c[1]*1.15+16)),min(255,int(c[2]*1.1+14)))
    ol=(int(c[0]*.35),int(c[1]*.32),int(c[2]*.42+10))
    return sh,hi,ol
def render(polys,w=56,h=48):
    # polys: lista (material, tipo, pontos)
    m=Image.new('L',(w,h),0);ids={};k=1
    d=ImageDraw.Draw(m)
    for mat,kind,pts in polys:
        if mat not in ids:ids[mat]=k;k+=1
        v=ids[mat]
        if kind=='poly':d.polygon(pts,fill=v)
        elif kind=='ell':d.ellipse(pts[0],fill=v)
        elif kind=='line':d.line(pts[:-1],fill=v,width=pts[-1])
    inv={v:k for k,v in ids.items()};M=m.load()
    out=Image.new('RGBA',(w,h),(0,0,0,0));O=out.load()
    for y in range(h):
        for x in range(w):
            v=M[x,y]
            if not v:continue
            mat=inv[v];c=MAT[mat];sh,hi,ol=shade_cols(c)
            g=lambda xx,yy:M[xx,yy] if 0<=xx<w and 0<=yy<h else 0
            col=c
            if mat not in('R','o','T'):
                if g(x-1,y+1)!=v or g(x-2,y+2)!=v and g(x-1,y)!=v:col=sh   # sombra fria embaixo/atrás
                if g(x-2,y)!=v and g(x,y+2)!=v:col=sh
                if g(x+1,y-1)!=v and g(x,y-1)!=v:col=hi                   # luz em cima/frente
            O[x,y]=col+(255,)
    # contorno colorido (borda externa e entre materiais)
    res=out.copy();R2=res.load()
    for y in range(h):
        for x in range(w):
            v=M[x,y]
            if v:
                # divisa entre materiais: escurece o pixel de cima/esquerda
                for dx,dy in((1,0),(0,1)):
                    xx,yy=x+dx,y+dy
                    if 0<=xx<w and 0<=yy<h and M[xx,yy] and M[xx,yy]!=v and inv[v] not in('R',) and inv[M[xx,yy]] not in('R',):
                        mat=inv[v];R2[x,y]=shade_cols(MAT[mat])[2]+(255,)
                continue
            nb=[M[x+dx,y+dy] for dx,dy in((1,0),(-1,0),(0,1),(0,-1)) if 0<=x+dx<w and 0<=y+dy<h and M[x+dx,y+dy]]
            if nb:R2[x,y]=shade_cols(MAT[inv[nb[0]]])[2]+(255,)
    return res
# corpo em pose de luta (de lado, joelhos dobrados, punhos erguidos)
def body_idle(f=0):
    b=f  # respiração
    P=[]
    # perna de trás
    P+=[('P','poly',[(19,26),(26,26),(22,35),(18,44),(13,44),(15,34)])]
    P+=[('O','poly',[(8,43),(18,43),(19,46),(7,46)]),('o','poly',[(7,46),(19,46),(19,47),(7,47)])]
    # braço de trás (punho no peito)
    P+=[('J','poly',[(14,4+b),(19,4+b),(21,13+b),(25,10+b),(27,13+b),(20,18+b),(15,14+b)])]
    P+=[('S','ell',[(24,8+b,30,14+b)])]
    # tronco inclinado
    P+=[('J','poly',[(15,1+b),(33,0+b),(36,6+b),(36,16+b),(33,27),(16,27),(13,17+b),(13,6+b)])]
    P+=[('T','poly',[(30,2+b),(34,2+b),(33,26),(29,26)])]
    for i,(x,h2) in enumerate([(18,6),(19,5),(21,6),(22,4),(23,6)]):P+=[('R','poly',[(x,7+b),(x,7+b+h2),(x,7+b+h2),(x,7+b)])]
    # quadril / perna da frente
    P+=[('P','poly',[(16,24),(33,24),(34,28),(30,28),(36,34),(37,44),(32,44),(31,36),(24,30),(17,30)])]
    P+=[('O','poly',[(30,43),(41,42),(44,45),(30,46)]),('o','poly',[(30,46),(44,45),(44,47),(30,47)])]
    # braço da frente erguido (guarda)
    P+=[('J','poly',[(30,3+b),(36,2+b),(40,12+b),(42,8+b),(46,6+b),(47,10+b),(42,16+b),(37,15+b),(33,11+b)])]
    P+=[('R','poly',[(37,7+b),(39,6+b),(40,9+b),(38,10+b)])]
    P+=[('S','ell',[(42,1+b,49,8+b)])]
    return P
def sprite(f=0):
    body=render(body_idle(f))
    head=loadf(FACE,FPAL)
    W,Hh=58,body.height+head.height-6
    c=Image.new('RGBA',(W,Hh),(0,0,0,0))
    c.paste(body,(0,head.height-6),body)
    c.paste(head,(12,0+(f)),head)
    return c
if __name__=='__main__':
    fr=[sprite(0),sprite(1)]
    bg=Image.new('RGBA',(150,100),(54,40,90,255))
    bg.paste(fr[0],(10,10),fr[0]);bg.paste(fr[1],(80,10),fr[1])
    bg.resize((bg.width*6,bg.height*6),Image.NEAREST).save('/home/claude/pix/stance.png')

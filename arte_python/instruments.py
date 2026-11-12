"""Instrumentos em pixel art: cada pixel e classificado analiticamente no
sistema de coordenadas do instrumento (u ao longo do braco, v perpendicular),
depois recebe bisel (luz em cima-direita, sombra embaixo-esquerda) e contorno."""
from PIL import Image, ImageDraw
import math
OUT=(16,10,20,255)
SC=1.3

def _ell(u,v,cu,cv,ru,rv):return ((u-cu)/ru)**2+((v-cv)/rv)**2<=1

def _render(fn,W,H,ox,oy,ang):
    """fn(u,v)->(material,color) ou None. ox,oy = origem (ponte) na imagem."""
    a=math.radians(ang);ca,sa=math.cos(a),math.sin(a)
    im=Image.new('RGBA',(W,H),(0,0,0,0));P=im.load();M={}
    for y in range(H):
        for x in range(W):
            dx,dy=x+.5-ox,y+.5-oy
            u=(dx*ca-dy*sa)/SC; v=(dx*sa+dy*ca)/SC
            r=fn(u,v)
            if r:M[x,y]=r[0];P[x,y]=r[1]+(255,)
    return im,P,M

def _bevel(P,M,W,H,mat,hi,sh):
    for (x,y),m in list(M.items()):
        if m!=mat:continue
        up=M.get((x,y-1));rt=M.get((x+1,y));dn=M.get((x,y+1));lf=M.get((x-1,y))
        if up is None or rt is None:P[x,y]=hi+(255,)
        elif dn is None or lf is None:P[x,y]=sh+(255,)

def _outline(im,col=OUT):
    w,h=im.size;P=im.load();o=im.copy();Q=o.load()
    for y in range(h):
        for x in range(w):
            if P[x,y][3]:continue
            for dx,dy in((1,0),(-1,0),(0,1),(0,-1)):
                xx,yy=x+dx,y+dy
                if 0<=xx<w and 0<=yy<h and P[xx,yy][3]:Q[x,y]=col;break
    return o

def _crop(im,ox,oy):
    b=im.getbbox();c=im.crop((b[0]-1,b[1]-1,b[2]+1,b[3]+1));c.anchor=(ox-b[0]+1,oy-b[1]+1);return c

def _mul(c,k):return tuple(max(0,min(255,int(v*k))) for v in c)

def guitar(body=(196,36,40),guard=(238,232,218),pick=None,neck=(126,80,44),head=None,angle=30,metal=(208,208,218)):
    """Guitarra estilo single-cut. angle negativo = braco subindo para a direita."""
    head=head or _mul(body,.55) if sum(body)>120 else (26,26,30)
    lt=_mul(body,1.35) if sum(body)>120 else (78,78,92)
    dk=_mul(body,.62)
    def fn(u,v):
        # corpo: bojo inferior grande + superior menor, recorte (cutaway) no lado de cima
        inb=_ell(u,v,-3,0,8.5,7.6) or _ell(u,v,4.2,.8,5.6,5.6)
        if inb and _ell(u,v,9.8,-4.4,4.2,3.6):inb=False
        if inb:
            # ferragens
            for pu in(-2.4,3):
                if pu<=u<=pu+2.2 and abs(v)<=2.9:
                    pc=pick or metal
                    return('p',_mul(pc,.78) if (u-pu)<.5 or abs(v)>2.4 else pc)
            if -6.4<=u<=-5 and abs(v)<=2.9:return('p',_mul(metal,.8))
            if _ell(u,v,-7.5,4.4,.9,.9) or _ell(u,v,-4.8,5.4,.9,.9):return('k',(236,210,120))
            if (u>-4 and u<6) and v>2.8 and v<5.6+(u*-.15):return('g',guard)
            
            # sombreamento suave: metade de baixo (v>0) mais escura
            if v>3.4 and u<2:return('b',dk)
            return('b',body)
        # braco
        if 9<=u<=29 and abs(v)<=1.5:
            if int(u)%4==0:return('n',_mul(neck,.7))
            if int(u) in(14,18,22,26) and abs(v)<.7:return('n',(240,236,224))
            return('n',neck if v>-.6 else _mul(neck,1.3))
        # mao (headstock) com tarraxas
        if 29<u<=35 and -2.2-(u-29)*.15<=v<=2.2:
            if u>30 and int(u)%2==1 and (v<-1.6 or v>1.6):return('t',metal)
            return('h',head)
        if 30<u<35 and int(u)%2==1 and (-3.3<v<-1.9 or 1.9<v<3.3):return('t',metal)
        return None
    W,H=90,80;im,P,M=_render(fn,W,H,22,55,angle)
    _bevel(P,M,W,H,'b',lt,dk)
    return _crop(_outline(im),22,55)

def bass(body=(214,232,208),neck=(214,170,104),angle=28,stickers=True,metal=(208,208,218)):
    """Baixo estilo offset (dois chifres), escudo preto, braco longo."""
    lt=_mul(body,1.1);dk=_mul(body,.74)
    def fn(u,v):
        inb=_ell(u,v,-4,0,9.5,8.2) or _ell(u,v,5,-.3,6.5,6.4)
        # chifres
        if _ell(u,v,9,-5.2,4.2,2.2) or _ell(u,v,7.5,5.4,3.2,2):inb=True
        if _ell(u,v,12.2,-1.6,3.2,3.0) or _ell(u,v,10.5,2.6,2.6,2.2):inb=False
        if inb:
            if stickers:
                for (su,sv,c) in [(-10,-3,(240,90,40)),(-8,5,(240,200,40)),(-2,6.4,(60,140,220)),(6,-5,(230,60,150)),(-11,2.5,(255,255,255)),(1,-6.4,(80,190,90))]:
                    if _ell(u,v,su,sv,1.2,1.2):return('k',c)
            if -1.8<=u<=.6 and -2.8<=v<=1.6:return('p',(30,30,34) if (u<-1.2 or u>0) else (60,60,66))
            if 3<=u<=5.2 and -.6<=v<=2.8:return('p',(30,30,34) if (u<3.6 or u>4.6) else (60,60,66))
            if -7.4<=u<=-6.2 and abs(v)<=2.6:return('p',metal)
            if _ell(u,v,-8,5.2,1,1) or _ell(u,v,-5.4,6,1,1):return('k',metal)
            
            # escudo preto (tortoise escuro)
            if -6<u<10 and -5.4<v<5.2 and _ell(u,v,1.5,0,9,5.6):return('g',(28,26,30))
            return('b',body)
        if 11<=u<=38 and abs(v)<=1.7:
            if int(u)%4==0:return('n',_mul(neck,.72))
            if int(u) in(18,22,26,30,34) and abs(v)<.7:return('n',(30,30,34))
            return('n',neck if v>-.5 else _mul(neck,1.18))
        if 38<u<=45 and -2.6<=v<=2.2+(u-38)*.1:
            if int(u)%3==1 and v<-1.8:return('t',metal)
            return('h',neck)
        if 39<u<45 and int(u)%3==1 and -4<v<-2.4:return('t',metal)
        return None
    W,H=110,90;im,P,M=_render(fn,W,H,22,68,angle)
    _bevel(P,M,W,H,'b',lt,dk);_bevel(P,M,W,H,'g',(70,66,76),(16,14,18))
    return _crop(_outline(im),22,68)

def strap(d,p0,p1,col=(236,236,240,255)):
    d.line([p0,p1],fill=OUT,width=4);d.line([p0,p1],fill=col,width=2)

if __name__=='__main__':
    ims=[guitar(),guitar((24,24,28)),bass()]
    W=sum(i.width for i in ims)+40;H=max(i.height for i in ims)+10
    bg=Image.new('RGBA',(W,H),(46,34,80,255));x=8
    for im in ims:bg.paste(im,(x,5),im);x+=im.width+12
    bg.resize((W*8,H*8),Image.NEAREST).save('/home/claude/pix/instr.png')

def place(img,inst,at):
    """cola o instrumento com a ponte (ancora) no ponto 'at' do sprite"""
    img.alpha_composite(inst,(int(at[0]-inst.anchor[0]),int(at[1]-inst.anchor[1])))

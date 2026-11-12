"""Máscara provisória (original) aplicada sobre a cabeça de cada personagem no modo FÚRIA."""
from PIL import Image
COL={'rub':(204,32,44),'vocal':(236,232,224),'guitar':(38,38,46),'guitar2':(176,182,196),'baixo':(56,168,92),'batera':(222,170,42),'dj':(150,70,212),'angelo':(60,176,90),'feijao':(232,190,40),'bebado':(200,200,200),'vilao1':(200,200,200),'vilao2':(200,200,200),'vilao3':(200,200,200),'vilao4':(200,200,200),'vilao5':(200,200,200)}
def is_skin(c):
    r,g,b,a=c
    return a and r>105 and r>g>b and r-b>35 and r-g<80
def masked(hd,key):
    col=COL['rub' if key.startswith('rub') else key]
    im=hd.copy();P=im.load();w,h=im.size
    skin=[(x,y) for y in range(h) for x in range(w) if is_skin(P[x,y]) and y<h*.78]
    if not skin:return im
    ys=[y for _,y in skin];xs=[x for x,_ in skin]
    y0,y1=min(ys),max(ys);x0,x1=min(xs),max(xs)
    lums=[sum(P[x,y][:3])/3 for x,y in skin];avg=sum(lums)/len(lums)
    region=set()
    for y in range(y0,int(y0+(y1-y0)*.92)+1):
        row=[x for x in range(w) if P[x,y][3] and x0<=x<=x1]
        for x in row:
            c=P[x,y]
            if is_skin(c) or (sum(c[:3])/3<120 and y<y0+(y1-y0)*.62):region.add((x,y))
    for x,y in region:
        c=P[x,y];l=sum(c[:3])/3
        if l<90 and not is_skin(c):  # olhos/sobrancelhas -> furos escuros
            P[x,y]=(10,8,14,255) if col[0]+col[1]>200 else (240,240,240,255);continue
        k=max(.7,min(1.18,l/avg))
        P[x,y]=tuple(max(0,min(255,int(v*k))) for v in col)+(255,)
    # risco central brilhante
    cx=(x0+x1)//2+2
    for y in range(y0+1,y0+5):
        if (cx,y) in region:P[cx,y]=(255,255,255,255) if sum(col)<500 else (230,40,50,255)
    return im

def balaclava(hd):
    """Touca ninja preta de 3 furos (olhos e boca) cobrindo cabeça, barba e pescoço."""
    im=hd.copy();P=im.load();w,h=im.size
    EYE={(246,240,224),(40,24,18),(24,24,28)};LIP={(176,90,84),(246,240,224)}
    eyes=[(x,y) for y in range(h) for x in range(5,w-3) if P[x,y][3] and P[x,y][:3] in EYE and h*.3<y<h*.55]
    mouth=[(x,y) for y in range(h) for x in range(w) if P[x,y][3] and P[x,y][:3] in LIP and y>=h*.55]
    keep=set()
    if eyes:
        ys=[y for _,y in eyes];xs=[x for x,_ in eyes];ey0,ey1=min(ys)-1,max(ys)+1
        # dois furos separados (olho esquerdo/direito)
        mid=(min(xs)+max(xs))/2
        for side in ([x for x in xs if x<mid],[x for x in xs if x>=mid]):
            if not side:continue
            for y in range(ey0,ey1+1):
                for x in range(max(7,min(side)-1),max(side)+2):keep.add((x,y))
    if mouth:
        ys=[y for _,y in mouth];xs=[x for x,_ in mouth]
        cx=(min(xs)+max(xs))/2;cy=(min(ys)+max(ys))/2
        for y in range(min(ys)-1,max(ys)+2):
            for x in range(min(xs),max(xs)+1):
                if ((x-cx)/((max(xs)-min(xs))/2+1))**2+((y-cy)/((max(ys)-min(ys))/2+1.5))**2<=1.05:keep.add((x,y))
    base=(30,30,34);rib=(44,44,52);dk=(18,18,22);hi=(62,62,72)
    src=hd.load()
    for y in range(h):
        for x in range(w):
            if not P[x,y][3] or (x,y) in keep:continue
            # contorno original fica escuro
            edge=any(not(0<=x+dx<w and 0<=y+dy<h) or not src[x+dx,y+dy][3] for dx,dy in((1,0),(-1,0),(0,1),(0,-1)))
            if edge:P[x,y]=(12,10,14,255);continue
            c=rib if x%2==0 else base
            if x<w*.3:c=dk if x%2 else base
            if y<h*.25 and x>w*.55 and x%2==0:c=hi
            P[x,y]=c+(255,)
    # borda dos furos (tricô mais escuro)
    for (x,y) in list(keep):
        for dx,dy in((1,0),(-1,0),(0,1),(0,-1)):
            q=(x+dx,y+dy)
            if q not in keep and 0<=q[0]<w and 0<=q[1]<h and P[q][3]:P[q]=(14,14,18,255)
    return im
_old_masked=masked
def masked(hd,key):
    if key=='baixo':return balaclava(hd)
    return _old_masked(hd,key)
def masked2(hd,key):
    """(imagem, deslocamento) para o jogo"""
    if key.startswith('rub'):return white_horns(hd)
    return masked(hd,key),(0,0)

from PIL import ImageDraw
def white_horns(hd):
    """Máscara branca no rosto (furos nos olhos) + chifres de bode curvados.
    Retorna (imagem, deslocamento) porque os chifres passam do tamanho da cabeça."""
    im=hd.copy();P=im.load();w,h=im.size
    skin=[(x,y) for y in range(h) for x in range(w) if is_skin(P[x,y]) and y<h*.72]
    xs=[x for x,_ in skin];x0,x1=min(xs),max(xs)
    def edge(x,y):return any(not(0<=x+dx<w and 0<=y+dy<h) or not P[x+dx,y+dy][3] for dx,dy in((1,0),(-1,0),(0,1),(0,-1)))
    for y in range(9,20):
        for x in range(x0,x1+1):
            if not P[x,y][3] or edge(x,y):continue
            sh=(206,202,196) if x<x0+3 else (226,222,216) if y>=17 else (242,240,234)
            P[x,y]=sh+(255,)
    for (cx,cy) in ((7.5,14.5),(18.5,14.5)):
        for y in range(13,17):
            for x in range(5,22):
                if ((x+.5-cx-.5)/2.3)**2+((y+.5-cy-.5)/1.5)**2<=1:P[x,y]=(14,10,16,255)
    for (x,y) in ((5,12),(6,12),(9,12),(10,12),(16,12),(17,12),(20,12),(21,12)):P[x,y]=(150,146,150,255)
    for (x,y) in ((14,9),(13,10),(14,11),(13,12)):P[x,y]=(200,30,40,255)
    pad=10
    c=Image.new('RGBA',(w+pad*2,h+pad),(0,0,0,0));c.alpha_composite(im,(pad,pad))
    d=ImageDraw.Draw(c);bone=(236,228,206,255);sh=(170,156,128,255);ol=(26,18,20,255)
    top=pad
    L=[(pad+7,top+7),(pad+3,top+2),(pad-2,top+1),(pad-6,top+4),(pad-7,top+9),(pad-4,top+12)]
    R=[(pad+w-7,top+7),(pad+w-3,top+2),(pad+w+2,top+1),(pad+w+6,top+4),(pad+w+7,top+9),(pad+w+4,top+12)]
    for pts in (L,R):
        d.line(pts,fill=ol,width=7,joint='curve');d.line(pts,fill=bone,width=5,joint='curve')
        for a,b in zip(pts[:-1],pts[1:]):
            mx,my=(a[0]+b[0])//2,(a[1]+b[1])//2;d.line([(mx-1,my-1),(mx+1,my+1)],fill=sh)
        d.point(pts[-1],fill=sh)
    return c,(-pad,-pad)

# ---------- máscaras do cartaz ----------
def _face(hd):
    P=hd.load();w,h=hd.size
    skin=[(x,y) for y in range(h) for x in range(w) if is_skin(P[x,y]) and y<h*.8]
    xs=[x for x,_ in skin];ys=[y for _,y in skin]
    x0,x1,y0,y1=min(xs),max(xs),min(ys),max(ys)
    whites=[(x,y) for y in range(y0,y1) for x in range(x0,x1+1) if P[x,y][3] and min(P[x,y][:3])>215 and y<y0+(y1-y0)*.6]
    if whites:
        mid=(min(x for x,_ in whites)+max(x for x,_ in whites))/2
        L=[p for p in whites if p[0]<mid];R=[p for p in whites if p[0]>=mid]
        ctr=lambda S:(sum(x for x,_ in S)/len(S),sum(y for _,y in S)/len(S))
        eyes=[ctr(L),ctr(R)] if L and R else [ctr(whites)]
    else:
        ey=y0+(y1-y0)*.4;eyes=[(x0+(x1-x0)*.3,ey),(x0+(x1-x0)*.72,ey)]
    return skin,(x0,x1,y0,y1),eyes
def _edge(P,w,h,x,y):return any(not(0<=x+dx<w and 0<=y+dy<h) or not P[x+dx,y+dy][3] for dx,dy in((1,0),(-1,0),(0,1),(0,-1)))
def _ell(P,cx,cy,rx,ry,col,w,h):
    for y in range(int(cy-ry-1),int(cy+ry+2)):
        for x in range(int(cx-rx-1),int(cx+rx+2)):
            if 0<=x<w and 0<=y<h and P[x,y][3] and ((x+.5-cx)/rx)**2+((y+.5-cy)/ry)**2<=1:P[x,y]=col
def red_spikes(hd):
    """Johnny B.: máscara vermelha cobrindo a cabeça toda, boca grande costurada e coroa de espinhos de metal."""
    im=hd.copy();P=im.load();w,h=im.size;skin,(x0,x1,y0,y1),eyes=_face(hd)
    base=(184,34,30);dk=(120,18,20);hi=(222,70,56)
    for y in range(h):
        for x in range(w):
            if not P[x,y][3]:continue
            if _edge(P,w,h,x,y):P[x,y]=(40,8,10,255);continue
            c=hi if (x>w*.55 and y<h*.35) else dk if x<w*.3 or y>h*.82 else base
            P[x,y]=c+(255,)
    for ex,ey in eyes:_ell(P,ex+.5,ey+.5,2.2,1.6,(12,6,8,255),w,h)
    my=y1-1;mx=(x0+x1)/2+1
    _ell(P,mx,my,4.2,2.6,(16,6,8,255),w,h)
    for x in range(int(mx-3),int(mx+4),2):
        for y in (int(my-2),int(my+2)):
            if 0<=x<w and 0<=y<h and P[x,y][3]:P[x,y]=(220,210,190,255)
    pad=7;c=Image.new('RGBA',(w,h+pad),(0,0,0,0));c.alpha_composite(im,(0,pad));d=ImageDraw.Draw(c)
    top=min(y for y in range(h) for x in range(w) if P[x,y][3])+pad
    for i,sx in enumerate(range(int(w*.22),int(w*.86),4)):
        hh=6 if i%2==0 else 4
        d.polygon([(sx-2,top+2),(sx+2,top+2),(sx,top+2-hh)],fill=(28,26,30,255))
        d.polygon([(sx-1,top+2),(sx+1,top+2),(sx,top+3-hh)],fill=(200,200,212,255))
    return c,(0,-pad)
def led_hood(hd):
    """Alisson: capuz vermelho + máscara preta com riscos de LED vermelho."""
    im=hd.copy();P=im.load();w,h=im.size;skin,(x0,x1,y0,y1),eyes=_face(hd)
    face=set()
    for y in range(y0,min(h,y1+3)):
        for x in range(x0,x1+1):
            if P[x,y][3]:face.add((x,y))
    for y in range(h):
        for x in range(w):
            if not P[x,y][3]:continue
            if _edge(P,w,h,x,y):P[x,y]=(30,6,8,255);continue
            if (x,y) in face:P[x,y]=(22,20,26,255)
            else:P[x,y]=((150,22,28) if x<w*.3 else (204,40,44))+(255,)
    neon=(255,40,50,255);glow=(150,20,30,255)
    for ex,ey in eyes:
        for k in range(-2,3):
            for (px,py) in ((int(ex+k),int(ey+k*.6)),(int(ex+k),int(ey-k*.6))):
                if (px,py) in face:P[px,py]=neon
    my=y1;mx=(x0+x1)/2
    for x in range(int(mx-4),int(mx+5)):
        if (x,my) in face:P[x,my]=neon
        if x%2==0:
            for yy in (my-1,my+1):
                if (x,yy) in face:P[x,yy]=glow
    return im,(0,0)
def skull_red(hd):
    """Matheus: caveira branca com olhos vermelhos brilhando."""
    im=hd.copy();P=im.load();w,h=im.size;skin,(x0,x1,y0,y1),eyes=_face(hd)
    for y in range(y0,y1+3):
        for x in range(x0,x1+1):
            if 0<=y<h and P[x,y][3] and not _edge(P,w,h,x,y):
                P[x,y]=((206,204,196) if x<x0+3 else (236,234,226))+(255,)
    for ex,ey in eyes:
        _ell(P,ex+.5,ey+.6,2.6,2.2,(14,8,10,255),w,h)
        P[int(ex),int(ey)]=(255,40,40,255)
        if 0<=int(ex)+1<w:P[int(ex)+1,int(ey)]=(200,20,24,255)
    nx=int((eyes[0][0]+eyes[-1][0])/2);ny=int(eyes[0][1]+4)
    for (dx,dy) in ((0,0),(-1,1),(1,1),(0,1)):
        if 0<=ny+dy<h:P[nx+dx,ny+dy]=(30,20,22,255)
    ty=y1
    for x in range(nx-4,nx+5):
        if 0<=ty<h and P[x,ty][3]:P[x,ty]=(30,20,22,255) if x%2==0 else (226,222,210,255)
        if 0<=ty-1<h and P[x,ty-1][3]:P[x,ty-1]=(226,222,210,255) if x%2==0 else (150,146,140,255)
    return im,(0,0)
def black_mask(hd):
    """Juninho: máscara preta de látex com furos dos olhos e da boca."""
    im=hd.copy();P=im.load();w,h=im.size;skin,(x0,x1,y0,y1),eyes=_face(hd)
    for y in range(y0-1,y1+3):
        for x in range(x0,x1+1):
            if 0<=y<h and P[x,y][3] and not _edge(P,w,h,x,y):
                c=(58,56,62) if (x+y)%5==0 else (42,40,46)
                if x>x0+(x1-x0)*.6 and y<y0+(y1-y0)*.5:c=(78,76,84) if (x+y)%3==0 else c
                if x<x0+3:c=(28,26,30)
                P[x,y]=c+(255,)
    for ex,ey in eyes:
        _ell(P,ex+.5,ey+.5,2.4,1.6,(10,8,10,255),w,h)
        P[int(ex),int(ey)]=(214,166,136,255);P[int(ex)+1,int(ey)]=(40,26,20,255)
    _ell(P,(x0+x1)/2+1,y1,2.4,1.4,(10,8,10,255),w,h)
    return im,(0,0)
_prev_masked2=masked2
def masked2(hd,key):
    if key=='vocal':return red_spikes(hd)
    if key=='batera':return led_hood(hd)
    if key=='guitar2':return skull_red(hd)
    if key=='guitar':return black_mask(hd)
    return _prev_masked2(hd,key)

def white_horns_any(hd):
    """Máscara branca com chifres para qualquer cabeça (detecta rosto e olhos)."""
    im=hd.copy();P=im.load();w,h=im.size;skin,(x0,x1,y0,y1),eyes=_face(hd)
    ytop=y0;ybot=int(y0+(y1-y0)*.72)
    for y in range(ytop,ybot+1):
        for x in range(x0,x1+1):
            if P[x,y][3] and not _edge(P,w,h,x,y):
                sh=(206,202,196) if x<x0+3 else (242,240,234)
                P[x,y]=sh+(255,)
    for ex,ey in eyes:_ell(P,ex+.5,ey+.5,2.3,1.4,(14,10,16,255),w,h)
    cx=int((x0+x1)/2)+1
    for i,(dx,dy) in enumerate([(0,0),(-1,1),(0,2),(-1,3)]):
        if 0<=ytop+dy<h and P[cx+dx,ytop+dy][3]:P[cx+dx,ytop+dy]=(200,30,40,255)
    pad=10
    c=Image.new('RGBA',(w+pad*2,h+pad),(0,0,0,0));c.alpha_composite(im,(pad,pad))
    d=ImageDraw.Draw(c);bone=(236,228,206,255);shc=(170,156,128,255);ol=(26,18,20,255)
    top=pad+min(y for y in range(h) for x in range(w) if P[x,y][3])
    L=[(pad+7,top+7),(pad+3,top+2),(pad-2,top+1),(pad-6,top+4),(pad-7,top+9),(pad-4,top+12)]
    R=[(pad+w-7,top+7),(pad+w-3,top+2),(pad+w+2,top+1),(pad+w+6,top+4),(pad+w+7,top+9),(pad+w+4,top+12)]
    for pts in (L,R):
        d.line(pts,fill=ol,width=7,joint='curve');d.line(pts,fill=bone,width=5,joint='curve')
        for a,b in zip(pts[:-1],pts[1:]):
            mx,my=(a[0]+b[0])//2,(a[1]+b[1])//2;d.line([(mx-1,my-1),(mx+1,my+1)],fill=shc)
    return c,(-pad,-pad)
_prev2=masked2
def masked2(hd,key):
    if key in('angelo','feijao'):return white_horns_any(hd)
    return _prev2(hd,key)

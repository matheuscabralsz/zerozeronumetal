import sys;sys.path.insert(0,'/home/claude/pix')
import stance, stance3 as s3, instruments
from PIL import Image, ImageChops
RUBMAT=dict(stance.MAT)
import importlib
CFG={ # modulo: (head x, ajuste off, altura render, UPPER, SHIN)
 'rubao':('stance3',17,-8,64,None,None),
 'vocal':('vocal',17,-8,64,None,None),
 'guitar':('guitar',22,-5,64,None,None),
 'guitar2':('guitar2',19,-8,64,None,None),
 'baixo':('baixo',18,-10,90,'Y','L'),
 'batera':('batera3',18,-7,64,None,None),
 'angelo':('angelo',18,-14,90,None,None),
 'feijao':('feijao',18,-7,64,None,'L'),
 'bebado':('bebado',21,-6,64,None,None),
 'vilao1':('vilao1',15,-6,64,None,None),
 'vilao2':('vilao2',15,-6,64,None,None),
 'vilao3':('vilao3',15,-6,90,None,None),
 'vilao4':('vilao4',15,-6,90,None,None),
 'vilao5':('vilao5',15,-6,90,None,None),
 'dj':('dj',19,-8,64,None,None),
}
FRAMES=[('idle0','idle',0),('idle1','idle',1),('walk0','walk0',0),('walk1','walk1',1),('walk2','walk2',0),('walk3','walk3',1),
        ('punch','punch',0),('punchB','punchB',0),('axeUp','axeUp',0),('axeDown','axeDown',0),('punch2','punch2',0),('kick','kick',0),('jump','jump',0),('hurt','idle',1),('play','play',0),('play2','play2',0),('playA','play',0),('play2A','play2',0)]
HEADSH={'punchB':(1,0),'axeUp':(-1,0),'axeDown':(2,1),'kick':(-2,1),'hurt':(-3,1),'punch':(1,0),'punch2':(1,0)}
W=104
def build(key):
    modn,hx,offd,RH,UP,SH=CFG[key];M=importlib.import_module(modn)
    mat=RUBMAT if key=='rubao' else M.MYMAT
    hd=M.head();off=hd.height+offd
    out={};fists={};bfists={};hpos={}
    for name,pose,f in FRAMES:
        stance.MAT.clear();stance.MAT.update(RUBMAT);stance.MAT.update(mat)
        def render(p):
            stance.POSE=p;stance.UPPER=UP if p in s3.ARMS else None;stance.SHIN=SH if p!='idle' else None
            return stance.render(M.body(f),W,RH)
        base=render(pose);idle=render('idle')
        if name.endswith('A'):
            s3.ARMMAT='X'
            try:
                stance.POSE=pose;stance.UPPER=UP if pose in s3.ARMS else None;stance.SHIN=None
                MB={'Z':'S','XQ':'Q','ZU':'U'}
                PP=[(MB[m],k,pts) for m,k,pts in M.body(f) if m in MB]
            finally:s3.ARMMAT=None
            arm=stance.render(PP,W,RH)
            stance.POSE='idle';stance.UPPER=None;stance.SHIN=None
            c=Image.new('RGBA',(W,RH+off+4),(0,0,0,0));c.alpha_composite(arm,(0,off));out[name]=c
            fists[name]=fists.get(name[:-1],(0,0));hpos[name]=(hx,f);continue
        placed=[];orig=instruments.place;origs=instruments.strap
        instruments.place=lambda img,inst,at:placed.append((inst,at));instruments.strap=lambda *a,**k:None
        stance.POSE=pose
        det=M.details(base.copy(),f);instruments.place=orig;instruments.strap=origs
        # pixels de detalhe: os que mudaram, apenas onde a base nao mudou em relacao a pose parada
        changed=ImageChops.difference(det,base).convert('L').point(lambda v:255 if v else 0)
        same=ImageChops.difference(base,idle).convert('L').point(lambda v:0 if v else 255)
        mask=ImageChops.multiply(changed,same)
        # detalhes da roupa (listras, estampas) ficam sempre que caírem na camiseta/jaqueta
        okc=set()
        for m in ('J','T','C'):
            if m in stance.MAT:
                c0=stance.MAT[m];sh_,hi_,_=stance.shade_cols(c0);okc|={c0,sh_,hi_}
        bp=base.load();mp=mask.load();cp=changed.load()
        for yy in range(base.height):
            for xx in range(base.width):
                if cp[xx,yy] and not mp[xx,yy] and bp[xx,yy][3] and bp[xx,yy][:3] in okc and yy<base.height*.62:mp[xx,yy]=255
        img=base.copy();img.paste(det,(0,0),mask)
        stance.POSE=pose;stance.UPPER=UP if pose in s3.ARMS else None;stance.SHIN=SH if pose!='idle' else None
        pl=M.body(f);fp=[p for p in pl if p[0]=='S'][-1]
        fm=stance.render([fp],W,RH).getbbox()
        fists[name]=((fm[0]+fm[2])/2,(fm[1]+fm[3])/2+off)
        bu=[p for p in pl if p[0]=='U']
        if bu:
            bm=stance.render([bu[-1]],W,RH).getbbox();bfists[name]=((bm[0]+bm[2])/2,(bm[1]+bm[3])/2+off)
        stance.POSE='idle';stance.UPPER=None;stance.SHIN=None
        c=Image.new('RGBA',(W,RH+off+4),(0,0,0,0));c.alpha_composite(img,(0,off))
        dx,dy=HEADSH.get(name,(0,0))
        c.alpha_composite(hd,(hx+dx,max(0,f+dy)));hpos[name]=(hx+dx,max(0,f+dy))
        out[name]=c
    # recorte comum a todos os quadros
    bb=None
    for im in out.values():
        b=im.getbbox();bb=b if bb is None else (min(bb[0],b[0]),min(bb[1],b[1]),max(bb[2],b[2]),max(bb[3],b[3]))
    global BFISTS;BFISTS={k:(round(v[0]-bb[0],1),round(v[1]-bb[1],1)) for k,v in bfists.items()}
    global HPOS,HEADIMG;HPOS={k:(v[0]-bb[0],v[1]-bb[1]) for k,v in hpos.items()};HEADIMG=hd
    global FISTS;FISTS={k:(round(v[0]-bb[0],1),round(v[1]-bb[1],1)) for k,v in fists.items()}
    global HEADC;HEADC=(hx+hd.width//2-bb[0],max(0,0-bb[1]),hd.height)
    return {k:v.crop(bb) for k,v in out.items()}
if __name__=='__main__':
    keys=sys.argv[1].split(',');rows=[]
    for k in keys:
        fr=build(k);rows.append(list(fr.values()))
    fw=max(i.width for r in rows for i in r);fh=max(i.height for r in rows for i in r)
    n=len(rows[0]);sheet=Image.new('RGBA',(n*(fw+4),len(rows)*(fh+4)),(60,44,96,255))
    for j,r in enumerate(rows):
        for i,im in enumerate(r):sheet.alpha_composite(im,(i*(fw+4),j*(fh+4)+fh-im.height))
    sheet.resize((sheet.width*3,sheet.height*3),Image.NEAREST).save(sys.argv[2])

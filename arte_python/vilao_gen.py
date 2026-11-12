import re
src=open('bebado.py').read()
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
ST=[None,
 dict(S=(238,190,162),s=(206,152,126),R=(236,150,140),H=(176,140,70),h=(214,180,100),E=(70,90,60),W=(240,236,220),L=(200,140,120),N=(220,160,140),M=(190,110,100),D=(80,30,30),K=(50,30,22),
      kx=1.05,ky=1.0,belly=(16,10,35,27),shirt=(228,232,196),skinbelly=False,sleeve=True,horns=0,fangs=False,ears=False,tail=False,glow=None),
 dict(S=(228,166,146),s=(196,128,110),R=(220,90,90),H=(150,110,56),h=(190,150,80),E=(232,196,40),W=(236,224,170),L=(170,100,90),N=(206,120,110),M=(160,70,70),D=(60,16,20),K=(50,24,22),
      kx=1.12,ky=1.02,belly=(15,9,36,28),shirt=(214,214,170),skinbelly=False,sleeve=True,horns=2,fangs=False,ears=False,tail=False,glow=(232,196,40)),
 dict(S=(208,116,100),s=(170,82,72),R=(196,60,60),H=(90,50,30),h=(130,74,40),E=(255,210,40),W=(255,240,120),L=(140,60,56),N=(180,80,70),M=(120,30,36),D=(40,6,10),K=(46,16,16),
      kx=1.22,ky=1.05,belly=(14,8,37,29),shirt=(196,196,150),skinbelly=True,sleeve=True,horns=4,fangs=True,ears=False,tail=False,glow=(255,200,40)),
 dict(S=(178,62,58),s=(136,40,40),R=(150,30,36),H=(50,20,20),h=(80,30,30),E=(255,150,30),W=(255,190,60),L=(110,30,34),N=(150,46,46),M=(80,14,20),D=(24,4,6),K=(36,10,12),
      kx=1.34,ky=1.08,belly=(13,7,38,30),shirt=(170,170,128),skinbelly=True,sleeve=False,horns=7,fangs=True,ears=True,tail=True,glow=(255,140,30)),
 dict(S=(128,30,40),s=(92,18,28),R=(100,14,24),H=(60,10,16),h=(90,20,26),E=(255,236,60),W=(255,236,60),L=(70,10,16),N=(110,24,32),M=(40,6,10),D=(14,2,4),K=(24,6,8),
      kx=1.5,ky=1.12,belly=(11,5,40,32),shirt=(150,150,110),skinbelly=True,sleeve=False,horns=11,fangs=True,ears=True,tail=True,glow=(255,236,60),bald=True,grin=True)]
for n in range(1,6):
    c=ST[n];rows=[r.ljust(28,'.')[:28] for r in FACE.strip('\n').split('\n')]
    if c.get('bald'):rows=[r.replace('H','S').replace('h','s') if i>=3 else r.replace('H','s').replace('h','s') for i,r in enumerate(rows)]
    if c.get('grin'):
        rows[15]='...KsSSMMMMMMMMMMSSsK.......'.ljust(28,'.')
        rows[16]='...KsSMDTDTDTDTDTMSsK.......'.ljust(28,'.')
        rows[17]='...KssMDDDDDDDDDDMssK.......'.ljust(28,'.')
        rows[18]='...KssSMTDTDTDTDMSssK.......'.ljust(28,'.')
    pal={'.':None,'T':(240,236,210)}
    for k in 'SsRHhEWLNMDK':pal[k]=c[k]
    s=src
    i=s.index('PAL=');j=s.index('"""',s.index('FACE=r"""')+9)+3
    s=s[:i]+'PAL='+repr(pal)+'\nFACE=r"""\n'+'\n'.join(rows)+'\n"""'+s[j:]
    s=s.replace("CX,BY,KX,KY=33,59,1.25,1.0",f"CX,BY,KX,KY=33,59,{c['kx']},{c['ky']}")
    if c['ky']>1:s=s.replace("def T(x,y):return (round(CX+(x-CX)*KX),round(BY-(BY-y)*KY))","def T(x,y):return (round(CX+(x-CX)*KX),round(BY-(BY-y)*KY+BY*(KY-1)+2))")
    bx=c['belly']
    s=s.replace("belly=[('J','ell',[s3.scE((15,9+b,36,28+b))]),('V','ell',[s3.scE((19,22+b,31,28.5+b))])]",
      f"belly=[('J','ell',[s3.scE(({bx[0]},{bx[1]}+b,{bx[2]},{bx[3]}+b))])]"+(f"+[('V','ell',[s3.scE(({bx[0]+5},{bx[1]+9}+b,{bx[2]-5},{bx[3]+.5}+b))])]" if c['skinbelly'] else "")+
      ("\n    if True:P.insert(0,('Z','poly',sc([(14,26),(6,24),(1,18),(3,14),(5,18),(9,21),(15,22)])))" if c['tail'] else ""))
    sk=c['S'];shirt=c['shirt']
    mat={'J':shirt,'T':shirt,'C':shirt,'V':sk,'P':(40,48,72),'Y':sk,'A':tuple(int(v*.9) for v in shirt) if c['sleeve'] else sk,'Q':shirt if c['sleeve'] else sk,'U':sk,'S':sk,'O':(30,26,30),'o':(170,160,150),'Z':c['R']}
    if not c['sleeve']:mat['J']=shirt
    i=s.index("MYMAT=");j=s.index("\n",i);s=s[:i]+"MYMAT="+repr(mat)+s[j:]
    # cabeça com chifres/orelhas sobre tela com margem
    hz=c['horns'];ears=c['ears'];fangs=c['fangs']
    s=s.replace("def head():","def _head0():",1)
    s+=f'''
def head():
    h=_head0();PADX,PADT=6,12
    c=Image.new('RGBA',(h.width+PADX*2,h.height+PADT),(0,0,0,0));c.alpha_composite(h,(PADX,PADT));d=ImageDraw.Draw(c)
    hz={hz}
    if hz:
        bone=(236,224,196,255) if hz<9 else (60,40,40,255);sh=(170,150,120,255) if hz<9 else (30,20,20,255);ol=(30,10,12,255)
        for side in (-1,1):
            bx=PADX+(8 if side<0 else 18);by=PADT+2
            pts=[(bx,by+2)]
            for k in range(1,hz+1):pts.append((bx+side*(k*.55),by+2-k*1.05+(k*k*.05)))
            d.line(pts,fill=ol,width=4 if hz<6 else 6);d.line(pts,fill=bone,width=2 if hz<6 else 4)
            d.point(pts[-1],fill=sh)
    if {ears}:
        for x,y in ((PADX+1,PADT+9),(PADX+0,PADT+8),(PADX-1,PADT+7)):c.putpixel((x,y),{tuple(c['S'])+(255,)})
    if {fangs}:
        for x in (PADX+10,PADX+13):c.putpixel((x,PADT+17),(250,246,230,255))
    return c
'''
    open(f'vilao{n}.py','w').write(s)
print('ok')

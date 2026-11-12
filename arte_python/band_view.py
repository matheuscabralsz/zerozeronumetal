import sys;sys.path.insert(0,'.')
from PIL import Image
import importlib
mods=sys.argv[1].split(',');out=sys.argv[2]
ims=[]
for m in mods:
    M=importlib.import_module(m);ims.append(M.sprite(0))
W=sum(i.width for i in ims)+12*len(ims)+12;H=max(i.height for i in ims)+12
bg=Image.new('RGBA',(W,H),(0,0,0,0));P=bg.load()
for y in range(H):
    for x in range(W):P[x,y]=(int(48+y/H*40),int(36+y/H*14),int(86+y/H*20),255)
x=12
for i in ims:bg.alpha_composite(i,(x,H-6-i.height));x+=i.width+12
bg.resize((W*6,H*6),Image.NEAREST).save(out)

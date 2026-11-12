import sys,json,base64,io;sys.path.insert(0,'.')
import rubao_skins,rubao3,frames,masks
for k in ('rub_red','rub_leather','rub_33'):frames.CFG[k]=(k,17,-8,64,None,None)
from PIL import Image
frames.CFG['bode']=('rubao_bode',11,-8,64,None,None)
frames.CFG['r33']=('rubao33',17,-8,64,None,None)
KEYS=['vocal','guitar','guitar2','baixo','batera','dj','angelo','feijao','bebado','vilao1','vilao2','vilao3','vilao4','vilao5']
out={}
def _png(im):
    bb=io.BytesIO();im.save(bb,'PNG');return 'data:image/png;base64,'+base64.b64encode(bb.getvalue()).decode()
for k in KEYS:
    fr=frames.build(k);names=list(fr.keys());ims=list(fr.values())
    fw,fh=ims[0].size
    idle=ims[0];px=idle.load()
    xs=[x for y in range(fh-5,fh) for x in range(fw) if px[x,y][3]]
    ax=(min(xs)+max(xs))//2;ay=fh-1
    at=Image.new('RGBA',(fw*len(ims),fh),(0,0,0,0))
    for i,im in enumerate(ims):at.alpha_composite(im,(i*fw,0))
    at.save(f'atlas_{k}.png')
    b=io.BytesIO();at.save(b,'PNG',optimize=True)
    out[k]={'src':'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode(),'fw':fw,'fh':fh,'ax':ax,'ay':ay,'names':names,'hc':frames.HEADC,'fist':frames.FISTS,'hpos':frames.HPOS,'mhead':_png(masks.masked2(frames.HEADIMG,k)[0]),'moff':masks.masked2(frames.HEADIMG,k)[1],'bfist':frames.BFISTS}
    print(k,fw,fh,ax,len(b.getvalue()))
open('pixspr.js','w').write('const PIXDATA='+json.dumps(out,separators=(',',':'))+';\n')

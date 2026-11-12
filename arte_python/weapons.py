"""Armas individuais (pixel art), apontando para a direita, empunhadura em (gx,gy)."""
import sys,json,base64,io;sys.path.insert(0,'.')
from PIL import Image, ImageDraw, ImageOps
import instruments
OUT=(16,10,20,255)
def outline(im):return instruments._outline(im)
def from_inst(inst,grip_from_left):
    im=ImageOps.mirror(inst);ax,ay=inst.anchor
    return im,(grip_from_left,ay)
def mic():
    im=Image.new('RGBA',(16,7),(0,0,0,0));d=ImageDraw.Draw(im)
    d.rectangle([1,2,9,4],fill=(30,30,36,255));d.line([1,2,9,2],fill=(70,70,84,255))
    d.rectangle([9,1,10,5],fill=(150,150,160,255))
    d.ellipse([10,0,15,6],fill=(176,176,188,255));d.point((12,1),fill=(240,240,248,255));d.point((13,2),fill=(240,240,248,255))
    for x,y in((11,3),(13,4),(12,5)):d.point((x,y),fill=(110,110,122,255))
    return outline(im),(3,3)
def sticks():
    # uma baqueta grande (vai uma em cada mão)
    im=Image.new('RGBA',(32,5),(0,0,0,0));d=ImageDraw.Draw(im)
    d.line([1,2,28,2],fill=(206,168,108,255),width=3);d.line([1,1,28,1],fill=(240,216,164,255))
    d.line([1,3,28,3],fill=(160,120,70,255))
    d.ellipse([27,0,31,4],fill=(244,232,206,255));d.point((29,1),fill=(255,255,255,255))
    return outline(im),(6,2)
def vinyl():
    im=Image.new('RGBA',(17,17),(0,0,0,0));d=ImageDraw.Draw(im)
    d.ellipse([1,1,15,15],fill=(22,22,26,255))
    d.arc([3,3,13,13],200,300,fill=(70,70,84,255));d.arc([2,2,14,14],20,90,fill=(60,60,72,255))
    d.ellipse([6,6,10,10],fill=(214,40,48,255));d.point((8,8),fill=(10,10,12,255))
    return outline(im),(2,8)
def bat():
    im=Image.new('RGBA',(30,8),(0,0,0,0));d=ImageDraw.Draw(im)
    d.polygon([(1,3),(10,3),(28,1),(29,4),(28,6),(10,5),(1,5)],fill=(214,172,112,255))
    d.line([10,3,27,1],fill=(240,206,150,255));d.line([12,5,27,6],fill=(160,120,72,255))
    d.rectangle([1,3,6,5],fill=(30,30,34,255));d.point((2,3),fill=(80,80,90,255))
    return outline(im),(4,4)
def glove():
    im=Image.new('RGBA',(13,12),(0,0,0,0));d=ImageDraw.Draw(im)
    d.rectangle([0,3,3,9],fill=(240,240,244,255));d.line([0,3,0,9],fill=(196,196,206,255))
    d.ellipse([2,0,12,11],fill=(212,30,36,255))
    d.ellipse([4,6,9,11],fill=(176,20,28,255))
    d.ellipse([5,1,10,5],fill=(240,70,70,255));d.point((7,2),fill=(255,190,190,255));d.point((8,2),fill=(255,190,190,255))
    d.line([5,6,9,6],fill=(140,14,20,255))
    return outline(im),(6,6)
def skate():
    im=Image.new('RGBA',(30,9),(0,0,0,0));d=ImageDraw.Draw(im)
    d.rounded_rectangle([0,1,29,5],radius=2,fill=(40,150,70,255));d.line([2,1,27,1],fill=(90,200,110,255));d.line([2,5,27,5],fill=(24,90,44,255))
    for x in (6,23):d.rectangle([x-2,6,x+2,6],fill=(170,170,180,255));d.ellipse([x-3,6,x-1,8],fill=(240,236,220,255));d.ellipse([x+1,6,x+3,8],fill=(240,236,220,255))
    return outline(im),(3,3)
def chain():
    im=Image.new('RGBA',(28,7),(0,0,0,0));d=ImageDraw.Draw(im)
    d.rectangle([0,2,4,4],fill=(30,30,34,255))
    for i,x in enumerate(range(4,26,3)):
        y=2+(1 if i%2 else 0)
        d.ellipse([x,y-1,x+3,y+2],outline=(206,206,216,255))
        d.point((x+1,y-1),fill=(255,255,255,255))
    d.ellipse([24,1,27,5],fill=(150,150,160,255))
    return outline(im),(2,3)
def all_():
    W={}
    g,gp=from_inst(instruments.guitar((24,24,28),guard=(236,232,220),pick=(214,214,222),angle=0),11);W['guitar']=(g,gp)
    g,gp=from_inst(instruments.guitar((196,36,40),guard=(26,24,28),pick=(238,226,190),angle=0),11);W['guitar2']=(g,gp)
    g,gp=from_inst(instruments.bass(angle=0),12);W['bass']=(g,gp)
    W['mic']=mic();W['sticks']=sticks();W['vinyl']=vinyl();W['bat']=bat();W['glove']=glove();W['skate']=skate();W['chain']=chain()
    return W
if __name__=='__main__':
    W=all_();out={}
    for k,(im,gp) in W.items():
        b=io.BytesIO();im.save(b,'PNG');out[k]={'src':'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode(),'gx':gp[0],'gy':gp[1],'w':im.width,'h':im.height}
    open('weapons.js','w').write('const SIGDATA='+json.dumps(out,separators=(',',':'))+';\n')
    sheet=Image.new('RGBA',(sum(i.width+6 for i,_ in W.values()),max(i.height for i,_ in W.values())+4),(60,44,96,255));x=2
    for im,gp in W.values():
        sheet.alpha_composite(im,(x,2));sheet.putpixel((x+gp[0],2+gp[1]),(0,255,0,255));x+=im.width+6
    sheet.resize((sheet.width*6,sheet.height*6),0).save('weapons.png')

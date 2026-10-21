# GenoGame · prévia em GIF do ciclo de caminhada (mesmos quadros-chave do genogame.css).
# Uso: python3 scripts/genogame/previa_andar.py genogame/img andar.gif
import sys, math
from PIL import Image
pasta, saida = sys.argv[1], sys.argv[2]
ORD=['cauda','corpo','perna-e','perna-d','braco','cabeca']
L={n:Image.open(pasta+'/gn2-'+n+'.webp').convert('RGBA') for n in ORD}
PIV={'cabeca':(360,236),'cauda':(526,556),'braco':(266,300),'perna-e':(305,590),'perna-d':(468,600)}
def ease(t): return t*t*(3-2*t)
def kf(keys, p):
    # keys: lista (pos, valores...) ; interpolação suave entre quadros-chave
    for (a,va),(b,vb) in zip(keys,keys[1:]):
        if a<=p<=b:
            k=ease((p-a)/(b-a) if b>a else 0); return [x+(y-x)*k for x,y in zip(va,vb)]
    return keys[-1][1]
# (dx, dy, rot) em px da imagem original; rot em graus (positivo = horário, como no CSS)
PASSO=[(0,(0,0,0)),(.22,(4,-22,-7)),(.42,(2,0,-2)),(.5,(0,0,0)),(1,(0,0,0))]
CAUDA=[(0,(0,0,-5)),(.5,(0,0,5)),(1,(0,0,-5))]
CAB=[(0,(0,0,-1.4)),(.25,(0,6,-3.2)),(.5,(0,0,-1.4)),(.75,(0,6,.4)),(1,(0,0,-1.4))]
BRACO=[(0,(0,0,-5)),(.5,(0,0,6)),(1,(0,0,-5))]
GINGA=[(0,(0,0,1.8,1.025,.965)),(.22,(0,-5/0.264,3.4,.99,1.025)),(.5,(0,0,1.8,1.025,.965)),(.72,(0,-5/0.264,.2,.99,1.025)),(1,(0,0,1.8,1.025,.965))]
T=0.5; N=14; frames=[]
W,H=530,637
for f in range(N*2):
    t=(f%N)/N*T
    par={'perna-e':kf(PASSO,(t/T)%1),'perna-d':kf(PASSO,((t+.25)/T)%1),'cauda':kf(CAUDA,((t+.08)/T)%1),'cabeca':kf(CAB,((t+.06)/T)%1),'braco':kf(BRACO,(t/T)%1)}
    can=Image.new('RGBA',(W,H+40),(0,0,0,0))
    for n in ORD:
        img=L[n]
        if n in par:
            dx,dy,rot=par[n]; cx,cy=PIV[n]
            img=img.rotate(-rot, resample=Image.BICUBIC, center=(cx-115,cy-27), translate=(dx,dy))
        can.alpha_composite(img,(0,40))
    gx,gy,gr,sx,sy=kf(GINGA,(t/T)%1)
    cw,ch=can.size; nw,nh=int(cw*sx),int(ch*sy)
    esc=can.resize((nw,nh),Image.BICUBIC); can2=Image.new('RGBA',(cw,ch),(0,0,0,0)); can2.alpha_composite(esc,((cw-nw)//2,ch-nh))
    corpo=can2.rotate(-gr, resample=Image.BICUBIC, center=(W/2,H+40), translate=(gx,gy))
    bg=Image.new('RGBA',corpo.size,(244,242,251,255)); bg.alpha_composite(corpo)
    frames.append(bg.convert('RGB').resize((W//2,(H+40)//2), Image.LANCZOS))
frames[0].save(saida, save_all=True, append_images=frames[1:], duration=int(T*1000/N), loop=0)
print('ok', len(frames))

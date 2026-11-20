import asyncio, sys, os, base64
from playwright.async_api import async_playwright
W,H,FPS,SEC,OUT=int(sys.argv[1]),int(sys.argv[2]),int(sys.argv[3]),int(sys.argv[4]),sys.argv[5]
os.makedirs(OUT,exist_ok=True)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':W,'height':H})
        await pg.goto(f'http://127.0.0.1:8765/scene.html?w={W}&h={H}')
        await pg.evaluate('window.ready')
        n=FPS*SEC
        for i in range(n):
            data=await pg.evaluate(f"(()=>{{frame({i/FPS}); return document.getElementById('c').toDataURL('image/png')}})()")
            open(f'{OUT}/f{i:04d}.png','wb').write(base64.b64decode(data.split(',')[1]))
        await b.close()
asyncio.run(main())

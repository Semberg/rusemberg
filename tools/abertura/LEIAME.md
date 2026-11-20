# Vídeo da abertura

Fonte do vídeo `assets/video/abertura-*.mp4`. A cena é desenhada em `scene.html`
(documentos, caneta e a assinatura dourada da marca), com movimento periódico de 10 s
para repetir sem emenda. Não faz parte do site publicado.

Para gerar de novo:

    cd tools/abertura && python3 -m http.server 8765 &
    python3 render.py 1280 720 24 10 L     # computador
    python3 render.py 720 1280 24 10 P     # celular
    ffmpeg -framerate 24 -i L/f%04d.png -an -c:v libx264 -preset slow -crf 27 \
      -pix_fmt yuv420p -movflags +faststart ../../assets/video/abertura-desktop.mp4

Para trocar por um vídeo próprio ou licenciado, basta substituir os arquivos
`abertura-desktop.mp4/.jpg` e `abertura-mobile.mp4/.jpg` mantendo os nomes.

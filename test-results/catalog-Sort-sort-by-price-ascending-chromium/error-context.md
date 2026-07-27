# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: catalog.spec.ts >> Sort >> sort by price ascending
- Location: e2e/catalog.spec.ts:24:3

# Error details

```
Error: expect(locator).toHaveClass(expected) failed

Locator: locator('[data-sort="price-asc"]')
Expected pattern: /active/
Error: strict mode violation: locator('[data-sort="price-asc"]') resolved to 2 elements:
    1) <button data-sort="price-asc" data-astro-cid-lcdefpme="" class="filter-option active">Menor precio</button> aka getByRole('button', { name: 'Menor precio' })
    2) <button class="filter-option" data-sort="price-asc" data-astro-cid-lcdefpme="">Menor precio</button> aka locator('#mobile-filters-panel').getByText('Menor precio')

Call log:
  - Expect "toHaveClass" with timeout 5000ms
  - waiting for locator('[data-sort="price-asc"]')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e7]:
      - generic [ref=e8]:
        - link "Sublime — Inicio" [ref=e9] [cursor=pointer]:
          - /url: /
        - navigation [ref=e32]:
          - link "Ir al inicio" [ref=e33] [cursor=pointer]:
            - /url: /home
      - generic [ref=e37]:
        - searchbox "Buscar productos..." [ref=e38]
        - button "Buscar" [ref=e39] [cursor=pointer]
      - generic [ref=e43]:
        - link "Lista de deseos" [ref=e44] [cursor=pointer]:
          - /url: /deseos
        - link "Carrito de compras" [ref=e47] [cursor=pointer]:
          - /url: /cart
        - link "Mi cuenta" [ref=e51] [cursor=pointer]:
          - /url: /login
    - generic:
      - generic:
        - searchbox "Buscar productos..."
        - button "Buscar"
        - button "Cerrar búsqueda"
  - main [ref=e56]:
    - generic [ref=e59]:
      - heading "🔥 Envío gratis en compras desde Gs. 500.000 • Nuevos diseños todas las semanas • Personalizá todo al 100%" [level=3] [ref=e63]
      - link [ref=e64] [cursor=pointer]:
        - /url: /home
    - generic [ref=e66]:
      - complementary [ref=e67]:
        - textbox "Buscar productos..." [ref=e70]
        - generic [ref=e71]:
          - heading "Categorías" [level=2] [ref=e72]
          - list [ref=e74]:
            - listitem [ref=e75]: Todos
            - listitem [ref=e76]:
              - generic [ref=e77] [cursor=pointer]:
                - button "Expandir" [ref=e78]
                - generic [ref=e81]: Accesorios y Uso Personal
              - list:
                - listitem [ref=e82]:
                  - generic [ref=e83] [cursor=pointer]:
                    - button "Expandir" [ref=e84]
                    - generic [ref=e87]: Llaveros
                  - list:
                    - listitem [ref=e88]:
                      - generic [ref=e89] [cursor=pointer]: Acrílico
                    - listitem [ref=e91]:
                      - generic [ref=e92] [cursor=pointer]: Metálico
                    - listitem [ref=e94]:
                      - generic [ref=e95] [cursor=pointer]: Códigos de Spotify
                - listitem [ref=e97]:
                  - generic [ref=e98] [cursor=pointer]:
                    - button "Expandir" [ref=e99]
                    - generic [ref=e102]: Termos y Hoppies
                  - list:
                    - listitem [ref=e103]:
                      - generic [ref=e104] [cursor=pointer]: Deportivos
                    - listitem [ref=e106]:
                      - generic [ref=e107] [cursor=pointer]: Tereré y Mate
                    - listitem [ref=e109]:
                      - generic [ref=e110] [cursor=pointer]: Infantiles
            - listitem [ref=e112]:
              - generic [ref=e113] [cursor=pointer]:
                - button "Expandir" [ref=e114]
                - generic [ref=e117]: Hogar y Oficina
              - list:
                - listitem [ref=e118]:
                  - generic [ref=e119] [cursor=pointer]:
                    - button "Expandir" [ref=e120]
                    - generic [ref=e123]: Tazas
                  - list:
                    - listitem [ref=e124]:
                      - generic [ref=e125] [cursor=pointer]: Tazas Mágicas
                    - listitem [ref=e127]:
                      - generic [ref=e128] [cursor=pointer]: Cerámica Clásica
            - listitem [ref=e130]:
              - generic [ref=e131] [cursor=pointer]:
                - button "Expandir" [ref=e132]
                - generic [ref=e135]: Papelería y Eventos
              - list:
                - listitem [ref=e136]:
                  - generic [ref=e137] [cursor=pointer]:
                    - button "Expandir" [ref=e138]
                    - generic [ref=e141]: Golosinas Personalizadas
                  - list:
                    - listitem [ref=e142]:
                      - generic [ref=e143] [cursor=pointer]: Cumpleaños Infantiles
                    - listitem [ref=e145]:
                      - generic [ref=e146] [cursor=pointer]: Baby Shower / Revelación de género
                - listitem [ref=e148]:
                  - generic [ref=e149] [cursor=pointer]:
                    - button "Expandir" [ref=e150]
                    - generic [ref=e153]: Tarjetas e Invitaciones
                  - list:
                    - listitem [ref=e154]:
                      - generic [ref=e155] [cursor=pointer]: 15 Años y Bodas
                    - listitem [ref=e157]:
                      - generic [ref=e158] [cursor=pointer]: Bautismos
                - listitem [ref=e160]:
                  - generic [ref=e161] [cursor=pointer]:
                    - button "Expandir" [ref=e162]
                    - generic [ref=e165]: Cartelería y Adornos
                  - list:
                    - listitem [ref=e166]:
                      - generic [ref=e167] [cursor=pointer]: Banderines
                    - listitem [ref=e169]:
                      - generic [ref=e170] [cursor=pointer]: Cajas Sorpresa
            - listitem [ref=e172]:
              - generic [ref=e173] [cursor=pointer]:
                - button "Expandir" [ref=e174]
                - generic [ref=e177]: Indumentaria
              - list:
                - listitem [ref=e178]:
                  - generic [ref=e179] [cursor=pointer]:
                    - button "Expandir" [ref=e180]
                    - generic [ref=e183]: Remeras
                  - list:
                    - listitem [ref=e184]:
                      - generic [ref=e185] [cursor=pointer]: Algodón Pima
                    - listitem [ref=e187]:
                      - generic [ref=e188] [cursor=pointer]: Oversize
                    - listitem [ref=e190]:
                      - generic [ref=e191] [cursor=pointer]: Manga Larga
                    - listitem [ref=e193]:
                      - generic [ref=e194] [cursor=pointer]: Estampadas
                    - listitem [ref=e196]:
                      - generic [ref=e197] [cursor=pointer]: Deportivas
                - listitem [ref=e199]:
                  - generic [ref=e200] [cursor=pointer]:
                    - button "Expandir" [ref=e201]
                    - generic [ref=e204]: Camisas
                  - list:
                    - listitem [ref=e205]:
                      - generic [ref=e206] [cursor=pointer]: Sport
                    - listitem [ref=e208]:
                      - generic [ref=e209] [cursor=pointer]: Social
                    - listitem [ref=e211]:
                      - generic [ref=e212] [cursor=pointer]: Manga Corta
                - listitem [ref=e214]:
                  - generic [ref=e215] [cursor=pointer]:
                    - button "Expandir" [ref=e216]
                    - generic [ref=e219]: Buzos
                  - list:
                    - listitem [ref=e220]:
                      - generic [ref=e221] [cursor=pointer]: Canguros
                    - listitem [ref=e223]:
                      - generic [ref=e224] [cursor=pointer]: Con Capucha
                    - listitem [ref=e226]:
                      - generic [ref=e227] [cursor=pointer]: Sweaters
                    - listitem [ref=e229]:
                      - generic [ref=e230] [cursor=pointer]: Polares
                - listitem [ref=e232]:
                  - generic [ref=e233] [cursor=pointer]:
                    - button "Expandir" [ref=e234]
                    - generic [ref=e237]: Gorras
                  - list:
                    - listitem [ref=e238]:
                      - generic [ref=e239] [cursor=pointer]: Visera Plana
                    - listitem [ref=e241]:
                      - generic [ref=e242] [cursor=pointer]: Curva
                    - listitem [ref=e244]:
                      - generic [ref=e245] [cursor=pointer]: Trucker
                    - listitem [ref=e247]:
                      - generic [ref=e248] [cursor=pointer]: Winter
            - listitem [ref=e250]:
              - generic [ref=e251] [cursor=pointer]:
                - button "Expandir" [ref=e252]
                - generic [ref=e255]: Accesorios
              - list:
                - listitem [ref=e256]:
                  - generic [ref=e257] [cursor=pointer]:
                    - button "Expandir" [ref=e258]
                    - generic [ref=e261]: Bolsos
                  - list:
                    - listitem [ref=e262]:
                      - generic [ref=e263] [cursor=pointer]: Tote Bag
                    - listitem [ref=e265]:
                      - generic [ref=e266] [cursor=pointer]: Mochilas
                    - listitem [ref=e268]:
                      - generic [ref=e269] [cursor=pointer]: Riñoneras
                    - listitem [ref=e271]:
                      - generic [ref=e272] [cursor=pointer]: Neceseres
            - listitem [ref=e274]:
              - generic [ref=e275] [cursor=pointer]:
                - button "Expandir" [ref=e276]
                - generic [ref=e279]: Papelería
              - list:
                - listitem [ref=e280]:
                  - generic [ref=e281] [cursor=pointer]:
                    - button "Expandir" [ref=e282]
                    - generic [ref=e285]: Libretas
                  - list:
                    - listitem [ref=e286]:
                      - generic [ref=e287] [cursor=pointer]: Cuaderno A5
                    - listitem [ref=e289]:
                      - generic [ref=e290] [cursor=pointer]: Cuaderno A4
                    - listitem [ref=e292]:
                      - generic [ref=e293] [cursor=pointer]: Agendas
                    - listitem [ref=e295]:
                      - generic [ref=e296] [cursor=pointer]: Bloc de Notas
                - listitem [ref=e298]:
                  - generic [ref=e299] [cursor=pointer]:
                    - button "Expandir" [ref=e300]
                    - generic [ref=e303]: Stickers
                  - list:
                    - listitem [ref=e304]:
                      - generic [ref=e305] [cursor=pointer]: Vinilo
                    - listitem [ref=e307]:
                      - generic [ref=e308] [cursor=pointer]: Holográfico
                    - listitem [ref=e310]:
                      - generic [ref=e311] [cursor=pointer]: Transparente
                    - listitem [ref=e313]:
                      - generic [ref=e314] [cursor=pointer]: Pack Variado
                - listitem [ref=e316]:
                  - generic [ref=e317] [cursor=pointer]:
                    - button "Expandir" [ref=e318]
                    - generic [ref=e321]: Escritorio
                  - list:
                    - listitem [ref=e322]:
                      - generic [ref=e323] [cursor=pointer]: Lapiceros
                    - listitem [ref=e325]:
                      - generic [ref=e326] [cursor=pointer]: Porta lápices
                    - listitem [ref=e328]:
                      - generic [ref=e329] [cursor=pointer]: Mouse pads
                    - listitem [ref=e331]:
                      - generic [ref=e332] [cursor=pointer]: Calendarios
            - listitem [ref=e334]:
              - generic [ref=e335] [cursor=pointer]:
                - button "Expandir" [ref=e336]
                - generic [ref=e339]: Hogar
              - list:
                - listitem [ref=e340]:
                  - generic [ref=e341] [cursor=pointer]:
                    - button "Expandir" [ref=e342]
                    - generic [ref=e345]: Cocina
                  - list:
                    - listitem [ref=e346]:
                      - generic [ref=e347] [cursor=pointer]: Delantales
                    - listitem [ref=e349]:
                      - generic [ref=e350] [cursor=pointer]: Paños de cocina
                    - listitem [ref=e352]:
                      - generic [ref=e353] [cursor=pointer]: Individuales
                    - listitem [ref=e355]:
                      - generic [ref=e356] [cursor=pointer]: Posavasos
                - listitem [ref=e358]:
                  - generic [ref=e359] [cursor=pointer]:
                    - button "Expandir" [ref=e360]
                    - generic [ref=e363]: Decoración
                  - list:
                    - listitem [ref=e364]:
                      - generic [ref=e365] [cursor=pointer]: Almohadones
                    - listitem [ref=e367]:
                      - generic [ref=e368] [cursor=pointer]: Cuadros
                    - listitem [ref=e370]:
                      - generic [ref=e371] [cursor=pointer]: Láminas
                    - listitem [ref=e373]:
                      - generic [ref=e374] [cursor=pointer]: Velas aromáticas
            - listitem [ref=e376]:
              - generic [ref=e377] [cursor=pointer]:
                - button "Expandir" [ref=e378]
                - generic [ref=e381]: Tecnología
              - list:
                - listitem [ref=e382]:
                  - generic [ref=e383] [cursor=pointer]:
                    - button "Expandir" [ref=e384]
                    - generic [ref=e387]: Fundas
                  - list:
                    - listitem [ref=e388]:
                      - generic [ref=e389] [cursor=pointer]: iPhone
                    - listitem [ref=e391]:
                      - generic [ref=e392] [cursor=pointer]: Samsung
                    - listitem [ref=e394]:
                      - generic [ref=e395] [cursor=pointer]: Tablet
                    - listitem [ref=e397]:
                      - generic [ref=e398] [cursor=pointer]: Notebook
                - listitem [ref=e400]:
                  - generic [ref=e401] [cursor=pointer]:
                    - button "Expandir" [ref=e402]
                    - generic [ref=e405]: Accesorios Tech
                  - list:
                    - listitem [ref=e406]:
                      - generic [ref=e407] [cursor=pointer]: Cargadores
                    - listitem [ref=e409]:
                      - generic [ref=e410] [cursor=pointer]: Cables
                    - listitem [ref=e412]:
                      - generic [ref=e413] [cursor=pointer]: Soportes
                    - listitem [ref=e415]:
                      - generic [ref=e416] [cursor=pointer]: Limpieza
            - listitem [ref=e418]:
              - generic [ref=e419] [cursor=pointer]:
                - button "Expandir" [ref=e420]
                - generic [ref=e423]: Deportes
              - list:
                - listitem [ref=e424]:
                  - generic [ref=e425] [cursor=pointer]:
                    - button "Expandir" [ref=e426]
                    - generic [ref=e429]: Camisetas
                  - list:
                    - listitem [ref=e430]:
                      - generic [ref=e431] [cursor=pointer]: Fútbol
                    - listitem [ref=e433]:
                      - generic [ref=e434] [cursor=pointer]: Running
                    - listitem [ref=e436]:
                      - generic [ref=e437] [cursor=pointer]: Ciclismo
                    - listitem [ref=e439]:
                      - generic [ref=e440] [cursor=pointer]: Gimnasio
                - listitem [ref=e442]:
                  - generic [ref=e443] [cursor=pointer]:
                    - button "Expandir" [ref=e444]
                    - generic [ref=e447]: Accesorios Dep.
                  - list:
                    - listitem [ref=e448]:
                      - generic [ref=e449] [cursor=pointer]: Toallas
                    - listitem [ref=e451]:
                      - generic [ref=e452] [cursor=pointer]: Botellas
                    - listitem [ref=e454]:
                      - generic [ref=e455] [cursor=pointer]: Bolsa Deportiva
                    - listitem [ref=e457]:
                      - generic [ref=e458] [cursor=pointer]: Muñequeras
        - generic [ref=e460]:
          - heading "Filtros" [level=2] [ref=e461]
          - generic [ref=e462]:
            - heading "Ordenar por" [level=3] [ref=e463]
            - generic [ref=e464]:
              - button "Destacados" [ref=e465] [cursor=pointer]
              - button "Menor precio" [active] [ref=e466] [cursor=pointer]
              - button "Mayor precio" [ref=e467] [cursor=pointer]
              - button "Nombre A-Z" [ref=e468] [cursor=pointer]
          - generic [ref=e469]:
            - heading "Precio" [level=3] [ref=e470]
            - generic [ref=e471]:
              - spinbutton "Mín" [ref=e472]
              - generic [ref=e473]: —
              - spinbutton "Máx" [ref=e474]
          - button "Aplicar" [ref=e475] [cursor=pointer]
      - main [ref=e476]:
        - generic [ref=e477]:
          - generic [ref=e478]: 74 productos encontrados
          - button "Limpiar filtros" [ref=e479] [cursor=pointer]
          - generic [ref=e480]:
            - article [ref=e483]:
              - link "Llavero de Spotify Accesorios y Uso Personal Llavero de Spotify Gs. 15.000" [ref=e484] [cursor=pointer]:
                - /url: /producto/llavero-de-spotify
                - img "Llavero de Spotify" [ref=e486]
                - generic [ref=e487]:
                  - generic [ref=e488]: Accesorios y Uso Personal
                  - heading "Llavero de Spotify" [level=3] [ref=e489]
                  - paragraph [ref=e491]: Gs. 15.000
              - button "Agregar Llavero de Spotify al carrito" [ref=e492] [cursor=pointer]: Agregar al carrito
            - article [ref=e495]:
              - link "Gorra Curva Premium Indumentaria Gorra Curva Premium Gs. 60.000" [ref=e496] [cursor=pointer]:
                - /url: /producto/gorra-curva-premium
                - img "Gorra Curva Premium" [ref=e498]
                - generic [ref=e499]:
                  - generic [ref=e500]: Indumentaria
                  - heading "Gorra Curva Premium" [level=3] [ref=e501]
                  - paragraph [ref=e503]: Gs. 60.000
              - button "Agregar Gorra Curva Premium al carrito" [ref=e504] [cursor=pointer]: Agregar al carrito
            - article [ref=e507]:
              - link "Taza Mágica RGB Accesorios Taza Mágica RGB Gs. 50.000" [ref=e508] [cursor=pointer]:
                - /url: /producto/taza-magica-rgb
                - img "Taza Mágica RGB" [ref=e510]
                - generic [ref=e511]:
                  - generic [ref=e512]: Accesorios
                  - heading "Taza Mágica RGB" [level=3] [ref=e513]
                  - paragraph [ref=e515]: Gs. 50.000
              - button "Agregar Taza Mágica RGB al carrito" [ref=e516] [cursor=pointer]: Agregar al carrito
            - article [ref=e519]:
              - link "Llavero Acrílico Transparente Accesorios Llavero Acrílico Transparente Gs. 15.000" [ref=e520] [cursor=pointer]:
                - /url: /producto/llavero-acrilico-transparente
                - img "Llavero Acrílico Transparente" [ref=e522]
                - generic [ref=e523]:
                  - generic [ref=e524]: Accesorios
                  - heading "Llavero Acrílico Transparente" [level=3] [ref=e525]
                  - paragraph [ref=e527]: Gs. 15.000
              - button "Agregar Llavero Acrílico Transparente al carrito" [ref=e528] [cursor=pointer]: Agregar al carrito
            - article [ref=e531]:
              - link "Llavero Metal Dorado Accesorios Llavero Metal Dorado Gs. 20.000" [ref=e532] [cursor=pointer]:
                - /url: /producto/llavero-metal-dorado
                - img "Llavero Metal Dorado" [ref=e534]
                - generic [ref=e535]:
                  - generic [ref=e536]: Accesorios
                  - heading "Llavero Metal Dorado" [level=3] [ref=e537]
                  - paragraph [ref=e539]: Gs. 20.000
              - button "Agregar Llavero Metal Dorado al carrito" [ref=e540] [cursor=pointer]: Agregar al carrito
            - article [ref=e543]:
              - link "Llavero Cuero Negro Accesorios Llavero Cuero Negro Gs. 25.000" [ref=e544] [cursor=pointer]:
                - /url: /producto/llavero-cuero-negro
                - img "Llavero Cuero Negro" [ref=e546]
                - generic [ref=e547]:
                  - generic [ref=e548]: Accesorios
                  - heading "Llavero Cuero Negro" [level=3] [ref=e549]
                  - paragraph [ref=e551]: Gs. 25.000
              - button "Agregar Llavero Cuero Negro al carrito" [ref=e552] [cursor=pointer]: Agregar al carrito
            - article [ref=e555]:
              - link "Pack 3 Llaveros Accesorios Pack 3 Llaveros Gs. 45.000" [ref=e556] [cursor=pointer]:
                - /url: /producto/pack-3-llaveros
                - img "Pack 3 Llaveros" [ref=e558]
                - generic [ref=e559]:
                  - generic [ref=e560]: Accesorios
                  - heading "Pack 3 Llaveros" [level=3] [ref=e561]
                  - paragraph [ref=e563]: Gs. 45.000
              - button "Agregar Pack 3 Llaveros al carrito" [ref=e564] [cursor=pointer]: Agregar al carrito
            - article [ref=e567]:
              - link "Cuaderno A5 Punto Papelería Cuaderno A5 Punto Gs. 50.000" [ref=e568] [cursor=pointer]:
                - /url: /producto/cuaderno-a5-punto
                - img "Cuaderno A5 Punto" [ref=e570]
                - generic [ref=e571]:
                  - generic [ref=e572]: Papelería
                  - heading "Cuaderno A5 Punto" [level=3] [ref=e573]
                  - paragraph [ref=e575]: Gs. 50.000
              - button "Agregar Cuaderno A5 Punto al carrito" [ref=e576] [cursor=pointer]: Agregar al carrito
            - article [ref=e579]:
              - link "Cuaderno A4 Rayado Papelería Cuaderno A4 Rayado Gs. 55.000" [ref=e580] [cursor=pointer]:
                - /url: /producto/cuaderno-a4-rayado
                - img "Cuaderno A4 Rayado" [ref=e582]
                - generic [ref=e583]:
                  - generic [ref=e584]: Papelería
                  - heading "Cuaderno A4 Rayado" [level=3] [ref=e585]
                  - paragraph [ref=e587]: Gs. 55.000
              - button "Agregar Cuaderno A4 Rayado al carrito" [ref=e588] [cursor=pointer]: Agregar al carrito
            - article [ref=e591]:
              - link "Agenda 2026 Papelería Agenda 2026 Gs. 40.000" [ref=e592] [cursor=pointer]:
                - /url: /producto/agenda-2026
                - img "Agenda 2026" [ref=e594]
                - generic [ref=e595]:
                  - generic [ref=e596]: Papelería
                  - heading "Agenda 2026" [level=3] [ref=e597]
                  - paragraph [ref=e599]: Gs. 40.000
              - button "Agregar Agenda 2026 al carrito" [ref=e600] [cursor=pointer]: Agregar al carrito
            - article [ref=e603]:
              - link "Bloc de Notas Kraft Papelería Bloc de Notas Kraft Gs. 10.000" [ref=e604] [cursor=pointer]:
                - /url: /producto/bloc-de-notas-kraft
                - img "Bloc de Notas Kraft" [ref=e606]
                - generic [ref=e607]:
                  - generic [ref=e608]: Papelería
                  - heading "Bloc de Notas Kraft" [level=3] [ref=e609]
                  - paragraph [ref=e611]: Gs. 10.000
              - button "Agregar Bloc de Notas Kraft al carrito" [ref=e612] [cursor=pointer]: Agregar al carrito
            - article [ref=e615]:
              - link "Sticker Pack Holográfico Papelería Sticker Pack Holográfico Gs. 30.000" [ref=e616] [cursor=pointer]:
                - /url: /producto/sticker-pack-holografico
                - img "Sticker Pack Holográfico" [ref=e618]
                - generic [ref=e619]:
                  - generic [ref=e620]: Papelería
                  - heading "Sticker Pack Holográfico" [level=3] [ref=e621]
                  - paragraph [ref=e623]: Gs. 30.000
              - button "Agregar Sticker Pack Holográfico al carrito" [ref=e624] [cursor=pointer]: Agregar al carrito
            - article [ref=e627]:
              - link "Stickers Vinilo x10 Papelería Stickers Vinilo x10 Gs. 35.000" [ref=e628] [cursor=pointer]:
                - /url: /producto/stickers-vinilo-x10
                - img "Stickers Vinilo x10" [ref=e630]
                - generic [ref=e631]:
                  - generic [ref=e632]: Papelería
                  - heading "Stickers Vinilo x10" [level=3] [ref=e633]
                  - paragraph [ref=e635]: Gs. 35.000
              - button "Agregar Stickers Vinilo x10 al carrito" [ref=e636] [cursor=pointer]: Agregar al carrito
            - article [ref=e639]:
              - link "Stickers Transparentes x5 Papelería Stickers Transparentes x5 Gs. 35.000" [ref=e640] [cursor=pointer]:
                - /url: /producto/stickers-transparentes-x5
                - img "Stickers Transparentes x5" [ref=e642]
                - generic [ref=e643]:
                  - generic [ref=e644]: Papelería
                  - heading "Stickers Transparentes x5" [level=3] [ref=e645]
                  - paragraph [ref=e647]: Gs. 35.000
              - button "Agregar Stickers Transparentes x5 al carrito" [ref=e648] [cursor=pointer]: Agregar al carrito
            - article [ref=e651]:
              - link "Pack Stickers Variado Papelería Pack Stickers Variado Gs. 30.000" [ref=e652] [cursor=pointer]:
                - /url: /producto/pack-stickers-variado
                - img "Pack Stickers Variado" [ref=e654]
                - generic [ref=e655]:
                  - generic [ref=e656]: Papelería
                  - heading "Pack Stickers Variado" [level=3] [ref=e657]
                  - paragraph [ref=e659]: Gs. 30.000
              - button "Agregar Pack Stickers Variado al carrito" [ref=e660] [cursor=pointer]: Agregar al carrito
            - article [ref=e663]:
              - link "Lapicero Personalizado Papelería Lapicero Personalizado Gs. 55.000" [ref=e664] [cursor=pointer]:
                - /url: /producto/lapicero-personalizado
                - img "Lapicero Personalizado" [ref=e666]
                - generic [ref=e667]:
                  - generic [ref=e668]: Papelería
                  - heading "Lapicero Personalizado" [level=3] [ref=e669]
                  - paragraph [ref=e671]: Gs. 55.000
              - button "Agregar Lapicero Personalizado al carrito" [ref=e672] [cursor=pointer]: Agregar al carrito
            - article [ref=e675]:
              - link "Porta lápices Acrílico Papelería Porta lápices Acrílico Gs. 55.000" [ref=e676] [cursor=pointer]:
                - /url: /producto/porta-lapices-acrilico
                - img "Porta lápices Acrílico" [ref=e678]
                - generic [ref=e679]:
                  - generic [ref=e680]: Papelería
                  - heading "Porta lápices Acrílico" [level=3] [ref=e681]
                  - paragraph [ref=e683]: Gs. 55.000
              - button "Agregar Porta lápices Acrílico al carrito" [ref=e684] [cursor=pointer]: Agregar al carrito
            - article [ref=e687]:
              - link "Mouse Pad XXL Papelería Mouse Pad XXL Gs. 50.000" [ref=e688] [cursor=pointer]:
                - /url: /producto/mouse-pad-xxl
                - img "Mouse Pad XXL" [ref=e690]
                - generic [ref=e691]:
                  - generic [ref=e692]: Papelería
                  - heading "Mouse Pad XXL" [level=3] [ref=e693]
                  - paragraph [ref=e695]: Gs. 50.000
              - button "Agregar Mouse Pad XXL al carrito" [ref=e696] [cursor=pointer]: Agregar al carrito
            - article [ref=e699]:
              - link "Calendario Mesa 2026 Papelería Calendario Mesa 2026 Gs. 35.000" [ref=e700] [cursor=pointer]:
                - /url: /producto/calendario-mesa-2026
                - img "Calendario Mesa 2026" [ref=e702]
                - generic [ref=e703]:
                  - generic [ref=e704]: Papelería
                  - heading "Calendario Mesa 2026" [level=3] [ref=e705]
                  - paragraph [ref=e707]: Gs. 35.000
              - button "Agregar Calendario Mesa 2026 al carrito" [ref=e708] [cursor=pointer]: Agregar al carrito
            - article [ref=e711]:
              - link "Delantal Premium Personalizado Hogar Delantal Premium Personalizado Gs. 50.000" [ref=e712] [cursor=pointer]:
                - /url: /producto/delantal-premium-personalizado
                - img "Delantal Premium Personalizado" [ref=e714]
                - generic [ref=e715]:
                  - generic [ref=e716]: Hogar
                  - heading "Delantal Premium Personalizado" [level=3] [ref=e717]
                  - paragraph [ref=e719]: Gs. 50.000
              - button "Agregar Delantal Premium Personalizado al carrito" [ref=e720] [cursor=pointer]: Agregar al carrito
            - article [ref=e723]:
              - link "Funda iPhone 15 Pro Tecnología Funda iPhone 15 Pro Gs. 55.000" [ref=e724] [cursor=pointer]:
                - /url: /producto/funda-iphone-15-pro
                - img "Funda iPhone 15 Pro" [ref=e726]
                - generic [ref=e727]:
                  - generic [ref=e728]: Tecnología
                  - heading "Funda iPhone 15 Pro" [level=3] [ref=e729]
                  - paragraph [ref=e731]: Gs. 55.000
              - button "Agregar Funda iPhone 15 Pro al carrito" [ref=e732] [cursor=pointer]: Agregar al carrito
            - article [ref=e735]:
              - link "Funda Notebook 15 Pulgadas Tecnología Funda Notebook 15 Pulgadas Gs. 35.000" [ref=e736] [cursor=pointer]:
                - /url: /producto/funda-notebook-15-pulgadas
                - img "Funda Notebook 15 Pulgadas" [ref=e738]
                - generic [ref=e739]:
                  - generic [ref=e740]: Tecnología
                  - heading "Funda Notebook 15 Pulgadas" [level=3] [ref=e741]
                  - paragraph [ref=e743]: Gs. 35.000
              - button "Agregar Funda Notebook 15 Pulgadas al carrito" [ref=e744] [cursor=pointer]: Agregar al carrito
            - article [ref=e747]:
              - link "Soporte Ajustable Tecnología Soporte Ajustable Gs. 50.000" [ref=e748] [cursor=pointer]:
                - /url: /producto/soporte-ajustable
                - img "Soporte Ajustable" [ref=e750]
                - generic [ref=e751]:
                  - generic [ref=e752]: Tecnología
                  - heading "Soporte Ajustable" [level=3] [ref=e753]
                  - paragraph [ref=e755]: Gs. 50.000
              - button "Agregar Soporte Ajustable al carrito" [ref=e756] [cursor=pointer]: Agregar al carrito
            - article [ref=e759]:
              - link "Kit Limpieza Pantalla Tecnología Kit Limpieza Pantalla Gs. 35.000" [ref=e760] [cursor=pointer]:
                - /url: /producto/kit-limpieza-pantalla
                - img "Kit Limpieza Pantalla" [ref=e762]
                - generic [ref=e763]:
                  - generic [ref=e764]: Tecnología
                  - heading "Kit Limpieza Pantalla" [level=3] [ref=e765]
                  - paragraph [ref=e767]: Gs. 35.000
              - button "Agregar Kit Limpieza Pantalla al carrito" [ref=e768] [cursor=pointer]: Agregar al carrito
          - generic [ref=e769]:
            - button "Cargar más" [ref=e770] [cursor=pointer]
            - generic [ref=e771]: Página 1 de 4
    - generic [ref=e774]:
      - heading "🔥 Envío gratis + 30% OFF en seleccionados • 2x1 en llaveros • Consultá por promos" [level=3] [ref=e778]
      - link [ref=e779] [cursor=pointer]:
        - /url: /home
  - contentinfo [ref=e780]:
    - generic [ref=e785]:
      - paragraph [ref=e809]: Arte & Diseño
      - generic [ref=e810]:
        - generic [ref=e811]:
          - heading "Navegación" [level=4] [ref=e812]
          - link "Home" [ref=e813] [cursor=pointer]:
            - /url: /
          - link "Shop" [ref=e814] [cursor=pointer]:
            - /url: /
          - link "Cart" [ref=e815] [cursor=pointer]:
            - /url: /cart
        - generic [ref=e816]:
          - heading "Contacto" [level=4] [ref=e817]
          - link "WhatsApp" [ref=e818] [cursor=pointer]:
            - /url: https://wa.me/595991969608
      - generic [ref=e819]: © 2026 Sublime. Todos los derechos reservados.
  - generic [ref=e822]:
    - button [ref=e823]
    - button [ref=e829]
    - button [ref=e833]
    - button [ref=e841]
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | test.describe("Catalog Browse", () => {
  4   |   test("home page loads successfully", async ({ page }) => {
  5   |     await page.goto("/");
  6   |     await expect(page).toHaveTitle(/Sublime/i);
  7   |   });
  8   | 
  9   |   test("product items are visible on home page", async ({ page }) => {
  10  |     await page.goto("/");
  11  |     await expect(page.locator("product-card").first()).toBeVisible();
  12  |   });
  13  | 
  14  |   test("product count shows correct text", async ({ page }) => {
  15  |     await page.goto("/");
  16  |     const countEl = page.locator("#product-count-text");
  17  |     await expect(countEl).toBeVisible();
  18  |     const text = await countEl.textContent();
  19  |     expect(text).toMatch(/\d+ productos? encontrados?/);
  20  |   });
  21  | });
  22  | 
  23  | test.describe("Sort", () => {
  24  |   test("sort by price ascending", async ({ page }) => {
  25  |     await page.goto("/");
  26  |     await page.click('[data-sort="price-asc"]');
  27  |     // Verify button is active
> 28  |     await expect(page.locator('[data-sort="price-asc"]')).toHaveClass(/active/);
      |                                                           ^ Error: expect(locator).toHaveClass(expected) failed
  29  |     // Wait for re-render
  30  |     await page.waitForTimeout(200);
  31  |   });
  32  | 
  33  |   test("sort by price descending", async ({ page }) => {
  34  |     await page.goto("/");
  35  |     await page.click('[data-sort="price-desc"]');
  36  |     await expect(page.locator('[data-sort="price-desc"]')).toHaveClass(/active/);
  37  |   });
  38  | 
  39  |   test("sort by name", async ({ page }) => {
  40  |     await page.goto("/");
  41  |     await page.click('[data-sort="name"]');
  42  |     await expect(page.locator('[data-sort="name"]')).toHaveClass(/active/);
  43  |   });
  44  | 
  45  |   test("default sort returns to Destacados", async ({ page }) => {
  46  |     await page.goto("/");
  47  |     await page.click('[data-sort="price-asc"]');
  48  |     await page.click('[data-sort="default"]');
  49  |     await expect(page.locator('[data-sort="default"]')).toHaveClass(/active/);
  50  |   });
  51  | });
  52  | 
  53  | test.describe("Price Filter", () => {
  54  |   test("price range filter with apply button", async ({ page }) => {
  55  |     await page.goto("/");
  56  |     await page.fill("#price-min-desktop", "50000");
  57  |     await page.fill("#price-max-desktop", "150000");
  58  |     await page.click("#apply-filters-desktop");
  59  |     // Verify clear filters button appears
  60  |     await expect(page.locator("#clear-filters")).toBeVisible();
  61  |   });
  62  | 
  63  |   test("clear filters resets price inputs", async ({ page }) => {
  64  |     await page.goto("/");
  65  |     await page.fill("#price-min-desktop", "50000");
  66  |     await page.click("#apply-filters-desktop");
  67  |     await page.click("#clear-filters");
  68  |     await expect(page.locator("#price-min-desktop")).toHaveValue("");
  69  |     await expect(page.locator("#price-max-desktop")).toHaveValue("");
  70  |   });
  71  | });
  72  | 
  73  | test.describe("Search", () => {
  74  |   test("search input exists and is functional", async ({ page }) => {
  75  |     await page.goto("/");
  76  |     const searchInput = page.locator("#catalog-search-input");
  77  |     await expect(searchInput).toBeVisible();
  78  |     await searchInput.fill("test");
  79  |     // Wait for debounce (300ms)
  80  |     await page.waitForTimeout(400);
  81  |     // Clear filters button should appear
  82  |     await expect(page.locator("#clear-filters")).toBeVisible();
  83  |   });
  84  | 
  85  |   test("search filters products", async ({ page }) => {
  86  |     await page.goto("/");
  87  |     const initialCount = await page.locator("#product-count-text").textContent();
  88  |     await page.locator("#catalog-search-input").fill("xyz_no_match");
  89  |     await page.waitForTimeout(400);
  90  |     // Should show empty state or reduced count
  91  |     const newCount = await page.locator("#product-count-text").textContent();
  92  |     expect(newCount).toContain("0");
  93  |   });
  94  | });
  95  | 
  96  | test.describe("Category Filter", () => {
  97  |   test("category tree labels are clickable", async ({ page }) => {
  98  |     await page.goto("/");
  99  |     const firstLabel = page.locator(".tree-label").first();
  100 |     await expect(firstLabel).toBeVisible();
  101 |     await firstLabel.click();
  102 |     // Category should become active
  103 |     await expect(firstLabel).toHaveClass(/active/);
  104 |   });
  105 | });
  106 | 
  107 | test.describe("Clear Filters", () => {
  108 |   test("clear button appears when filter is active", async ({ page }) => {
  109 |     await page.goto("/");
  110 |     // Initially hidden
  111 |     await expect(page.locator("#clear-filters")).toBeHidden();
  112 |     // Activate a sort
  113 |     await page.click('[data-sort="price-asc"]');
  114 |     // Should appear
  115 |     await expect(page.locator("#clear-filters")).toBeVisible();
  116 |   });
  117 | 
  118 |   test("clear button resets all filters", async ({ page }) => {
  119 |     await page.goto("/");
  120 |     // Set some filters
  121 |     await page.click('[data-sort="name"]');
  122 |     await page.fill("#price-min-desktop", "10000");
  123 |     await page.click("#apply-filters-desktop");
  124 |     await page.locator("#catalog-search-input").fill("test");
  125 |     await page.waitForTimeout(400);
  126 |     // Clear
  127 |     await page.click("#clear-filters");
  128 |     // Default sort should be active again
```
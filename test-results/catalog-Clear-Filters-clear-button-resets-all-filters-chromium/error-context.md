# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: catalog.spec.ts >> Clear Filters >> clear button resets all filters
- Location: e2e/catalog.spec.ts:118:3

# Error details

```
Error: expect(locator).toHaveClass(expected) failed

Locator: locator('[data-sort="default"]')
Expected pattern: /active/
Error: strict mode violation: locator('[data-sort="default"]') resolved to 2 elements:
    1) <button data-sort="default" data-astro-cid-lcdefpme="" class="filter-option active">Destacados</button> aka getByRole('button', { name: 'Destacados' })
    2) <button data-sort="default" class="filter-option" data-astro-cid-lcdefpme="">Destacados</button> aka locator('#mobile-filters-panel').getByText('Destacados')

Call log:
  - Expect "toHaveClass" with timeout 5000ms
  - waiting for locator('[data-sort="default"]')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
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
              - button "Menor precio" [ref=e466] [cursor=pointer]
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
          - generic [ref=e479]:
            - article [ref=e482]:
              - link "Llavero de Spotify Accesorios y Uso Personal Llavero de Spotify Gs. 15.000" [ref=e483] [cursor=pointer]:
                - /url: /producto/llavero-de-spotify
                - img "Llavero de Spotify" [ref=e485]
                - generic [ref=e486]:
                  - generic [ref=e487]: Accesorios y Uso Personal
                  - heading "Llavero de Spotify" [level=3] [ref=e488]
                  - paragraph [ref=e490]: Gs. 15.000
              - button "Agregar Llavero de Spotify al carrito" [ref=e491] [cursor=pointer]: Agregar al carrito
            - article [ref=e494]:
              - link "Remera Sublime Básica Algodón Indumentaria Remera Sublime Básica Algodón Gs. 95.000" [ref=e495] [cursor=pointer]:
                - /url: /producto/remera-sublime-basica-algodon
                - img "Remera Sublime Básica Algodón" [ref=e497]
                - generic [ref=e498]:
                  - generic [ref=e499]: Indumentaria
                  - heading "Remera Sublime Básica Algodón" [level=3] [ref=e500]
                  - paragraph [ref=e502]: Gs. 95.000
              - button "Agregar Remera Sublime Básica Algodón al carrito" [ref=e503] [cursor=pointer]: Agregar al carrito
            - article [ref=e506]:
              - link "Remera Oversize Negro Indumentaria Remera Oversize Negro Gs. 100.000" [ref=e507] [cursor=pointer]:
                - /url: /producto/remera-oversize-negro
                - img "Remera Oversize Negro" [ref=e509]
                - generic [ref=e510]:
                  - generic [ref=e511]: Indumentaria
                  - heading "Remera Oversize Negro" [level=3] [ref=e512]
                  - paragraph [ref=e514]: Gs. 100.000
              - button "Agregar Remera Oversize Negro al carrito" [ref=e515] [cursor=pointer]: Agregar al carrito
            - article [ref=e518]:
              - link "Remera Premium Estampada Indumentaria Remera Premium Estampada Gs. 135.000" [ref=e519] [cursor=pointer]:
                - /url: /producto/remera-premium-estampada
                - img "Remera Premium Estampada" [ref=e521]
                - generic [ref=e522]:
                  - generic [ref=e523]: Indumentaria
                  - heading "Remera Premium Estampada" [level=3] [ref=e524]
                  - paragraph [ref=e526]: Gs. 135.000
              - button "Agregar Remera Premium Estampada al carrito" [ref=e527] [cursor=pointer]: Agregar al carrito
            - article [ref=e530]:
              - link "Remera Manga Larga Básica Indumentaria Remera Manga Larga Básica Gs. 120.000" [ref=e531] [cursor=pointer]:
                - /url: /producto/remera-manga-larga-basica
                - img "Remera Manga Larga Básica" [ref=e533]
                - generic [ref=e534]:
                  - generic [ref=e535]: Indumentaria
                  - heading "Remera Manga Larga Básica" [level=3] [ref=e536]
                  - paragraph [ref=e538]: Gs. 120.000
              - button "Agregar Remera Manga Larga Básica al carrito" [ref=e539] [cursor=pointer]: Agregar al carrito
            - article [ref=e542]:
              - link "Remera Deportiva Transpirable Indumentaria Remera Deportiva Transpirable Gs. 95.000" [ref=e543] [cursor=pointer]:
                - /url: /producto/remera-deportiva-transpirable
                - img "Remera Deportiva Transpirable" [ref=e545]
                - generic [ref=e546]:
                  - generic [ref=e547]: Indumentaria
                  - heading "Remera Deportiva Transpirable" [level=3] [ref=e548]
                  - paragraph [ref=e550]: Gs. 95.000
              - button "Agregar Remera Deportiva Transpirable al carrito" [ref=e551] [cursor=pointer]: Agregar al carrito
            - article [ref=e554]:
              - link "Remera Vintage Logo Indumentaria Remera Vintage Logo Gs. 140.000" [ref=e555] [cursor=pointer]:
                - /url: /producto/remera-vintage-logo
                - img "Remera Vintage Logo" [ref=e557]
                - generic [ref=e558]:
                  - generic [ref=e559]: Indumentaria
                  - heading "Remera Vintage Logo" [level=3] [ref=e560]
                  - paragraph [ref=e562]: Gs. 140.000
              - button "Agregar Remera Vintage Logo al carrito" [ref=e563] [cursor=pointer]: Agregar al carrito
            - article [ref=e566]:
              - link "Remera Cuello V Soft Indumentaria Remera Cuello V Soft Gs. 85.000" [ref=e567] [cursor=pointer]:
                - /url: /producto/remera-cuello-v-soft
                - img "Remera Cuello V Soft" [ref=e569]
                - generic [ref=e570]:
                  - generic [ref=e571]: Indumentaria
                  - heading "Remera Cuello V Soft" [level=3] [ref=e572]
                  - paragraph [ref=e574]: Gs. 85.000
              - button "Agregar Remera Cuello V Soft al carrito" [ref=e575] [cursor=pointer]: Agregar al carrito
            - article [ref=e578]:
              - link "Remera Estampada Flúor Indumentaria Remera Estampada Flúor Gs. 125.000" [ref=e579] [cursor=pointer]:
                - /url: /producto/remera-estampada-fluor
                - img "Remera Estampada Flúor" [ref=e581]
                - generic [ref=e582]:
                  - generic [ref=e583]: Indumentaria
                  - heading "Remera Estampada Flúor" [level=3] [ref=e584]
                  - paragraph [ref=e586]: Gs. 125.000
              - button "Agregar Remera Estampada Flúor al carrito" [ref=e587] [cursor=pointer]: Agregar al carrito
            - article [ref=e590]:
              - link "Camisa Sport Blanca Indumentaria Camisa Sport Blanca Gs. 235.000" [ref=e591] [cursor=pointer]:
                - /url: /producto/camisa-sport-blanca
                - img "Camisa Sport Blanca" [ref=e593]
                - generic [ref=e594]:
                  - generic [ref=e595]: Indumentaria
                  - heading "Camisa Sport Blanca" [level=3] [ref=e596]
                  - paragraph [ref=e598]: Gs. 235.000
              - button "Agregar Camisa Sport Blanca al carrito" [ref=e599] [cursor=pointer]: Agregar al carrito
            - article [ref=e602]:
              - link "Camisa Social Manga Larga Indumentaria Camisa Social Manga Larga Gs. 175.000" [ref=e603] [cursor=pointer]:
                - /url: /producto/camisa-social-manga-larga
                - img "Camisa Social Manga Larga" [ref=e605]
                - generic [ref=e606]:
                  - generic [ref=e607]: Indumentaria
                  - heading "Camisa Social Manga Larga" [level=3] [ref=e608]
                  - paragraph [ref=e610]: Gs. 175.000
              - button "Agregar Camisa Social Manga Larga al carrito" [ref=e611] [cursor=pointer]: Agregar al carrito
            - article [ref=e614]:
              - link "Camisa Manga Corta Rayada Indumentaria Camisa Manga Corta Rayada Gs. 155.000" [ref=e615] [cursor=pointer]:
                - /url: /producto/camisa-manga-corta-rayada
                - img "Camisa Manga Corta Rayada" [ref=e617]
                - generic [ref=e618]:
                  - generic [ref=e619]: Indumentaria
                  - heading "Camisa Manga Corta Rayada" [level=3] [ref=e620]
                  - paragraph [ref=e622]: Gs. 155.000
              - button "Agregar Camisa Manga Corta Rayada al carrito" [ref=e623] [cursor=pointer]: Agregar al carrito
            - article [ref=e626]:
              - link "Camisa Lino Beige Indumentaria Camisa Lino Beige Gs. 180.000" [ref=e627] [cursor=pointer]:
                - /url: /producto/camisa-lino-beige
                - img "Camisa Lino Beige" [ref=e629]
                - generic [ref=e630]:
                  - generic [ref=e631]: Indumentaria
                  - heading "Camisa Lino Beige" [level=3] [ref=e632]
                  - paragraph [ref=e634]: Gs. 180.000
              - button "Agregar Camisa Lino Beige al carrito" [ref=e635] [cursor=pointer]: Agregar al carrito
            - article [ref=e638]:
              - link "Camisa Oxford Azul Indumentaria Camisa Oxford Azul Gs. 170.000" [ref=e639] [cursor=pointer]:
                - /url: /producto/camisa-oxford-azul
                - img "Camisa Oxford Azul" [ref=e641]
                - generic [ref=e642]:
                  - generic [ref=e643]: Indumentaria
                  - heading "Camisa Oxford Azul" [level=3] [ref=e644]
                  - paragraph [ref=e646]: Gs. 170.000
              - button "Agregar Camisa Oxford Azul al carrito" [ref=e647] [cursor=pointer]: Agregar al carrito
            - article [ref=e650]:
              - link "Buzo Canguro Clásico Indumentaria Buzo Canguro Clásico Gs. 315.000" [ref=e651] [cursor=pointer]:
                - /url: /producto/buzo-canguro-clasico
                - img "Buzo Canguro Clásico" [ref=e653]
                - generic [ref=e654]:
                  - generic [ref=e655]: Indumentaria
                  - heading "Buzo Canguro Clásico" [level=3] [ref=e656]
                  - paragraph [ref=e658]: Gs. 315.000
              - button "Agregar Buzo Canguro Clásico al carrito" [ref=e659] [cursor=pointer]: Agregar al carrito
            - article [ref=e662]:
              - link "Buzo Capucha Oversize Indumentaria Buzo Capucha Oversize Gs. 260.000" [ref=e663] [cursor=pointer]:
                - /url: /producto/buzo-capucha-oversize
                - img "Buzo Capucha Oversize" [ref=e665]
                - generic [ref=e666]:
                  - generic [ref=e667]: Indumentaria
                  - heading "Buzo Capucha Oversize" [level=3] [ref=e668]
                  - paragraph [ref=e670]: Gs. 260.000
              - button "Agregar Buzo Capucha Oversize al carrito" [ref=e671] [cursor=pointer]: Agregar al carrito
            - article [ref=e674]:
              - link "Buzo Sweater Premium Indumentaria Buzo Sweater Premium Gs. 260.000" [ref=e675] [cursor=pointer]:
                - /url: /producto/buzo-sweater-premium
                - img "Buzo Sweater Premium" [ref=e677]
                - generic [ref=e678]:
                  - generic [ref=e679]: Indumentaria
                  - heading "Buzo Sweater Premium" [level=3] [ref=e680]
                  - paragraph [ref=e682]: Gs. 260.000
              - button "Agregar Buzo Sweater Premium al carrito" [ref=e683] [cursor=pointer]: Agregar al carrito
            - article [ref=e686]:
              - link "Buzo Polar Estampado Indumentaria Buzo Polar Estampado Gs. 280.000" [ref=e687] [cursor=pointer]:
                - /url: /producto/buzo-polar-estampado
                - img "Buzo Polar Estampado" [ref=e689]
                - generic [ref=e690]:
                  - generic [ref=e691]: Indumentaria
                  - heading "Buzo Polar Estampado" [level=3] [ref=e692]
                  - paragraph [ref=e694]: Gs. 280.000
              - button "Agregar Buzo Polar Estampado al carrito" [ref=e695] [cursor=pointer]: Agregar al carrito
            - article [ref=e698]:
              - link "Buzo Canguro Cyan Indumentaria Buzo Canguro Cyan Gs. 330.000" [ref=e699] [cursor=pointer]:
                - /url: /producto/buzo-canguro-cyan
                - img "Buzo Canguro Cyan" [ref=e701]
                - generic [ref=e702]:
                  - generic [ref=e703]: Indumentaria
                  - heading "Buzo Canguro Cyan" [level=3] [ref=e704]
                  - paragraph [ref=e706]: Gs. 330.000
              - button "Agregar Buzo Canguro Cyan al carrito" [ref=e707] [cursor=pointer]: Agregar al carrito
            - article [ref=e710]:
              - link "Gorra Visera Plana Classic Indumentaria Gorra Visera Plana Classic Gs. 85.000" [ref=e711] [cursor=pointer]:
                - /url: /producto/gorra-visera-plana-classic
                - img "Gorra Visera Plana Classic" [ref=e713]
                - generic [ref=e714]:
                  - generic [ref=e715]: Indumentaria
                  - heading "Gorra Visera Plana Classic" [level=3] [ref=e716]
                  - paragraph [ref=e718]: Gs. 85.000
              - button "Agregar Gorra Visera Plana Classic al carrito" [ref=e719] [cursor=pointer]: Agregar al carrito
            - article [ref=e722]:
              - link "Gorra Curva Premium Indumentaria Gorra Curva Premium Gs. 60.000" [ref=e723] [cursor=pointer]:
                - /url: /producto/gorra-curva-premium
                - img "Gorra Curva Premium" [ref=e725]
                - generic [ref=e726]:
                  - generic [ref=e727]: Indumentaria
                  - heading "Gorra Curva Premium" [level=3] [ref=e728]
                  - paragraph [ref=e730]: Gs. 60.000
              - button "Agregar Gorra Curva Premium al carrito" [ref=e731] [cursor=pointer]: Agregar al carrito
            - article [ref=e734]:
              - link "Gorra Trucker Mesh Indumentaria Gorra Trucker Mesh Gs. 65.000" [ref=e735] [cursor=pointer]:
                - /url: /producto/gorra-trucker-mesh
                - img "Gorra Trucker Mesh" [ref=e737]
                - generic [ref=e738]:
                  - generic [ref=e739]: Indumentaria
                  - heading "Gorra Trucker Mesh" [level=3] [ref=e740]
                  - paragraph [ref=e742]: Gs. 65.000
              - button "Agregar Gorra Trucker Mesh al carrito" [ref=e743] [cursor=pointer]: Agregar al carrito
            - article [ref=e746]:
              - link "Gorra Winter Abrigada Indumentaria Gorra Winter Abrigada Gs. 90.000" [ref=e747] [cursor=pointer]:
                - /url: /producto/gorra-winter-abrigada
                - img "Gorra Winter Abrigada" [ref=e749]
                - generic [ref=e750]:
                  - generic [ref=e751]: Indumentaria
                  - heading "Gorra Winter Abrigada" [level=3] [ref=e752]
                  - paragraph [ref=e754]: Gs. 90.000
              - button "Agregar Gorra Winter Abrigada al carrito" [ref=e755] [cursor=pointer]: Agregar al carrito
            - article [ref=e758]:
              - link "Gorra Logo Bordado Indumentaria Gorra Logo Bordado Gs. 80.000" [ref=e759] [cursor=pointer]:
                - /url: /producto/gorra-logo-bordado
                - img "Gorra Logo Bordado" [ref=e761]
                - generic [ref=e762]:
                  - generic [ref=e763]: Indumentaria
                  - heading "Gorra Logo Bordado" [level=3] [ref=e764]
                  - paragraph [ref=e766]: Gs. 80.000
              - button "Agregar Gorra Logo Bordado al carrito" [ref=e767] [cursor=pointer]: Agregar al carrito
          - generic [ref=e768]:
            - button "Cargar más" [ref=e769] [cursor=pointer]
            - generic [ref=e770]: Página 1 de 4
    - generic [ref=e773]:
      - heading "🔥 Envío gratis + 30% OFF en seleccionados • 2x1 en llaveros • Consultá por promos" [level=3] [ref=e777]
      - link [ref=e778] [cursor=pointer]:
        - /url: /home
  - contentinfo [ref=e779]:
    - generic [ref=e784]:
      - paragraph [ref=e808]: Arte & Diseño
      - generic [ref=e809]:
        - generic [ref=e810]:
          - heading "Navegación" [level=4] [ref=e811]
          - link "Home" [ref=e812] [cursor=pointer]:
            - /url: /
          - link "Shop" [ref=e813] [cursor=pointer]:
            - /url: /
          - link "Cart" [ref=e814] [cursor=pointer]:
            - /url: /cart
        - generic [ref=e815]:
          - heading "Contacto" [level=4] [ref=e816]
          - link "WhatsApp" [ref=e817] [cursor=pointer]:
            - /url: https://wa.me/595991969608
      - generic [ref=e818]: © 2026 Sublime. Todos los derechos reservados.
  - generic [ref=e821]:
    - button [ref=e822]
    - button [ref=e828]
    - button [ref=e832]
    - button [ref=e840]
```

# Test source

```ts
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
> 129 |     await expect(page.locator('[data-sort="default"]')).toHaveClass(/active/);
      |                                                         ^ Error: expect(locator).toHaveClass(expected) failed
  130 |     await expect(page.locator("#clear-filters")).toBeHidden();
  131 |     // Search should be cleared
  132 |     await expect(page.locator("#catalog-search-input")).toHaveValue("");
  133 |   });
  134 | });
  135 | 
  136 | test.describe("Empty State", () => {
  137 |   test("empty state shows when no products match", async ({ page }) => {
  138 |     await page.goto("/");
  139 |     await page.locator("#catalog-search-input").fill("zzz_impossible_match_xyz");
  140 |     await page.waitForTimeout(400);
  141 |     await expect(page.locator("#empty-state")).toBeVisible();
  142 |     await expect(page.locator("#empty-state")).toContainText("No se encontraron productos");
  143 |   });
  144 | 
  145 |   test("empty state clear button works", async ({ page }) => {
  146 |     await page.goto("/");
  147 |     await page.locator("#catalog-search-input").fill("zzz_impossible");
  148 |     await page.waitForTimeout(400);
  149 |     await page.click("#empty-clear-btn");
  150 |     // Should show products again
  151 |     await expect(page.locator("#product-count-text")).not.toContainText("0");
  152 |   });
  153 | });
  154 | 
  155 | test.describe("Pagination", () => {
  156 |   test("load more button appears when many products", async ({ page }) => {
  157 |     await page.goto("/");
  158 |     // The load more button may or may not be visible depending on product count
  159 |     // We just verify the element exists in the DOM
  160 |     const loadMore = page.locator("#load-more");
  161 |     await expect(loadMore).toBeAttached();
  162 |   });
  163 | });
  164 | 
  165 | test.describe("Product Card", () => {
  166 |   test("add to cart button works", async ({ page }) => {
  167 |     await page.goto("/");
  168 |     const firstCard = page.locator("product-card").first();
  169 |     await expect(firstCard).toBeVisible();
  170 |     
  171 |     // Access shadow DOM for the add button
  172 |     const addButton = firstCard.locator(".product-add-btn");
  173 |     await expect(addButton).toBeVisible();
  174 |     await addButton.click();
  175 |     
  176 |     // Button text should change to "¡Agregado!"
  177 |     await expect(addButton).toContainText("¡Agregado!");
  178 |     
  179 |     // Wait for it to revert
  180 |     await page.waitForTimeout(2000);
  181 |     await expect(addButton).toContainText("Agregar al carrito");
  182 |   });
  183 | });
  184 | 
  185 | test.describe("Mobile Panels", () => {
  186 |   test("mobile categories button opens panel from left", async ({ page }) => {
  187 |     await page.setViewportSize({ width: 375, height: 812 });
  188 |     await page.goto("/");
  189 |     await page.click("#open-categories");
  190 |     const panel = page.locator("#mobile-category-panel");
  191 |     await expect(panel).toHaveClass(/open/);
  192 |     await expect(panel).toBeVisible();
  193 |   });
  194 | 
  195 |   test("mobile filters button opens panel from right", async ({ page }) => {
  196 |     await page.setViewportSize({ width: 375, height: 812 });
  197 |     await page.goto("/");
  198 |     await page.click("#open-filters");
  199 |     const panel = page.locator("#mobile-filters-panel");
  200 |     await expect(panel).toHaveClass(/open/);
  201 |     await expect(panel).toBeVisible();
  202 |   });
  203 | });
  204 | 
  205 | test.describe("Mobile Catalog", () => {
  206 |   test.use({ viewport: { width: 375, height: 812 } });
  207 | 
  208 |   test("category drawer opens, selects category, and closes", async ({ page }) => {
  209 |     await page.goto("/");
  210 |     await page.click("#open-categories");
  211 |     const panel = page.locator("#mobile-category-panel");
  212 |     await expect(panel).toHaveClass(/open/);
  213 | 
  214 |     // Select a category
  215 |     const firstLabel = panel.locator(".tree-label").first();
  216 |     await firstLabel.click();
  217 |     await page.waitForTimeout(500);
  218 | 
  219 |     // Panel should close
  220 |     await expect(panel).not.toHaveClass(/open/);
  221 |   });
  222 | 
  223 |   test("category panel tree toggle expands subcategories", async ({ page }) => {
  224 |     await page.goto("/");
  225 |     await page.click("#open-categories");
  226 |     const panel = page.locator("#mobile-category-panel");
  227 |     await expect(panel).toHaveClass(/open/);
  228 | 
  229 |     // Find a tree toggle button (if any exist)
```
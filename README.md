# CINEIZE

Aplicación web de gestión de cine desarrollada como Trabajo Práctico de Programación IV. Permite consultar cartelera, elegir función y butacas, comprar entradas y productos del Candy Bar, administrar el cine y validar códigos QR.

## Funcionalidades

- Registro, inicio de sesión y perfiles con roles `cliente`, `empleado` y `admin`.
- Cartelera, detalle de películas, funciones, salas y selección visual de butacas.
- Compra conjunta de entradas, productos y combos configurables del Candy Bar.
- Crédito por cancelación y sistema de puntos/canjes.
- QR de entradas y QR único de retiro para productos y combos.
- Panel del personal para control de acceso, canjes y entregas Candy.
- ABM administrativo de películas, funciones, productos y combos.
- Administración visual de salas y tipos de butaca (normal, VIP y accesible).
- Compra como invitado, restricciones por edad y preventa configurable.
- Reseñas, ranking semanal/mensual, facturación diaria y exportación PDF/CSV.
- Registro de actividad administrativa y alertas de próximos estrenos.
- Interfaz responsive con identidad visual propia de CINEIZE.

## Tecnologías

- Angular 22 con componentes standalone y Reactive Forms.
- TypeScript, HTML y CSS.
- Supabase Auth, PostgreSQL, Storage, RLS y funciones RPC.
- ZXing para lectura de QR y `qrcode` para generarlos.

## Configuración local

1. Ejecutar `npm install`.
2. Crear `src/environments/environment.development.ts` a partir de `environment.example.ts` y completar la URL y la clave pública `anon` de Supabase. La clave de servicio nunca debe guardarse en el frontend.
3. Ejecutar las migraciones de `supabase/migrations` en orden desde el SQL Editor de Supabase.
4. Ejecutar `npm start` y abrir `http://localhost:4200`.

## Compilación

```bash
npm run build
```

La salida de producción se genera en `dist/cine/browser`.

## Despliegue

El repositorio incluye `vercel.json` para desplegar la SPA en Vercel. Después del despliegue se debe agregar la URL final en Supabase, dentro de **Authentication > URL Configuration > Redirect URLs**.

## Roles

Los roles se leen desde la tabla `perfiles`. Las pantallas administrativas requieren `admin`; los controles de acceso, canjes y Candy aceptan `admin` o `empleado`.

## Arquitectura y decisiones

- `core`: servicios, guards, modelos e integración única con Supabase.
- `features`: pantallas organizadas por caso de uso y cargadas de forma diferida desde el router.
- `shared`: componentes reutilizables, como encabezado y buscador.
- Los formularios usan Reactive Forms y `Validators`; no se usa `ngModel`.
- Las operaciones críticas (compra, crédito, descuentos, asignación de sala y validaciones) se ejecutan en funciones PostgreSQL para que no puedan alterarse desde el navegador.
- Las políticas RLS y RPC separan los permisos de cliente, empleado y administrador.
- Una compra agrupa entradas, Candy y combos. Los productos comparten un QR de retiro y cada entrada conserva su control de acceso.
- Las cancelaciones acreditan saldo a la cuenta y liberan las butacas cuando respetan el límite de dos horas.

## Flujo principal

1. El visitante busca una película y elige una función futura.
2. Selecciona butacas disponibles en tiempo real.
3. Agrega Candy o combos y confirma con una cuenta o como invitado.
4. La base valida disponibilidad, edad, descuentos, crédito y precios, y crea los QR.
5. El personal escanea o ingresa el código para validar la entrada o entregar el pedido.
6. El cliente registrado consulta compras, películas vistas, puntos, canjes y cancelaciones desde su perfil.

## PWA

CINEIZE incluye manifiesto, iconos instalables y service worker de Angular. Para verificar la instalación y el funcionamiento offline se debe usar una compilación de producción (`npm run build`) servida por HTTPS o desde `localhost`; `ng serve` no activa el service worker.

## Verificación

Antes de entregar:

```bash
npm run build
npm test -- --watch=false
```

Las migraciones nuevas deben aplicarse en orden en el proyecto de Supabase antes de probar funcionalidades agregadas posteriormente.

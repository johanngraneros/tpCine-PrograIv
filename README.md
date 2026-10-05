# CINEIZE

CINEIZE es una aplicación web para la gestión integral de un cine, desarrollada como Trabajo Práctico de Programación IV. Reúne en una misma plataforma la experiencia del cliente, las tareas operativas del personal y la administración del negocio.

Permite consultar la cartelera, seleccionar funciones y butacas, comprar entradas y productos del Candy Bar, generar códigos QR, administrar el contenido del cine y exportar reportes de facturación.

## Funcionalidades

### Visitantes y clientes

- Registro e inicio de sesión mediante Supabase Auth.
- Inicio con las tres películas más vendidas y próximos estrenos.
- Cartelera, detalle de películas, funciones, formatos, salas y precios.
- Selección visual de butacas normales, VIP y accesibles.
- Compra de entradas como usuario registrado o invitado.
- Incorporación opcional de productos y combos del Candy Bar.
- Aplicación de crédito disponible, descuentos y beneficios.
- QR individual para cada entrada y QR único para retirar Candy.
- Historial de compras, entradas y películas vistas.
- Descarga de entradas en PDF.
- Sistema de puntos, beneficios y canjes.
- Cancelación hasta dos horas antes de la función y devolución como crédito.
- Calificaciones y reseñas de películas vistas.

### Personal del cine

- Control de acceso mediante cámara o ingreso manual del código.
- Validación de entradas vigentes, utilizadas o canceladas.
- Control y confirmación de canjes.
- Búsqueda y entrega de pedidos del Candy Bar.
- Detección de pedidos entregados o de compras canceladas.

### Administración

- ABM de películas, funciones, productos y combos.
- Administración de salas y distribución de butacas.
- Consulta, búsqueda, filtrado y cancelación de compras.
- Consulta y administración de entradas.
- Configuración de descuentos.
- Ranking semanal y mensual de películas.
- Registro de actividad y alertas de próximos estrenos.
- Reporte de facturación diaria.
- Exportación del reporte a PDF y Excel.

## Tecnologías

- **Angular 22:** framework principal de la interfaz.
- **TypeScript, HTML y CSS:** lógica, estructura y diseño responsive.
- **Angular Router:** navegación, carga diferida y guards.
- **Reactive Forms:** formularios y validaciones.
- **Angular Signals y RxJS:** estado reactivo y flujos asíncronos.
- **Supabase Auth:** registro, autenticación y sesiones.
- **Supabase PostgreSQL:** persistencia y reglas del negocio.
- **Supabase Storage:** almacenamiento de imágenes.
- **RLS y funciones RPC:** permisos y operaciones transaccionales.
- **ZXing:** lectura de códigos QR con la cámara.
- **qrcode:** generación de códigos QR.
- **jsPDF:** generación de documentos PDF.
- **Angular Service Worker:** instalación y funcionamiento como PWA.
- **Vercel:** despliegue de la SPA.

## Arquitectura

El frontend está organizado por responsabilidad:

```text
src/app/
├── core/
│   ├── guards/       # Protección de rutas según sesión y rol
│   ├── models/       # Interfaces y contratos de datos
│   └── services/     # Acceso a Supabase y lógica compartida
├── features/         # Pantallas agrupadas por caso de uso
│   ├── admin/        # Funciones exclusivas del administrador
│   ├── auth/         # Registro e inicio de sesión
│   ├── compra/       # Confirmación de entradas y Candy
│   ├── control-*/    # Operaciones del personal
│   └── ...
├── shared/
│   ├── components/   # Componentes reutilizables
│   └── directives/   # Comportamientos reutilizables
├── app.config.ts
└── app.routes.ts
```

### Relación entre componentes, modelos y servicios

1. Un **componente** controla una pantalla, recibe eventos y mantiene su estado mediante `signal` y `computed`.
2. Las **interfaces o modelos** describen la forma de los datos intercambiados.
3. Un **servicio** concentra las consultas a Supabase y la lógica reutilizable.
4. Supabase aplica políticas de seguridad y ejecuta funciones de PostgreSQL.
5. El servicio devuelve el resultado y el componente actualiza la vista.

```text
Usuario → componente → servicio → Supabase
Usuario ← componente ← servicio ← Supabase
                    ↑
           interfaces/modelos
```

Los componentes son `standalone` y las pantallas se cargan con `loadComponent`. Esto reduce el código inicial descargado y mantiene cada funcionalidad aislada.

## Decisiones técnicas

### Estado reactivo con Signals

Se utiliza `signal` para valores que cambian y `computed` para información derivada. Angular actualiza únicamente las partes de la interfaz que dependen de ellos. Se aplican, por ejemplo, en la sesión, el carrito, los totales, los reportes y los estados de carga.

### Formularios reactivos

Los formularios usan `FormControl`, `FormGroup` y `Validators`. Así las reglas quedan centralizadas, los errores se muestran de forma consistente y la lógica no se mezcla con el HTML.

### Servicios por dominio

Los accesos se dividen por responsabilidad: autenticación, películas, funciones, butacas, compras, productos, combos, controles operativos y administración. Los componentes no repiten consultas y se concentran en la presentación.

### Seguridad por roles

| Rol | Permisos principales |
| --- | --- |
| `cliente` | Comprar, consultar operaciones, cancelar, puntuar y canjear beneficios |
| `empleado` | Controlar accesos, canjes y entregas del Candy Bar |
| `admin` | Acceder a las funciones del personal y al panel administrativo |

Las rutas utilizan:

- `authGuard`: exige una sesión activa.
- `staffGuard`: admite empleados y administradores.
- `adminGuard`: admite únicamente administradores.

Los guards mejoran la navegación, pero la autorización real también se aplica en la base mediante RLS y funciones RPC. Ocultar una pantalla en Angular no reemplaza la seguridad del servidor.

### Operaciones críticas en PostgreSQL

La confirmación y cancelación de compras, la ocupación y liberación de butacas, el crédito, los descuentos y otras validaciones se resuelven en la base. Esto evita estados parciales y manipulaciones de importes desde el navegador.

Una compra agrupa entradas y productos. Cada entrada conserva su código de acceso y los artículos del Candy Bar comparten un código único de retiro. Una compra cancelada invalida sus entradas y su pedido; una compra con entradas utilizadas no se puede cancelar.

### Exportación de reportes

El reporte de facturación toma compras confirmadas y agrupa importes y entradas vendidas por día.

- **PDF:** se genera en el navegador con `jsPDF`.
- **Excel:** se genera como una planilla XML compatible con Excel y se descarga con extensión `.xls`.

Los archivos se crean localmente en el navegador; no se envían a un servidor externo.

### PWA y despliegue

La aplicación incluye manifiesto, iconos y service worker. El service worker se activa en compilaciones de producción servidas mediante HTTPS o `localhost`; no se activa durante `ng serve`.

`vercel.json` define la compilación, la carpeta de salida y la reescritura necesaria para que las rutas de Angular funcionen al recargar.

## Configuración local

### Requisitos

- Node.js compatible con Angular 22.
- npm.
- Un proyecto de Supabase con el esquema requerido.

### Instalación

```bash
git clone URL_DEL_REPOSITORIO
cd cine
npm install
```

Crear `src/environments/environment.development.ts` a partir de `src/environments/environment.example.ts`:

```ts
export const environment = {
  production: false,
  supabase: {
    url: 'TU_SUPABASE_URL',
    key: 'TU_SUPABASE_ANON_KEY'
  }
};
```

Ejecutar:

```bash
npm start
```

La aplicación queda disponible en `http://localhost:4200`.

## Variables de entorno y secretos

- `environment.example.ts` documenta la estructura esperada y puede versionarse.
- `environment.development.ts` contiene la configuración local y está ignorado.
- `.env.local` y los archivos `.env*` no deben subirse.
- El frontend utiliza únicamente la clave pública `anon` de Supabase.
- La clave `service_role`, contraseñas y tokens de Vercel nunca deben incluirse en el repositorio.

## Usuarios y roles

Los clientes se registran desde `/register`; el alta asigna el rol `cliente`. Los usuarios de personal se crean desde Supabase y su rol debe configurarse en `public.perfiles` y en los metadatos de autenticación.

Ejemplo para asignar el rol administrativo, reemplazando el correo:

```sql
update public.perfiles
set rol = 'admin'
where id = (
  select id from auth.users
  where email = 'CORREO_DEL_ADMIN'
);

update auth.users
set raw_user_meta_data =
  coalesce(raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object('rol', 'admin')
where email = 'CORREO_DEL_ADMIN';
```

No se incluyen credenciales de prueba en el repositorio.

## Compilación y pruebas

```bash
npm run build
npm test -- --watch=false
```

La compilación de producción se genera en `dist/cine/browser`.

## Despliegue en Vercel

1. Importar el repositorio en Vercel.
2. Usar `npm run build` como comando de construcción.
3. Usar `dist/cine/browser` como directorio de salida.
4. Configurar las variables necesarias sin subir secretos.
5. Agregar la URL desplegada en **Supabase → Authentication → URL Configuration → Redirect URLs**.

## Flujo principal de compra

1. El visitante selecciona una película y una función.
2. Elige una o más butacas disponibles.
3. Puede agregar productos o combos del Candy Bar.
4. Aplica crédito si dispone de saldo.
5. Confirma la operación.
6. PostgreSQL vuelve a validar disponibilidad, precios, descuentos y crédito.
7. Se crean la compra, las entradas y los códigos correspondientes.
8. El cliente consulta el resultado desde sus compras y entradas.
9. El personal valida los códigos en los controles operativos.

## Consideraciones de seguridad

- No se versionan contraseñas, tokens ni archivos locales de entorno.
- Las consultas del frontend usan la clave pública y respetan RLS.
- Los permisos no dependen solamente de lo visible en la interfaz.
- Las operaciones que modifican varios registros se ejecutan transaccionalmente.
- Los códigos utilizados, cancelados o entregados no pueden procesarse nuevamente.

## Autoría

Proyecto académico realizado para la materia Programación IV.

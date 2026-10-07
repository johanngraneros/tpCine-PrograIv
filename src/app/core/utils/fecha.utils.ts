/** Agrega las barras mientras el usuario escribe una fecha. */
export function enmascararFecha(valor: string): string {
  const numeros = valor.replace(/\D/g, '').slice(0, 8);
  const dia = numeros.slice(0, 2);
  const mes = numeros.slice(2, 4);
  const anio = numeros.slice(4, 8);

  if (numeros.length > 4) return `${dia}/${mes}/${anio}`;
  if (numeros.length > 2) return `${dia}/${mes}`;
  return dia;
}

/** Agrega barras y dos puntos mientras se escribe una fecha con horario. */
export function enmascararFechaHora(valor: string): string {
  const numeros = valor.replace(/\D/g, '').slice(0, 12);
  const fecha = enmascararFecha(numeros.slice(0, 8));
  const hora = numeros.slice(8, 10);
  const minutos = numeros.slice(10, 12);

  if (numeros.length > 10) return `${fecha} ${hora}:${minutos}`;
  if (numeros.length > 8) return `${fecha} ${hora}`;
  return fecha;
}

/** Convierte dd/mm/aaaa al formato aaaa-mm-dd utilizado por Supabase. */
export function convertirFechaAISO(valor: string, permitirVacia = false): string | null {
  const texto = valor.trim();
  if (!texto) return permitirVacia ? '' : null;

  const partes = texto.split('/');
  if (partes.length !== 3) return null;

  const [dia, mes, anio] = partes;
  if (dia.length !== 2 || mes.length !== 2 || anio.length !== 4) return null;

  const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia));
  const esValida = fecha.getFullYear() === Number(anio) &&
    fecha.getMonth() === Number(mes) - 1 &&
    fecha.getDate() === Number(dia);

  return esValida ? `${anio}-${mes}-${dia}` : null;
}

/** Convierte dd/mm/aaaa hh:mm a una fecha ISO completa. */
export function convertirFechaHoraAISO(valor: string | null): string | null {
  if (!valor) return null;

  const [fechaTexto, horaTexto] = valor.trim().split(' ');
  const fechaIso = convertirFechaAISO(fechaTexto ?? '');
  const partesHora = (horaTexto ?? '').split(':');
  if (!fechaIso || partesHora.length !== 2) return null;

  const [hora, minutos] = partesHora;
  if (hora.length !== 2 || minutos.length !== 2) return null;

  const [anio, mes, dia] = fechaIso.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia, Number(hora), Number(minutos));
  const esValida = fecha.getHours() === Number(hora) &&
    fecha.getMinutes() === Number(minutos);

  return esValida ? fecha.toISOString() : null;
}

/** Convierte una fecha ISO al formato que ve el usuario. */
export function fechaParaMostrar(valor: string | null): string {
  if (!valor) return '';
  const [anio, mes, dia] = valor.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

/** Convierte una fecha ISO a dd/mm/aaaa hh:mm. */
export function fechaHoraParaMostrar(valor: string): string {
  const fecha = new Date(valor);
  const dosDigitos = (numero: number) => numero.toString().padStart(2, '0');
  return `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)}/${fecha.getFullYear()} ${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
}

/** Calcula la edad cumplida a partir de una fecha aaaa-mm-dd. */
export function calcularEdad(fechaNacimiento: string | null | undefined, hoy = new Date()): number | null {
  if (!fechaNacimiento) return null;

  const [anio, mes, dia] = fechaNacimiento.slice(0, 10).split('-').map(Number);
  const nacimiento = new Date(anio, mes - 1, dia);
  const fechaValida = nacimiento.getFullYear() === anio &&
    nacimiento.getMonth() === mes - 1 &&
    nacimiento.getDate() === dia;

  if (!fechaValida) return null;

  let edad = hoy.getFullYear() - anio;
  const aunNoCumplio = hoy.getMonth() < mes - 1 ||
    (hoy.getMonth() === mes - 1 && hoy.getDate() < dia);

  if (aunNoCumplio) edad--;
  return edad;
}

interface DatosPreventa {
  precio_preventa?: number | string | null;
  fecha_fin_preventa?: string | null;
  fecha_hora?: string | null;
}

/**
 * Una preventa se habilita durante los siete días anteriores a la función
 * y termina en la fecha configurada por el administrador.
 */
export function esPreventaActiva(funcion: DatosPreventa | null | undefined, ahora = Date.now()): boolean {
  if (!funcion?.precio_preventa || !funcion.fecha_fin_preventa || !funcion.fecha_hora) return false;

  const fechaFuncion = new Date(funcion.fecha_hora).getTime();
  const finPreventa = new Date(funcion.fecha_fin_preventa).getTime();
  const inicioPreventa = fechaFuncion - 7 * 24 * 60 * 60 * 1000;

  if ([fechaFuncion, finPreventa].some(Number.isNaN)) return false;
  return ahora >= inicioPreventa && ahora <= finPreventa && ahora < fechaFuncion;
}

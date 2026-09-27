export type TipoButaca = 'normal' | 'accesible' | 'vip';

export interface Butaca{
  id: string;
  sala_id: string;
  fila: string;
  numero: number;
  tipo: TipoButaca;
}

export interface ButacaOcupada {
  butaca_id: string;
}

export interface FilaButacas {
  fila: string;
  butacas: Butaca[];
}
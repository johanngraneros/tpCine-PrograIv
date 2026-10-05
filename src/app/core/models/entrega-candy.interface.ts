export interface EntregaCandyItem {
  id: string;
  cantidad: number;
  estado: 'valida' | 'usada' | 'cancelada';
  productos?: { nombre: string };
  combos?: { nombre: string };
}

export interface EntregaCandy {
  id: string;
  fecha: string;
  qr_code: string;
  perfiles: { nombre: string; apellido: string } | null;
  compra_productos: EntregaCandyItem[];
  compra_combos: EntregaCandyItem[];
}

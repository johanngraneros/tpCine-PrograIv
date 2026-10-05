import {
  Injectable
} from '@angular/core';

import {
  DatosEntradaPdf
} from '../models/datos-entrada-pdf.interface';


import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';


@Injectable({
  providedIn: 'root'
})
export class EntradaDocumentoService {
  async generarQr(
    codigo: string
  ): Promise<string> {
    return QRCode.toDataURL(
      `CINEIZE:${codigo}`,
      {
        width: 400,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#111111',
          light: '#ffffff'
        }
      }
    );
  }

  async descargarPdf(
    entrada: DatosEntradaPdf
  ) {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    await this.dibujarEntrada(pdf, entrada);
    pdf.save(`entrada-${this.nombreSeguro(entrada.pelicula)}-${entrada.numeroButaca}.pdf`);
  }

  async descargarPdfMultiple(entradas: DatosEntradaPdf[]) {
    if (!entradas.length) return;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    for (let indice = 0; indice < entradas.length; indice++) {
      if (indice > 0) pdf.addPage();
      await this.dibujarEntrada(pdf, entradas[indice]);
    }

    pdf.save(`entradas-${this.nombreSeguro(entradas[0].pelicula)}.pdf`);
  }

  private async dibujarEntrada(pdf: jsPDF, entrada: DatosEntradaPdf) {
    const qrImagen = await this.generarQr(entrada.qrCode);

    pdf.setFillColor(18, 16, 13);
    pdf.rect(0, 0, 210, 297, 'F');

    pdf.setTextColor(255, 225, 0);
    pdf.setFontSize(25);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CINEIZE', 20, 25);

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.text('ENTRADA DIGITAL', 20, 34);

    pdf.setDrawColor(65, 61, 54);
    pdf.roundedRect(
      15,
      45,
      180,
      215,
      5,
      5,
      'S'
    );

    pdf.setFontSize(23);
    pdf.setFont('helvetica', 'bold');
    pdf.text(
      entrada.pelicula,
      25,
      65,
      {
        maxWidth: 160
      }
    );

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(190, 183, 174);

    pdf.text(
      `Fecha y horario: ${entrada.fechaHora}`,
      25,
      85
    );

    pdf.text(
      `Sala: ${entrada.sala}`,
      25,
      95
    );

    pdf.text(
      `Butaca: Fila ${entrada.fila} - ${entrada.numeroButaca}`,
      25,
      105
    );

    pdf.text(
      `Tipo: ${entrada.tipoButaca}`,
      25,
      115
    );

    pdf.text(
      `Cliente: ${entrada.cliente}`,
      25,
      125
    );

    pdf.addImage(
      qrImagen,
      'PNG',
      55,
      140,
      100,
      100
    );

    pdf.setTextColor(255, 225, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text(
      entrada.qrCode,
      105,
      247,
      {
        align: 'center',
        maxWidth: 155
      }
    );

    pdf.setTextColor(150, 143, 134);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text(
      `Compra: ${entrada.compraId}`,
      105,
      270,
      {
        align: 'center'
      }
    );

  }

  private nombreSeguro(pelicula: string) {
    return pelicula
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

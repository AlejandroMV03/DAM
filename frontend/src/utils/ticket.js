export const DAM_BUSINESS = {
  nombre: 'Estetica y Barberia DAM',
  telefono: '9811153639',
  direccion: 'Sichochac, calle Diaz Ordaz s/n',
  mensaje: 'Gracias por su preferencia',
};

export function formatearDinero(valor) {
  return `$${Number(valor || 0).toLocaleString('es-MX')}`;
}

export function obtenerFechaHora(valor) {
  const fecha = valor ? new Date(valor) : new Date();

  return {
    fecha: new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(fecha),
    hora: new Intl.DateTimeFormat('es-MX', { timeStyle: 'short' }).format(fecha),
    archivo: fecha.toISOString().slice(0, 10),
  };
}

export function nombreArchivoTicket(ticket) {
  const { archivo } = obtenerFechaHora(ticket?.fecha_hora);
  const folio = String(ticket?.id || 'nuevo').padStart(4, '0');
  return `Ticket-DAM-${folio}-${archivo}.pdf`;
}

export function mensajeWhatsAppTicket(ticket) {
  const folio = String(ticket?.id || '').padStart(4, '0');

  return [
    'Hola, gracias por visitar Estética y Barbería DAM.',
    'Te compartimos tu ticket de servicio.',
    `Folio: #${folio}`,
    `Total: ${formatearDinero(ticket?.total)}`,
    '¡Gracias por tu preferencia!',
  ].join('\n');
}

function textoTicket(ticket) {
  const folio = String(ticket?.id || '').padStart(4, '0');
  const { fecha, hora } = obtenerFechaHora(ticket?.fecha_hora);

  return {
    folio,
    fecha,
    hora,
    cajero: ticket?.usuario_nombre || 'DAM',
    cliente: ticket?.cliente_nombre || 'Cliente general',
    conceptos: ticket?.conceptos?.length
      ? ticket.conceptos
      : [
          {
            categoria_nombre: ticket?.categoria_servicio || 'Servicio',
            nombre: ticket?.servicio_nombre || 'Servicio DAM',
            precio: ticket?.precio_servicio || ticket?.total,
            cantidad: 1,
            subtotal: ticket?.total,
          },
        ],
    total: formatearDinero(ticket?.total),
  };
}

async function crearDocumentoTicketPDF(ticket) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 180] });
  const datos = textoTicket(ticket);
  let y = 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(DAM_BUSINESS.nombre, 40, y, { align: 'center' });

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Tel. ${DAM_BUSINESS.telefono}`, 40, y, { align: 'center' });
  y += 4;
  doc.text(DAM_BUSINESS.direccion, 40, y, { align: 'center' });

  y += 7;
  doc.line(8, y, 72, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(`Folio #${datos.folio}`, 8, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${datos.fecha}`, 8, y);
  y += 5;
  doc.text(`Hora: ${datos.hora}`, 8, y);
  y += 5;
  doc.text(`Atendio: ${datos.cajero}`, 8, y);
  y += 5;
  doc.text(`Cliente: ${datos.cliente}`, 8, y);

  y += 7;
  doc.line(8, y, 72, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Conceptos', 8, y);
  doc.text('Importe', 72, y, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  datos.conceptos.forEach((concepto, index) => {
    y += 6;
    const categoria = concepto.categoria_nombre || (concepto.tipo === 'producto' ? 'Producto' : 'Servicio');
    const nombre = `${index + 1}. ${categoria} - ${concepto.nombre}`;
    doc.text(nombre, 8, y, { maxWidth: 48 });
    doc.text(formatearDinero(concepto.subtotal), 72, y, { align: 'right' });
    if (Number(concepto.cantidad || 1) > 1) {
      y += 4;
      doc.setFontSize(7);
      doc.text(`${concepto.cantidad} x ${formatearDinero(concepto.precio)}`, 10, y);
      doc.setFontSize(8);
    }
  });

  y += 10;
  doc.line(8, y, 72, y);

  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL', 8, y);
  doc.text(datos.total, 72, y, { align: 'right' });

  y += 12;
  doc.setFontSize(9);
  doc.text(DAM_BUSINESS.mensaje, 40, y, { align: 'center' });

  return doc;
}

function descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export async function generarTicketPDFFile(ticket) {
  const doc = await crearDocumentoTicketPDF(ticket);
  const blob = doc.output('blob');
  const nombre = nombreArchivoTicket(ticket);
  return new File([blob], nombre, { type: 'application/pdf' });
}

export async function descargarTicketPDF(ticket) {
  const doc = await crearDocumentoTicketPDF(ticket);
  doc.save(nombreArchivoTicket(ticket));
}

export function abrirWhatsAppTicket(ticket) {
  const mensaje = mensajeWhatsAppTicket(ticket);

  const telefono = String(ticket?.cliente_telefono || '').replace(/\D/g, '');
  const destino = telefono.length === 10 ? `52${telefono}` : telefono;
  const ruta = destino ? `/${destino}` : '/';
  window.open(`https://wa.me${ruta}?text=${encodeURIComponent(mensaje)}`, '_blank', 'noopener,noreferrer');
}

export async function enviarTicketWhatsApp(ticket) {
  const archivo = await generarTicketPDFFile(ticket);
  const mensaje = mensajeWhatsAppTicket(ticket);
  const shareData = {
    title: nombreArchivoTicket(ticket),
    text: mensaje,
    files: [archivo],
  };

  if (window.isSecureContext && navigator.share && navigator.canShare?.({ files: [archivo] })) {
    await navigator.share(shareData);
    return {
      tipo: 'share',
      mensaje: 'Se abrio el panel de compartir. Elige WhatsApp y confirma el envio del PDF.',
    };
  }

  descargarBlob(archivo, archivo.name);
  abrirWhatsAppTicket(ticket);

  return {
    tipo: 'fallback',
    mensaje: 'Se descargo el PDF y se abrio WhatsApp. Adjunta el archivo descargado antes de enviar el mensaje.',
  };
}

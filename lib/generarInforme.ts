import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, ImageRun, HeadingLevel } from 'docx'
//import { createClient } from '@supabase/supabase-js' // <-- IMPORT DIRECTO
//import { createClient, SupabaseClient } from '@supabase/supabase-js' // <-- agrega SupabaseClient
//import { createClient } from '@/lib/client'
import { supabase } from './supabase'

export const generarInforme = async (visita: any, fotos: any[]) => {
  
  const tablaResultados = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({text: "Aspecto", heading: HeadingLevel.HEADING_3})] }),
          new TableCell({ children: [new Paragraph({text: "Porcentaje", heading: HeadingLevel.HEADING_3})] }),
          new TableCell({ children: [new Paragraph({text: "Valoración", heading: HeadingLevel.HEADING_3})] }),
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("Docente")] }),
          new TableCell({ children: [new Paragraph(`${visita.porcentaje_docente}%`)] }),
          new TableCell({ children: [new Paragraph(visita.valoracion_docente)] }),
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("Alumno")] }),
          new TableCell({ children: [new Paragraph(`${visita.porcentaje_alumno}%`)] }),
          new TableCell({ children: [new Paragraph(visita.valoracion_alumno)] }),
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("RESULTADO GENERAL")] }),
          new TableCell({ children: [new Paragraph("")] }),
          new TableCell({ children: [new Paragraph(visita.resultado_baremo_general)] }),
        ]
      }),
    ]
  })

  // Cargar fotos
//   const imagenesDocx = await Promise.all(
//     fotos.map(async (f) => {
//       const res = await fetch(f.url)
//       const blob = await res.blob()
//       const buffer = await blob.arrayBuffer()
//       return new Paragraph({
//         children: [new ImageRun({ data: buffer, transformation: { width: 300, height: 200 } })]
//       })
//     })
//   )
// Cargar fotos
  const imagenesDocx = await Promise.all(
    fotos.map(async (f) => {
  // 1. Armar URL pública con el bucket correcto
  const { data }: any = (supabase as any).storage
    .from('evidenciasSigpacuc') // <-- TU BUCKET
    .getPublicUrl(f.rutaarchivo)

  if (!data?.publicUrl) {
    return new Paragraph(`[Foto no encontrada: ${f.nombrearchivo}]`)
  }

  try {
    const res = await fetch(data.publicUrl)
    const blob = await res.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const imageData = new Uint8Array(arrayBuffer) // <-- lo sacamos afuera
    
return new Paragraph({
  children: [
    new ImageRun({ 
      data: imageData,
      transform: {
        width: 400,
        height: 250
      }
    } as any) // <-- el truco del maestro
  ]
})

    
  } catch (e) {
    console.error('Error cargando foto:', data.publicUrl)
    return new Paragraph(`[Error cargando: ${f.nombrearchivo}]`)
  }
})
  )

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: "INFORME DE SUPERVISIÓN DOCENTE", heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
        new Paragraph(""),
        new Paragraph(`NRC: ${visita.nrc}`),
        new Paragraph(`Docente: ${visita.docente}`),
        new Paragraph(`Curso: ${visita.curso}`),
        new Paragraph(`Fecha de Supervisión: ${visita.fecha}`),
        new Paragraph(""),
        new Paragraph({ text: "RESULTADOS DEL BAREMO", heading: HeadingLevel.HEADING_2 }),
        tablaResultados,
        new Paragraph(""),
        new Paragraph({ text: "EVIDENCIAS FOTOGRÁFICAS", heading: HeadingLevel.HEADING_2 }),
       ...imagenesDocx
      ]
    }]
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Borrador_Informe_${visita.nrc}_${visita.fecha}.docx`
  link.click()
  URL.revokeObjectURL(url)
}
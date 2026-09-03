import moment from 'moment-timezone'

// Fijamos la zona horaria por defecto a Lima para TODO el proyecto
moment.tz.setDefault('America/Lima')

// Exportamos un moment ya configurado
export const momentPeru = moment

// Helpers para no escribir tanto
export const nowPeru = () => momentPeru().format('YYYY-MM-DD HH:mm:ss')
export const hoyPeru = () => momentPeru().format('YYYY-MM-DD')
export const fechaHoraPeru = (fecha: any) => momentPeru(fecha).format('DD/MM/YYYY HH:mm:ss')
export const soloFechaPeru = (fecha: any) => momentPeru(fecha).format('DD/MM/YYYY')
export const soloHoraPeru = (fecha: any) => momentPeru(fecha).format('HH:mm:ss')
export function generateReferralCode(
  email: string,
  whatsapp: string,
  hasReferral: boolean = false
) {
  const safeEmail = (email || '').replace(/[^a-zA-Z]/g, '').toUpperCase()
  const emailPart = safeEmail.slice(0, 2).padEnd(2, 'X')

  const digits = (whatsapp || '').replace(/\D/g, '')
  const phonePart = digits.slice(-3).padStart(3, '0')

  const suffix = hasReferral ? '1' : '0'

  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const yy = String(now.getFullYear()).slice(-2)
  const datePart = `${mm}${dd}${yy}`

  return `${emailPart}${phonePart}${suffix}${datePart}`
}

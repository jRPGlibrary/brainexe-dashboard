/* 2FA - Double vérification avec codes temps réel */
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const totp = {
  // Générer un secret et un QR code pour l'utilisateur
  async generateSecret(email) {
    const secret = speakeasy.generateSecret({
      name: `BrainEXE (${email})`,
      issuer: 'BrainEXE',
      length: 32
    });

    // Générer le QR code en data URL
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCode: qrCode,
      backupCodes: this.generateBackupCodes()
    };
  },

  // Vérifier le code TOTP fourni par l'utilisateur
  verifyToken(secret, token) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // tolérance de 2 fenêtres (±60 secondes)
    });
  },

  // Générer des codes de secours (backup codes)
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(
        Math.random().toString(36).substring(2, 8).toUpperCase() +
        '-' +
        Math.random().toString(36).substring(2, 8).toUpperCase()
      );
    }
    return codes;
  },

  // Vérifier un code de secours et le supprimer
  useBackupCode(backupCodes, code) {
    const idx = backupCodes.indexOf(code.toUpperCase());
    if (idx !== -1) {
      backupCodes.splice(idx, 1);
      return true;
    }
    return false;
  }
};

module.exports = totp;
